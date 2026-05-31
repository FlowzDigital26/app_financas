import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const PROMPT = (bank: string) => `Este é um extrato bancário do ${bank} em português do Brasil.

Extraia TODAS as transações e retorne APENAS um array JSON válido, sem nenhum texto antes ou depois.

Cada transação deve ter exatamente estes campos:
- "date": string no formato "AAAA-MM-DD"
- "description": string com a descrição original da transação
- "amount": number positivo (sem símbolo R$, sem pontos de milhar, use ponto decimal)
- "type": "income" para créditos/entradas, "expense" para débitos/saídas
- "category": uma das categorias abaixo

Categorias disponíveis e exemplos:
- Alimentação: supermercado, mercado, padaria, iFood, Rappi, Ifood, restaurante, lanchonete, açougue, hortifruti
- Transporte: Uber, 99, combustível, posto, estacionamento, pedágio, metrô, ônibus, passagem, 99Pop
- Moradia: aluguel, condomínio, IPTU, reforma, mudança, mobília
- Saúde: farmácia, hospital, clínica, plano de saúde, dentista, academia, Drogasil, Ultrafarma
- Lazer: cinema, teatro, bar, show, viagem, hotel, streaming não listado, jogos
- Educação: escola, faculdade, curso, livro, material escolar, mensalidade educacional
- Compras: roupa, calçado, eletrônico, eletrodoméstico, loja, shopping, Amazon, Americanas, Magazine Luiza, Shopee
- Assinaturas: Netflix, Spotify, Amazon Prime, Disney+, internet, telefone, celular, TV a cabo, software
- Contas: energia elétrica, água, gás, CPFL, Sabesp, Comgás, conta de consumo
- Salário: salário, pagamento de salário, holerite, pro-labore, adiantamento salarial
- Freelance: freela, prestação de serviço, honorários, consultoria recebida
- Investimentos: dividendo, rendimento, CDB, Tesouro, ações, FII, resgate de investimento
- Outros: transferência pessoal, Pix pessoal, saque, tarifa bancária, IOF, tudo que não se encaixar acima

Regras de tipo (income vs expense):
- Crédito, depósito, Pix recebido, TED recebida, DOC recebido → "income"
- Débito, compra, pagamento, Pix enviado, TED enviada → "expense"
- Saque → "expense"
- Tarifa, IOF → "expense"

Formato exato de saída (retorne APENAS isso, sem markdown, sem explicação):
[{"date":"2024-01-15","description":"iFood *RESTAURANTE","amount":45.90,"type":"expense","category":"Alimentação"},...]`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bank = (formData.get('bank') as string) || 'banco desconhecido'

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx. 12 MB)' }, { status: 413 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            } as Anthropic.DocumentBlockParam,
            { type: 'text', text: PROMPT(bank) },
          ],
        },
      ],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''

    // Extract JSON array robustly
    let transactions: unknown[] = []
    try {
      // Try direct parse first
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      transactions = JSON.parse(cleaned)
    } catch {
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) {
        return NextResponse.json(
          { error: 'Não foi possível extrair transações deste PDF. Verifique se é um extrato bancário válido.' },
          { status: 422 }
        )
      }
      try {
        transactions = JSON.parse(match[0])
      } catch {
        return NextResponse.json({ error: 'Resposta inválida da IA. Tente novamente.' }, { status: 422 })
      }
    }

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma transação encontrada no PDF. Verifique se o arquivo é um extrato bancário.' },
        { status: 422 }
      )
    }

    // Sanitize and validate each transaction
    const valid = transactions
      .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
      .map((t, i) => ({
        _id: `tx-${i}`,
        date: typeof t.date === 'string' ? t.date : new Date().toISOString().slice(0, 10),
        description: typeof t.description === 'string' ? t.description.trim() : 'Transação',
        amount: Math.abs(Number(t.amount) || 0),
        type: t.type === 'income' ? 'income' : 'expense',
        category: typeof t.category === 'string' ? t.category : 'Outros',
      }))
      .filter((t) => t.amount > 0 && t.date.match(/^\d{4}-\d{2}-\d{2}$/))

    return NextResponse.json({ transactions: valid, total: valid.length })
  } catch (error) {
    console.error('[importar-extrato] erro:', error)
    return NextResponse.json({ error: 'Erro interno ao processar o PDF' }, { status: 500 })
  }
}
