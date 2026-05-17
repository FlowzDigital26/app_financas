import { NextRequest, NextResponse } from 'next/server'

async function getPluggyApiKey() {
  const res = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  })
  if (!res.ok) throw new Error('Pluggy auth falhou')
  const { apiKey } = await res.json()
  return apiKey as string
}

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get('itemId')
  if (!itemId) {
    return NextResponse.json({ error: 'itemId é obrigatório' }, { status: 400 })
  }

  try {
    const apiKey = await getPluggyApiKey()
    const headers = { 'X-API-KEY': apiKey }

    // Aguarda o item ser processado (sandbox pode demorar alguns segundos)
    const itemRes = await fetch(`https://api.pluggy.ai/items/${itemId}`, { headers })
    const item = await itemRes.json()

    // Busca contas do item
    const accountsRes = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, { headers })
    const { results: accounts = [] } = await accountsRes.json()

    // Busca transações de cada conta (até 30 por conta)
    type PluggyAccount = { id: string; name: string; type: string; balance: number; currencyCode: string }
    type PluggyTransaction = { id: string; description: string; amount: number; date: string; type: string; category?: string; accountName?: string }

    const allTransactions: PluggyTransaction[] = []

    for (const account of accounts as PluggyAccount[]) {
      const txRes = await fetch(
        `https://api.pluggy.ai/transactions?accountId=${account.id}&pageSize=30`,
        { headers }
      )
      const { results: txs = [] } = await txRes.json()
      for (const tx of txs as PluggyTransaction[]) {
        allTransactions.push({ ...tx, accountName: account.name })
      }
    }

    // Ordena por data decrescente
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({ item, accounts, transactions: allTransactions })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
