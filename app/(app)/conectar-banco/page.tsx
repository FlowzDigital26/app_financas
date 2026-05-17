'use client'

import { useState } from 'react'
import Script from 'next/script'
import { Loader2, Building2, ArrowRight, CheckCircle2, XCircle, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    PluggyConnect: new (opts: Record<string, unknown>) => { init: () => void }
  }
}

type PluggyAccount = {
  id: string
  name: string
  type: string
  subtype: string
  balance: number
  currencyCode: string
}

type PluggyTransaction = {
  id: string
  description: string
  amount: number
  date: string
  type: 'CREDIT' | 'DEBIT'
  category?: string
  accountName?: string
}

type Status = 'idle' | 'loading-token' | 'connecting' | 'loading-data' | 'success' | 'error'

export default function ConectarBancoPage() {
  const [scriptReady, setScriptReady] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<PluggyAccount[]>([])
  const [transactions, setTransactions] = useState<PluggyTransaction[]>([])

  async function handleConnect() {
    setError(null)
    setAccounts([])
    setTransactions([])
    setStatus('loading-token')

    try {
      // 1. Gera o connect token via nossa API (mantém as chaves no servidor)
      const tokenRes = await fetch('/api/pluggy/connect-token', { method: 'POST' })
      const tokenJson = await tokenRes.json()

      if (!tokenRes.ok) throw new Error(tokenJson.error || 'Erro ao gerar connect token')

      const { connectToken } = tokenJson
      setStatus('connecting')

      // 2. Abre o widget do Pluggy
      const widget = new window.PluggyConnect({
        connectToken,
        onSuccess: async ({ item }: { item: { id: string } }) => {
          setStatus('loading-data')

          const txRes = await fetch(`/api/pluggy/transactions?itemId=${item.id}`)
          const txJson = await txRes.json()

          if (!txRes.ok) throw new Error(txJson.error || 'Erro ao buscar transações')

          setAccounts(txJson.accounts ?? [])
          setTransactions(txJson.transactions ?? [])
          setStatus('success')
        },
        onError: (err: { message?: string }) => {
          setError(err?.message ?? 'Erro no widget Pluggy')
          setStatus('error')
        },
        onClose: () => {
          setStatus((s) => (s === 'connecting' ? 'idle' : s))
        },
      })

      widget.init()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setError(null)
    setAccounts([])
    setTransactions([])
  }

  const totalIncome = transactions.filter((t) => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'DEBIT').reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <>
      <Script
        src="https://cdn.pluggy.ai/pluggy-connect/v2/pluggy-connect.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError('Não foi possível carregar o widget do Pluggy (CDN inacessível).')}
      />

      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-semibold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-accent" />
            Conectar banco (sandbox)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Teste a integração Pluggy sem salvar nada no banco de dados.
          </p>
        </div>

        {/* Status: idle / loading / error */}
        {status !== 'success' && (
          <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-5 text-center">

            {(status === 'idle' || status === 'error') && (
              <>
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-accent" />
                </div>

                {status === 'error' && error && (
                  <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-left w-full max-w-md">
                    <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div>
                  <p className="font-medium text-foreground mb-1">
                    Conecte uma instituição financeira
                  </p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    No sandbox do Pluggy você pode usar instituições de teste com credenciais fictícias.
                  </p>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={!scriptReady}
                  className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-6 py-3 rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!scriptReady ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando widget…
                    </>
                  ) : (
                    <>
                      Abrir widget Pluggy
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {!scriptReady && (
                  <p className="text-xs text-muted-foreground">
                    Aguardando o script do Pluggy carregar…
                  </p>
                )}
              </>
            )}

            {(status === 'loading-token' || status === 'loading-data') && (
              <>
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
                <p className="font-medium text-foreground">
                  {status === 'loading-token' ? 'Gerando connect token…' : 'Buscando transações…'}
                </p>
                <p className="text-sm text-muted-foreground">Aguarde um momento.</p>
              </>
            )}

            {status === 'connecting' && (
              <>
                <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-accent animate-pulse" />
                </div>
                <p className="font-medium text-foreground">Widget aberto</p>
                <p className="text-sm text-muted-foreground">
                  Selecione uma instituição e complete o fluxo de conexão.
                </p>
              </>
            )}
          </div>
        )}

        {/* Success: accounts + transactions */}
        {status === 'success' && (
          <>
            {/* Banner de sucesso */}
            <div className="flex items-center gap-3 bg-income/10 border border-income/30 rounded-xl px-5 py-3">
              <CheckCircle2 className="w-5 h-5 text-income shrink-0" />
              <p className="text-sm font-medium text-income">
                Conexão bem-sucedida! Mostrando dados do sandbox (não salvos no banco).
              </p>
              <button
                onClick={reset}
                className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reiniciar
              </button>
            </div>

            {/* Resumo rápido */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Contas</p>
                <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Total recebido</p>
                <p className="text-2xl font-bold text-income">
                  {totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Total gasto</p>
                <p className="text-2xl font-bold text-expense">
                  {totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>

            {/* Contas */}
            {accounts.length > 0 && (
              <div className="bg-card border border-border rounded-xl">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-display font-semibold text-base">Contas retornadas</h2>
                </div>
                <div className="divide-y divide-border">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{acc.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {acc.type?.toLowerCase()} · {acc.subtype?.toLowerCase()}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">
                        {acc.balance?.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: acc.currencyCode ?? 'BRL',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transações */}
            <div className="bg-card border border-border rounded-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-display font-semibold text-base">
                  Transações ({transactions.length})
                </h2>
              </div>

              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  Nenhuma transação retornada para esta conta.
                </p>
              ) : (
                <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-3 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          tx.type === 'CREDIT' ? 'bg-income/10' : 'bg-expense/10'
                        }`}>
                          {tx.type === 'CREDIT'
                            ? <TrendingUp className="w-3.5 h-3.5 text-income" />
                            : <TrendingDown className="w-3.5 h-3.5 text-expense" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {tx.accountName && <span className="mr-2">{tx.accountName}</span>}
                            {tx.category && <span className="mr-2">· {tx.category}</span>}
                            {format(new Date(tx.date), "dd MMM yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums shrink-0 ${
                        tx.type === 'CREDIT' ? 'text-income' : 'text-expense'
                      }`}>
                        {tx.type === 'CREDIT' ? '+' : '-'}
                        {Math.abs(tx.amount).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Instruções */}
        <div className="bg-muted/50 border border-border rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Como testar no sandbox</p>
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>
              Crie uma conta em{' '}
              <a
                href="https://dashboard.pluggy.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                dashboard.pluggy.ai
              </a>
            </li>
            <li>
              Gere as chaves sandbox e cole em <code className="bg-border/60 px-1 rounded text-xs">.env.local</code>{' '}
              como <code className="bg-border/60 px-1 rounded text-xs">PLUGGY_CLIENT_ID</code> e{' '}
              <code className="bg-border/60 px-1 rounded text-xs">PLUGGY_CLIENT_SECRET</code>
            </li>
            <li>Reinicie o servidor (<code className="bg-border/60 px-1 rounded text-xs">npm run dev</code>)</li>
            <li>Clique em &quot;Abrir widget Pluggy&quot; e escolha uma instituição de teste</li>
            <li>Use as credenciais de sandbox fornecidas pelo Pluggy (ex: usuário/senha fictícios)</li>
          </ol>
        </div>
      </div>
    </>
  )
}
