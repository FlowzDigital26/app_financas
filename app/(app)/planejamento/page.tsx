import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { PlanningBoard, type PlanTx } from '@/components/budget/planning-board'
import {
  DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES,
  type BudgetPlanItem, type Category, type Subcategory,
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
  const base = mes && /^\d{4}-\d{2}$/.test(mes) ? parseISO(`${mes}-01`) : new Date()
  const monthFirst = format(startOfMonth(base), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(base), 'yyyy-MM-dd')
  const monthKey = format(base, 'yyyy-MM')

  const [
    { data: plans = [] },
    { data: monthTxs = [] },
    { data: customCats = [] },
    { data: subs = [] },
  ] = await Promise.all([
    supabase
      .from('budget_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', monthFirst)
      .order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('id, name, description, type, amount, category, subcategory, date')
      .eq('user_id', user.id)
      .gte('date', monthFirst)
      .lte('date', monthEnd)
      .order('date', { ascending: false }),
    supabase
      .from('categories')
      .select('name, type')
      .eq('user_id', user.id),
    supabase
      .from('subcategories')
      .select('category_name, name')
      .eq('user_id', user.id)
      .order('name', { ascending: true }),
  ])

  const transactions = (monthTxs ?? []) as PlanTx[]

  const cats = (customCats ?? []) as Pick<Category, 'name' | 'type'>[]
  const incomeCategories = mergeNames(DEFAULT_INCOME_CATEGORIES, cats.filter((c) => c.type === 'income'))
  const expenseCategories = mergeNames(DEFAULT_EXPENSE_CATEGORIES, cats.filter((c) => c.type === 'expense'))

  // Group subcategories by parent category name
  const subsByCategory: Record<string, string[]> = {}
  for (const s of (subs ?? []) as Pick<Subcategory, 'category_name' | 'name'>[]) {
    ;(subsByCategory[s.category_name] ??= []).push(s.name)
  }

  return (
    <PlanningBoard
      month={monthKey}
      items={(plans ?? []) as BudgetPlanItem[]}
      transactions={transactions}
      incomeCategories={incomeCategories}
      expenseCategories={expenseCategories}
      subsByCategory={subsByCategory}
    />
  )
}
