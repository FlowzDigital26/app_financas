import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { MonthlyChart } from '@/components/dashboard/monthly-chart'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { ExportButton } from '@/components/export/export-button'
import { type Transaction, type MonthlyData } from '@/types'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const monthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR })

  // This month's transactions
  const { data: monthTxs = [] } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .order('date', { ascending: false })

  const transactions = (monthTxs ?? []) as Transaction[]
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // Monthly chart — last 6 months
  const monthlyData: MonthlyData[] = []
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i)
    const start = format(startOfMonth(d), 'yyyy-MM-dd')
    const end = format(endOfMonth(d), 'yyyy-MM-dd')
    const label = format(d, 'MMM', { locale: ptBR })
    const { data: mTxs = [] } = await supabase
      .from('transactions').select('type, amount')
      .eq('user_id', user.id).gte('date', start).lte('date', end)
    const inc = (mTxs ?? []).filter((t: { type: string }) => t.type === 'income').reduce((s: number, t: { amount: number }) => s + t.amount, 0)
    const exp = (mTxs ?? []).filter((t: { type: string }) => t.type === 'expense').reduce((s: number, t: { amount: number }) => s + t.amount, 0)
    monthlyData.push({ month: label, income: inc, expense: exp })
  }

  const recentTxs = transactions.slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold capitalize">
            {monthLabel}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Resumo financeiro do mês</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton userId={user.id} />
          <TransactionForm />
        </div>
      </div>

      {/* Summary cards */}
      <SummaryCards summary={{ totalIncome, totalExpense, balance: totalIncome - totalExpense }} />

      {/* Monthly chart full width */}
      <MonthlyChart data={monthlyData} />

      {/* Recent transactions */}
      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-base font-display font-semibold">Últimas Transações</h2>
          <a href="/extrato" className="text-xs text-accent hover:underline font-medium">
            Ver extrato completo →
          </a>
        </div>
        <div className="px-1 pb-2">
          <TransactionList transactions={recentTxs} />
        </div>
      </div>
    </div>
  )
}
