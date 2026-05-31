import { AlertTriangle, CheckCircle, Settings } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import type { BudgetConfig } from '@/types'

interface BudgetCardProps {
  config: BudgetConfig
  categoryActual: Record<string, number>
  totalIncome: number
  totalExpense: number
}

interface CategoryRow {
  category: string
  budget: number
  actual: number
  pct: number
}

function ProgressBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100)
  const color =
    pct >= 100 ? 'bg-expense' : pct >= 85 ? 'bg-gold' : 'bg-income'
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${capped}%` }}
      />
    </div>
  )
}

export function BudgetCard({ config, categoryActual, totalIncome, totalExpense }: BudgetCardProps) {
  const { monthly_salary, savings_goal, investment_goal, category_budgets } = config

  const totalBudgeted = Object.values(category_budgets).reduce((s, v) => s + v, 0)
  const hasAnyBudget = monthly_salary > 0 || totalBudgeted > 0

  if (!hasAnyBudget) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Orçamento não configurado</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Defina limites por categoria e acompanhe seus gastos em tempo real
          </p>
        </div>
        <Link
          href="/configuracoes"
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
        >
          <Settings className="w-3.5 h-3.5" />
          Configurar
        </Link>
      </div>
    )
  }

  // Build category rows for categories that have a budget set
  const rows: CategoryRow[] = Object.entries(category_budgets)
    .filter(([, budget]) => budget > 0)
    .map(([cat, budget]) => ({
      category: cat,
      budget,
      actual: categoryActual[cat] ?? 0,
      pct: ((categoryActual[cat] ?? 0) / budget) * 100,
    }))
    .sort((a, b) => b.pct - a.pct)

  const overallPct = totalBudgeted > 0 ? (totalExpense / totalBudgeted) * 100 : 0
  const incomePct = monthly_salary > 0 ? (totalIncome / monthly_salary) * 100 : 0

  const alerts = rows.filter((r) => r.pct >= 85)
  const overBudget = rows.filter((r) => r.pct >= 100)

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="text-base font-display font-semibold">Controle de Orçamento</h2>
        <Link
          href="/configuracoes"
          className="text-xs text-muted-foreground hover:text-accent transition-colors flex items-center gap-1"
        >
          <Settings className="w-3 h-3" />
          Editar
        </Link>
      </div>

      <div className="px-5 pb-4 space-y-4">
        {/* Overall expense vs budget */}
        {totalBudgeted > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Despesas do mês</span>
              <span className="font-medium">
                {formatCurrency(totalExpense)}
                <span className="text-muted-foreground font-normal"> / {formatCurrency(totalBudgeted)}</span>
              </span>
            </div>
            <ProgressBar pct={overallPct} />
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${overallPct >= 100 ? 'text-expense' : overallPct >= 85 ? 'text-gold' : 'text-income'}`}>
                {overallPct.toFixed(0)}% do orçamento utilizado
              </span>
              {overallPct >= 100 && (
                <span className="text-xs text-expense flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Limite ultrapassado
                </span>
              )}
            </div>
          </div>
        )}

        {/* Income vs planned */}
        {monthly_salary > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Receita do mês</span>
              <span className="font-medium">
                {formatCurrency(totalIncome)}
                <span className="text-muted-foreground font-normal"> / {formatCurrency(monthly_salary)}</span>
              </span>
            </div>
            <ProgressBar pct={incomePct} />
          </div>
        )}

        {/* Per-category breakdown — show top 5, prioritize alerts */}
        {rows.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por categoria</p>
            {rows.slice(0, 5).map((row) => (
              <div key={row.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {row.pct >= 100 ? (
                      <AlertTriangle className="w-3 h-3 text-expense shrink-0" />
                    ) : row.pct >= 85 ? (
                      <AlertTriangle className="w-3 h-3 text-gold shrink-0" />
                    ) : (
                      <CheckCircle className="w-3 h-3 text-income shrink-0" />
                    )}
                    <span className="font-medium">{row.category}</span>
                  </div>
                  <span className={`font-medium ${row.pct >= 100 ? 'text-expense' : row.pct >= 85 ? 'text-gold' : 'text-muted-foreground'}`}>
                    {formatCurrency(row.actual)} / {formatCurrency(row.budget)}
                    <span className="ml-1.5 text-[10px]">{row.pct.toFixed(0)}%</span>
                  </span>
                </div>
                <ProgressBar pct={row.pct} />
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {alerts.length > 0 && (
          <div className="rounded-lg bg-muted/60 p-3 space-y-1">
            <p className="text-xs font-semibold text-foreground">
              {overBudget.length > 0 ? '⚠️ Atenção' : '💡 Sugestão'}
            </p>
            {alerts.slice(0, 2).map((row) => (
              <p key={row.category} className="text-xs text-muted-foreground">
                {row.pct >= 100
                  ? `Você ultrapassou o limite de ${row.category} em ${formatCurrency(row.actual - row.budget)} (${row.pct.toFixed(0)}%).`
                  : `Você está usando ${row.pct.toFixed(0)}% do orçamento de ${row.category} — ${formatCurrency(row.budget - row.actual)} disponíveis.`
                }
              </p>
            ))}
          </div>
        )}

        {/* Savings / investment goals summary */}
        {(savings_goal > 0 || investment_goal > 0) && (
          <div className="flex gap-3 pt-1">
            {savings_goal > 0 && (
              <div className="flex-1 rounded-lg bg-income/5 border border-income/15 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Meta poupança</p>
                <p className="text-sm font-semibold text-income mt-0.5">{formatCurrency(savings_goal)}</p>
              </div>
            )}
            {investment_goal > 0 && (
              <div className="flex-1 rounded-lg bg-accent/5 border border-accent/15 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Meta investimento</p>
                <p className="text-sm font-semibold text-accent mt-0.5">{formatCurrency(investment_goal)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
