import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Tx = {
  type: string
  amount: number
  description: string
  category: string
  date: string
}

type BudgetRow = {
  monthly_salary: number
  savings_goal: number
  investment_goal: number
  category_budgets: Record<string, number>
}

function fmt(n: number) {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function pctLabel(actual: number, budget: number) {
  if (budget <= 0) return ''
  const pct = (actual / budget) * 100
  const diff = actual - budget
  const sign = diff >= 0 ? '+' : ''
  return ` (${pct.toFixed(0)}% do limite, ${sign}${fmt(diff)})`
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY não configurada no servidor' },
        { status: 500 }
      )
    }

    const { messages } = await request.json()

    const now = new Date()
    const threeMonthsAgo = format(subMonths(now, 3), 'yyyy-MM-dd')
    const today = format(now, 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

    // Transactions (3 months) + budget config in parallel
    const [{ data: txData }, { data: budgetData }] = await Promise.all([
      supabase
        .from('transactions')
        .select('type, amount, description, category, date')
        .eq('user_id', user.id)
        .gte('date', threeMonthsAgo)
        .lte('date', today)
        .order('date', { ascending: false })
        .limit(250),
      supabase
        .from('user_budget_config')
        .select('monthly_salary, savings_goal, investment_goal, category_budgets')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

    const txs = (txData ?? []) as Tx[]
    const budget = budgetData as BudgetRow | null

    // 3-month totals
    const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    const byCat: Record<string, { income: number; expense: number }> = {}
    txs.forEach(t => {
      if (!byCat[t.category]) byCat[t.category] = { income: 0, expense: 0 }
      if (t.type === 'income') byCat[t.category].income += t.amount
      else byCat[t.category].expense += t.amount
    })

    // Current month actual per category (for budget comparison)
    const currentMonthTxs = txs.filter(t => t.date >= monthStart && t.date <= monthEnd)
    const catActual: Record<string, number> = {}
    currentMonthTxs.filter(t => t.type === 'expense').forEach(t => {
      catActual[t.category] = (catActual[t.category] ?? 0) + t.amount
    })

    const expenseCats = Object.entries(byCat)
      .filter(([, v]) => v.expense > 0)
      .sort(([, a], [, b]) => b.expense - a.expense)
      .map(([cat, v]) => `  - ${cat}: ${fmt(v.expense)}`)
      .join('\n')

    const incomeCats = Object.entries(byCat)
      .filter(([, v]) => v.income > 0)
      .sort(([, a], [, b]) => b.income - a.income)
      .map(([cat, v]) => `  - ${cat}: ${fmt(v.income)}`)
      .join('\n')

    const recentList = txs.slice(0, 20)
      .map(t => `  - [${t.date}] ${t.type === 'income' ? 'Receita' : 'Despesa'} · ${t.description} (${t.category}) · ${fmt(t.amount)}`)
      .join('\n')

    const periodLabel = `${format(subMonths(now, 3), "d 'de' MMM", { locale: ptBR })} a ${format(now, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`
    const currentMonthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR })

    // Budget section
    let budgetSection = 'Orçamento mensal: não configurado pelo usuário.'
    if (budget && (budget.monthly_salary > 0 || Object.keys(budget.category_budgets ?? {}).length > 0)) {
      const catBudgets = (budget.category_budgets as Record<string, number>) ?? {}
      const totalBudgeted = Object.values(catBudgets).reduce((s, v) => s + v, 0)
      const currentIncome = currentMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const currentExpense = currentMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

      const catLines = Object.entries(catBudgets)
        .filter(([, b]) => b > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, b]) => {
          const actual = catActual[cat] ?? 0
          return `  - ${cat}: planejado ${fmt(b)} | gasto no mês ${fmt(actual)}${pctLabel(actual, b)}`
        })
        .join('\n')

      budgetSection = `Orçamento mensal configurado (${currentMonthLabel}):
- Salário/renda esperada: ${fmt(budget.monthly_salary)}
- Receita real no mês: ${fmt(currentIncome)}${pctLabel(currentIncome, budget.monthly_salary)}
- Total orçado em despesas: ${fmt(totalBudgeted)}
- Despesa real no mês: ${fmt(currentExpense)}${totalBudgeted > 0 ? pctLabel(currentExpense, totalBudgeted) : ''}
- Meta de poupança: ${fmt(budget.savings_goal)}
- Meta de investimento: ${fmt(budget.investment_goal)}

Comparação orçamento × realizado por categoria (${currentMonthLabel}):
${catLines || '  (nenhuma categoria com limite definido)'}

Desvios relevantes (gasto > 80% do limite):
${Object.entries(catBudgets)
  .filter(([cat, b]) => b > 0 && (catActual[cat] ?? 0) / b >= 0.8)
  .map(([cat, b]) => {
    const actual = catActual[cat] ?? 0
    const pct = (actual / b) * 100
    return `  - ${cat}: ${pct.toFixed(0)}% usado — ${actual >= b ? 'ACIMA DO LIMITE' : 'próximo ao limite'}`
  })
  .join('\n') || '  (nenhum desvio relevante este mês)'}`
    }

    const systemPrompt = `Você é o **Assessor Flowz**, o assistente financeiro pessoal inteligente do aplicativo Flowz Finance. Seja empático, claro e prático. Responda sempre em português do Brasil.

**Dados financeiros do usuário — últimos 3 meses (${periodLabel}):**

Resumo geral:
- Receitas totais: ${fmt(totalIncome)}
- Despesas totais: ${fmt(totalExpense)}
- Saldo do período: ${fmt(totalIncome - totalExpense)}
- Total de lançamentos: ${txs.length}

Despesas por categoria (acumulado 3 meses):
${expenseCats || '  (nenhuma despesa no período)'}

Receitas por categoria (acumulado 3 meses):
${incomeCats || '  (nenhuma receita no período)'}

${budgetSection}

Últimos lançamentos:
${recentList || '  (nenhum lançamento)'}

**Diretrizes:**
- Use formatação markdown (negrito, listas) quando ajudar à leitura
- Valores monetários sempre no formato R$ X.XXX,XX
- Quando houver orçamento configurado, analise ativamente os desvios e dê sugestões concretas
- Exemplo de análise: "Você planejou R$400 em Alimentação mas gastou R$480 (+20%). Considere..."
- Seja gentil ao apontar problemas; ofereça sugestões acionáveis
- Se perguntado sobre algo fora das finanças do usuário, redirecione gentilmente`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = client.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
          })

          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error) {
    console.error('[assessor] erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
