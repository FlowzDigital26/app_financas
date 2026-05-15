'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { ExportButton } from '@/components/export/export-button'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CATEGORY_COLORS, type Transaction } from '@/types'

type TabType = 'expense' | 'income'

function buildPeriods() {
  const now = new Date()
  const periods: { value: string; label: string; start: string; end: string }[] = [
    {
      value: 'year',
      label: `Anual ${now.getFullYear()}`,
      start: format(startOfYear(now), 'yyyy-MM-dd'),
      end: format(endOfYear(now), 'yyyy-MM-dd'),
    },
  ]
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i)
    periods.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
      start: format(startOfMonth(d), 'yyyy-MM-dd'),
      end: format(endOfMonth(d), 'yyyy-MM-dd'),
    })
  }
  return periods
}

const PERIODS = buildPeriods()

export default function ExtratoPage() {
  const [tab, setTab] = useState<TabType>('expense')
  const [period, setPeriod] = useState(PERIODS[1].value) // current month
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const selectedPeriod = PERIODS.find((p) => p.value === period) ?? PERIODS[1]

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', selectedPeriod.start)
      .lte('date', selectedPeriod.end)
      .order('date', { ascending: false })

    setTransactions((data ?? []) as Transaction[])
    setLoading(false)
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const filtered = transactions.filter((t) => t.type === tab)
  const total = filtered.reduce((s, t) => s + t.amount, 0)

  // Category breakdown
  const byCategory: Record<string, number> = {}
  filtered.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount
  })
  const categoryBreakdown = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] ?? '#94a3b8' }))
    .sort((a, b) => b.value - a.value)

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">Extrato</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{selectedPeriod.label}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="capitalize">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ExportButton />
          <TransactionForm onSuccess={fetchTransactions} />
        </div>
      </div>

      {/* Period summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Entradas', value: totalIncome, color: 'text-income' },
          { label: 'Saídas', value: totalExpense, color: 'text-expense' },
          { label: 'Saldo', value: balance, color: balance >= 0 ? 'text-income' : 'text-expense' },
        ].map((item) => (
          <Card key={item.label} className="text-center">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
              <p className={`text-lg font-display font-semibold ${item.color}`}>
                {formatCurrency(item.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: category bars */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {/* Tab header */}
              <div className="flex border-b border-border">
                {(['expense', 'income'] as TabType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      tab === t
                        ? t === 'income'
                          ? 'text-income border-b-2 border-income'
                          : 'text-expense border-b-2 border-expense'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'income' ? 'Entradas' : 'Saídas'}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {loading ? (
                  <div className="py-10 flex items-center justify-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
                  </div>
                ) : categoryBreakdown.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground text-sm">
                    Nenhuma {tab === 'income' ? 'receita' : 'despesa'} no período
                  </p>
                ) : (
                  <div className="space-y-4">
                    {categoryBreakdown.map((cat) => {
                      const pct = total > 0 ? (cat.value / total) * 100 : 0
                      return (
                        <div key={cat.name}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="text-sm font-medium">{cat.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold">{formatCurrency(cat.value)}</span>
                              <span className="text-xs text-muted-foreground ml-2">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: cat.color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                    <div className="pt-2 border-t border-border flex justify-between text-sm">
                      <span className="font-medium">Total</span>
                      <span className={`font-semibold ${tab === 'income' ? 'text-income' : 'text-expense'}`}>
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: donut chart */}
        <div>
          <Card className="h-full">
            <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-[260px]">
              {categoryBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {categoryBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{ borderRadius: '0.5rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {categoryBreakdown.length} categorias
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center">Sem dados para o gráfico</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full transaction list */}
      <Card>
        <div className="p-4 pb-2 border-b border-border">
          <h2 className="text-sm font-display font-semibold">
            Todas as transações ({transactions.length})
          </h2>
        </div>
        <CardContent className="p-2">
          {loading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : (
            <TransactionList transactions={transactions} onRefresh={fetchTransactions} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
