import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { PlanningBoard } from '@/components/budget/planning-board'
import {
  DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES,
  type BudgetPlanItem, type Category,
} from '@/types'

export const dynamic = 'force-dynamic'

function mergeNames(defaults: readonly { name: string }[], custom: { name: string }[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of defaults) if (!seen.has(c.name)) { seen.add(c.name); out.push(c.name) }
  for (const c of custom) if (!seen.has(c.name)) { seen.add(c.name); out.push(c.name) }
  return out
}

export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { mes } = await searchParams
  // Selected month — default to current month
  const base = mes && /^\d{4}-\d{2}$/.test(mes) ? parseISO(`${mes}-01`) : new Date()
  const monthFirst = format(startOfMonth(base), 'yyyy-MM-dd')
  const monthStart = monthFirst
  const monthEnd = format(endOfMonth(base), 'yyyy-MM-dd')
  const monthKey = format(base, 'yyyy-MM')

  const [{ data: plans = [] }, { data: monthTxs = [] }, { data: customCats = [] }] =
    await Promise.all([
      supabase
        .from('budget_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', monthFirst)
        .order('created_at', { ascending: true }),
      supabase
        .from('transactions')
        .select('type, amount, category')
        .eq('user_id', user.id)
        .gte('date', monthStart)
        .lte('date', monthEnd),
      supabase
        .from('categories')
        .select('name, type, color')
        .eq('user_id', user.id),
    ])

  const transactions = (monthTxs ?? []) as { type: string; amount: number; category: string }[]
  const incomeActual: Record<string, number> = {}
  const expenseActual: Record<string, number> = {}
  for (const t of transactions) {
    const map = t.type === 'income' ? incomeActual : expenseActual
    map[t.category] = (map[t.category] ?? 0) + t.amount
  }

  const cats = (customCats ?? []) as Pick<Category, 'name' | 'type' | 'color'>[]
  const incomeCategories = mergeNames(
    DEFAULT_INCOME_CATEGORIES,
    cats.filter((c) => c.type === 'income'),
  )
  const expenseCategories = mergeNames(
    DEFAULT_EXPENSE_CATEGORIES,
    cats.filter((c) => c.type === 'expense'),
  )

  return (
    <PlanningBoard
      month={monthKey}
      items={(plans ?? []) as BudgetPlanItem[]}
      incomeActual={incomeActual}
      expenseActual={expenseActual}
      incomeCategories={incomeCategories}
      expenseCategories={expenseCategories}
    />
  )
}
