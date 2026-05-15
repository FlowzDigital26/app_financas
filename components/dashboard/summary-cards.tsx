'use client'

import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { DashboardSummary } from '@/types'

interface SummaryCardsProps {
  summary: DashboardSummary
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Receitas',
      value: summary.totalIncome,
      icon: TrendingUp,
      colorClass: 'text-income',
      bgClass: 'bg-income/10',
      borderClass: 'border-income/20',
      delay: 'animate-slide-in-1',
    },
    {
      label: 'Despesas',
      value: summary.totalExpense,
      icon: TrendingDown,
      colorClass: 'text-expense',
      bgClass: 'bg-expense/10',
      borderClass: 'border-expense/20',
      delay: 'animate-slide-in-2',
    },
    {
      label: 'Saldo',
      value: summary.balance,
      icon: Wallet,
      colorClass: summary.balance >= 0 ? 'text-income' : 'text-expense',
      bgClass: summary.balance >= 0 ? 'bg-income/10' : 'bg-expense/10',
      borderClass: summary.balance >= 0 ? 'border-income/20' : 'border-expense/20',
      delay: 'animate-slide-in-3',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.label}
            className={`border ${card.borderClass} ${card.delay} overflow-hidden`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {card.label}
                  </p>
                  <p className={`text-3xl font-semibold ${card.colorClass}`}>
                    {formatCurrency(card.value)}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${card.bgClass} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${card.colorClass}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
