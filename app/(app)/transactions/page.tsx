'use client'

import { useState, useEffect, useCallback } from 'react'
import { subDays, startOfMonth, endOfMonth, format } from 'date-fns'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import type { Transaction } from '@/types'

interface FiltersState {
  search: string
  type: string
  category: string
  period: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    type: 'all',
    category: 'all',
    period: 'month',
  })

  const supabase = createClient()

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    // Period filter
    const now = new Date()
    if (filters.period === '7d') {
      query = query.gte('date', format(subDays(now, 7), 'yyyy-MM-dd'))
    } else if (filters.period === '30d') {
      query = query.gte('date', format(subDays(now, 30), 'yyyy-MM-dd'))
    } else if (filters.period === '90d') {
      query = query.gte('date', format(subDays(now, 90), 'yyyy-MM-dd'))
    } else if (filters.period === 'month') {
      query = query
        .gte('date', format(startOfMonth(now), 'yyyy-MM-dd'))
        .lte('date', format(endOfMonth(now), 'yyyy-MM-dd'))
    }

    if (filters.type !== 'all') query = query.eq('type', filters.type)
    if (filters.category !== 'all') query = query.eq('category', filters.category)

    const { data } = await query
    let result = (data ?? []) as Transaction[]

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((t) => t.description.toLowerCase().includes(q))
    }

    setTransactions(result)
    setLoading(false)
  }, [filters, supabase])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const totalFiltered = transactions.reduce((s, t) => {
    return s + (t.type === 'income' ? t.amount : -t.amount)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">Transações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Carregando...' : `${transactions.length} transação${transactions.length !== 1 ? 'ões' : ''} encontrada${transactions.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <TransactionForm onSuccess={fetchTransactions} />
      </div>

      {/* Filters */}
      <TransactionFilters filters={filters} onChange={setFilters} />

      {/* List */}
      <Card>
        <CardContent className="p-2">
          {loading ? (
            <div className="py-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando transações...
            </div>
          ) : (
            <TransactionList transactions={transactions} onRefresh={fetchTransactions} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
