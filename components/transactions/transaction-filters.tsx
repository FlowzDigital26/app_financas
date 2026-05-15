'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/types'

interface FiltersState {
  search: string
  type: string
  category: string
  period: string
}

interface TransactionFiltersProps {
  filters: FiltersState
  onChange: (filters: FiltersState) => void
}

const ALL_CATEGORIES = Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]))

const PERIODS = [
  { value: 'all', label: 'Todos os períodos' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'month', label: 'Este mês' },
]

export function TransactionFilters({ filters, onChange }: TransactionFiltersProps) {
  const hasActiveFilters =
    filters.search || filters.type !== 'all' || filters.category !== 'all' || filters.period !== 'all'

  function reset() {
    onChange({ search: '', type: 'all', category: 'all', period: 'all' })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar por descrição..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Period */}
      <Select
        value={filters.period}
        onValueChange={(v) => onChange({ ...filters, period: v })}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type */}
      <Select
        value={filters.type}
        onValueChange={(v) => onChange({ ...filters, type: v, category: 'all' })}
      >
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          <SelectItem value="income">Receitas</SelectItem>
          <SelectItem value="expense">Despesas</SelectItem>
        </SelectContent>
      </Select>

      {/* Category */}
      <Select
        value={filters.category}
        onValueChange={(v) => onChange({ ...filters, category: v })}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {(filters.type === 'income'
            ? INCOME_CATEGORIES
            : filters.type === 'expense'
            ? EXPENSE_CATEGORIES
            : ALL_CATEGORIES
          ).map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="icon" onClick={reset} className="shrink-0">
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
