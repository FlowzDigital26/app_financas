import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { MonthlyChart } from '@/components/dashboard/monthly-chart'
import { BudgetCard } from '@/components/dashboard/budget-card'
import { LiveDate } from '@/components/dashboard/live-date'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { type Transaction, type MonthlyData, type BudgetConfig } from '@/types'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const monthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR })

  // This month's transactions + budget config in parallel
  const [{ data: monthTxs = [] }, { data: budgetData }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('user_budget_config')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const transactions = (monthTxs ?? []) as Transaction[]
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // Per-category actual spending this month (for budget comparison)
  const categoryActual: Record<string, number> = {}
  transactions.filter((t) => t.type === 'expense').forEach((t) => {
    categoryActual[t.category] = (categoryActual[t.category] ?? 0) + t.amount
  })

  const budgetConfig: BudgetConfig = budgetData
    ? (budgetData as unknown as BudgetConfig)
    : {
        id: '',
        user_id: user.id,
        monthly_salary: 0,
        savings_goal: 0,
        investment_goal: 0,
        category_budgets: {},
        updated_at: '',
        created_at: '',
      }

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
          <h1 className="text-2xl md:text-3xl font-display font-semibold">
            <LiveDate />
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            Resumo financeiro · {monthLabel}
          </p>
        </div>
        <TransactionForm />
      </div>

      {/* Summary cards */}
      <SummaryCards summary={{ totalIncome, totalExpense, balance: totalIncome - totalExpense }} />

      {/* Budget card */}
      <BudgetCard
        config={budgetConfig}
        categoryActual={categoryActual}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
      />

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
