export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  description: string
  category: string
  date: string
  created_at: string
}

export interface TransactionInsert {
  type: TransactionType
  amount: number
  description: string
  category: string
  date: string
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

export const INCOME_CATEGORIES = [
  'Salário',
  'Freelance',
  'Investimentos',
  'Aluguel recebido',
  'Bonificação',
  'Outros',
] as const

export const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Lazer',
  'Educação',
  'Compras',
  'Assinaturas',
  'Contas',
  'Outros',
] as const

export const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: '#e85c41',
  Transporte: '#f59e0b',
  Moradia: '#3b82f6',
  Saúde: '#8b5cf6',
  Lazer: '#ec4899',
  Educação: '#06b6d4',
  Compras: '#f97316',
  Assinaturas: '#6366f1',
  Contas: '#64748b',
  Outros: '#94a3b8',
  Salário: '#3aaa6e',
  Freelance: '#22c55e',
  Investimentos: '#10b981',
  'Aluguel recebido': '#34d399',
  Bonificação: '#6ee7b7',
}

export type FilterPeriod = '7d' | '30d' | '90d' | 'custom'
