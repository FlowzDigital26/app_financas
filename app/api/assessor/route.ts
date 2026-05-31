import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Tx = {
  type: string
  amount: number
  description: string
  category: string
  date: string
}

function fmt(n: number) {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

    const { data: txData } = await supabase
      .from('transactions')
      .select('type, amount, description, category, date')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgo)
      .lte('date', today)
      .order('date', { ascending: false })
      .limit(250)

    const txs = (txData ?? []) as Tx[]

    const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    const byCat: Record<string, { income: number; expense: number }> = {}
    txs.forEach(t => {
      if (!byCat[t.category]) byCat[t.category] = { income: 0, expense: 0 }
      if (t.type === 'income') byCat[t.category].income += t.amount
      else byCat[t.category].expense += t.amount
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

    const systemPrompt = `Você é o **Assessor Flowz**, o assistente financeiro pessoal inteligente do aplicativo Flowz Finance. Seja empático, claro e prático. Responda sempre em português do Brasil.

**Dados financeiros do usuário — últimos 3 meses (${periodLabel}):**

Resumo:
- Receitas totais: ${fmt(totalIncome)}
- Despesas totais: ${fmt(totalExpense)}
- Saldo do período: ${fmt(totalIncome - totalExpense)}
- Total de lançamentos: ${txs.length}

Despesas por categoria:
${expenseCats || '  (nenhuma despesa no período)'}

Receitas por categoria:
${incomeCats || '  (nenhuma receita no período)'}

Últimos lançamentos:
${recentList || '  (nenhum lançamento)'}

**Diretrizes:**
- Use formatação markdown (negrito, listas) quando ajudar à leitura
- Valores monetários sempre no formato R$ X.XXX,XX
- Seja gentil ao apontar problemas; ofereça sugestões concretas e acionáveis
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
