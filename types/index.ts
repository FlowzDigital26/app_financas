export type TransactionType = 'income' | 'expense'

export type PaymentMethod =
  | 'pix'
  | 'boleto'
  | 'cartao_credito'
  | 'debito'
  | 'dinheiro'
  | 'transferencia'
  | 'outros'

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'debito', label: 'Débito' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'outros', label: 'Outros' },
]

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  description: string
  category: string
  subcategory?: string | null
  date: string
  payment_method?: PaymentMethod
  bank?: string
  created_at: string
}

export interface TransactionInsert {
  type: TransactionType
  amount: number
  description: string
  category: string
  subcategory?: string | null
  date: string
  payment_method?: PaymentMethod
  bank?: string
}

export interface Subcategory {
  id: string
  user_id: string
  category_name: string
  name: string
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: TransactionType
  color: string
  created_at: string
}

export interface Profile {
  id: string
  full_name?: string
  phone?: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  name: string
  description?: string
  icon: string
  color: string
  target_amount: number
  current_amount: number
  start_date: string
  end_date: string
  completed_at?: string
  created_at: string
}

export interface GoalContribution {
  id: string
  goal_id: string
  user_id: string
  amount: number
  note?: string
  date: string
  created_at: string
}

export interface DashboardSummary {
  totalIncome: number
  totalExpense: number
  balance: number
}

export interface CategoryData {
  name: string
  value: number
  color: string
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
}

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salário', color: '#3aaa6e' },
  { name: 'Freelance', color: '#22c55e' },
  { name: 'Investimentos', color: '#10b981' },
  { name: 'Aluguel recebido', color: '#34d399' },
  { name: 'Bonificação', color: '#6ee7b7' },
  { name: 'Outros', color: '#94a3b8' },
] as const

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Alimentação', color: '#e85c41' },
  { name: 'Transporte', color: '#f59e0b' },
  { name: 'Moradia', color: '#3b82f6' },
  { name: 'Saúde', color: '#8b5cf6' },
  { name: 'Lazer', color: '#ec4899' },
  { name: 'Educação', color: '#06b6d4' },
  { name: 'Compras', color: '#f97316' },
  { name: 'Assinaturas', color: '#6366f1' },
  { name: 'Contas', color: '#64748b' },
  { name: 'Outros', color: '#94a3b8' },
] as const

export const INCOME_CATEGORIES = DEFAULT_INCOME_CATEGORIES.map((c) => c.name)
export const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name)

export const CATEGORY_COLORS: Record<string, string> = {
  ...Object.fromEntries(DEFAULT_INCOME_CATEGORIES.map((c) => [c.name, c.color])),
  ...Object.fromEntries(DEFAULT_EXPENSE_CATEGORIES.map((c) => [c.name, c.color])),
}

export const GOAL_ICONS = [
  { value: 'monitor', label: 'Tecnologia' },
  { value: 'home', label: 'Casa' },
  { value: 'plane', label: 'Viagem' },
  { value: 'graduation-cap', label: 'Educação' },
  { value: 'car', label: 'Veículo' },
  { value: 'heart', label: 'Saúde' },
  { value: 'piggy-bank', label: 'Poupança' },
  { value: 'shield', label: 'Reserva' },
  { value: 'target', label: 'Meta' },
  { value: 'star', label: 'Sonho' },
] as const

export const GOAL_COLORS = [
  '#3aaa6e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#06b6d4', '#e85c41', '#64748b',
] as const

export type FilterPeriod = '7d' | '30d' | '90d' | 'custom'

export interface BudgetConfig {
  id: string
  user_id: string
  monthly_salary: number
  savings_goal: number
  investment_goal: number
  category_budgets: Record<string, number>
  updated_at: string
  created_at: string
}

// ── Monthly planning (Planejamento) ──
export type PlanKind = 'renda' | 'investimento' | 'fixo' | 'variavel'

export const PLAN_KINDS: { value: PlanKind; label: string; direction: TransactionType; color: string }[] = [
  { value: 'renda',        label: 'Renda',          direction: 'income',  color: '#3aaa6e' },
  { value: 'investimento', label: 'Investimentos',  direction: 'expense', color: '#06b6d4' },
  { value: 'fixo',         label: 'Fixo',           direction: 'expense', color: '#f97316' },
  { value: 'variavel',     label: 'Variável',       direction: 'expense', color: '#f59e0b' },
]

export interface BudgetPlanItem {
  id: string
  user_id: string
  month: string   // 'yyyy-MM-dd' (first day of month)
  kind: PlanKind
  label: string                 // Nome (ex: Assinatura do Spotify)
  category: string              // Categoria (ex: Lazer)
  subcategory?: string | null   // Subcategoria (ex: Spotify)
  planned: number               // Valor
  created_at: string
}
