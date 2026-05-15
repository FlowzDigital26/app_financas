import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { CategoryChart } from '@/components/dashboard/category-chart'
import { MonthlyChart } from '@/components/dashboard/monthly-chart'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { CATEGORY_COLORS, type Transaction, type CategoryData, type MonthlyData } from '@/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const monthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR })

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

  const expenseByCategory: Record<string, number> = {}
  transactions.filter((t) => t.type === 'expense').forEach((t) => {
    expenseByCategory[t.category] = (expenseByCategory[t.category] ?? 0) + t.amount
  })
  const categoryData: CategoryData[] = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] ?? '#94a3b8' }))
    .sort((a, b) => b.value - a.value)

  // Monthly chart — last 6 months
  const monthlyData: MonthlyData[] = []
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i)
    const start = format(startOfMonth(d), 'yyyy-MM-dd')
    const end = format(endOfMonth(d), 'yyyy-MM-dd')
    const label = format(d, 'MMM', { locale: ptBR })

    const { data: mTxs = [] } = await supabase
      .from('transactions')
      .select('type, amount')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)

    const inc = (mTxs ?? []).filter((t: { type: string }) => t.type === 'income').reduce((s: number, t: { amount: number }) => s + t.amount, 0)
    const exp = (mTxs ?? []).filter((t: { type: string }) => t.type === 'expense').reduce((s: number, t: { amount: number }) => s + t.amount, 0)
    monthlyData.push({ month: label, income: inc, expense: exp })
  }

  const recentTxs = transactions.slice(0, 8)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold capitalize">
            {monthLabel}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumo financeiro do mês
          </p>
        </div>
        <TransactionForm />
      </div>

      <SummaryCards summary={{ totalIncome, totalExpense, balance: totalIncome - totalExpense }} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <CategoryChart data={categoryData} />
        </div>
        <div className="lg:col-span-3">
          <MonthlyChart data={monthlyData} />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-base font-display font-semibold">Transações Recentes</h2>
          <a href="/transactions" className="text-xs text-accent hover:underline font-medium">
            Ver todas →
          </a>
        </div>
        <div className="px-1 pb-2">
          <TransactionList transactions={recentTxs} />
        </div>
      </div>
    </div>
  )
}
