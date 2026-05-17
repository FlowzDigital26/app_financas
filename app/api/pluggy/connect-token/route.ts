import { NextResponse } from 'next/server'

async function getPluggyApiKey() {
  const res = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Pluggy auth falhou: ${text}`)
  }
  const { apiKey } = await res.json()
  return apiKey as string
}

export async function POST() {
  if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não configurados no .env.local' },
      { status: 500 }
    )
  }

  try {
    const apiKey = await getPluggyApiKey()

    const tokenRes = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({}),
    })

    if (!tokenRes.ok) {
      const text = await tokenRes.text()
      throw new Error(`Connect token falhou: ${text}`)
    }

    const { accessToken } = await tokenRes.json()
    return NextResponse.json({ connectToken: accessToken })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
