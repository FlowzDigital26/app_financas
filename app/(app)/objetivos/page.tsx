import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { GoalForm } from '@/components/goals/goal-form'
import { GoalProgressRing } from '@/components/goals/goal-progress-ring'
import { GoalIcon } from '@/components/goals/goal-icon'
import { formatCurrency } from '@/lib/utils'
import { type Goal } from '@/types'
import { CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ObjetivosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const goals = (data ?? []) as Goal[]
  const active = goals.filter((g) => !g.completed_at)
  const completed = goals.filter((g) => !!g.completed_at)
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">Objetivos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Acompanhe suas metas financeiras</p>
        </div>
        <GoalForm />
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total acumulado', value: formatCurrency(totalSaved), color: 'text-income' },
            { label: 'Objetivos ativos', value: String(active.length), color: 'text-foreground' },
            { label: 'Concluídos', value: String(completed.length), color: 'text-accent' },
          ].map((item) => (
            <div key={item.label} className="bg-card rounded-xl border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
              <p className={`text-xl font-display font-semibold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active goals grid */}
      {active.length === 0 && completed.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
            <CheckCircle2 className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <p className="font-medium">Nenhum objetivo criado</p>
          <p className="text-sm mt-1">Crie seu primeiro objetivo financeiro clicando no botão acima</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Em andamento ({active.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((goal) => {
                  const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0
                  return (
                    <Link key={goal.id} href={`/objetivos/${goal.id}`}
                      className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-accent/30 transition-all group">
                      <div className="flex items-start gap-3 mb-4">
                        <GoalIcon icon={goal.icon} color={goal.color} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-accent transition-colors">{goal.name}</p>
                          {goal.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{goal.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <GoalProgressRing percentage={pct} size={80} strokeWidth={10} color={goal.color} />
                        <div className="flex-1 space-y-1">
                          <div>
                            <p className="text-xs text-muted-foreground">Acumulado</p>
                            <p className="text-sm font-semibold" style={{ color: goal.color }}>
                              {formatCurrency(goal.current_amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Meta</p>
                            <p className="text-sm font-medium">{formatCurrency(goal.target_amount)}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Concluídos ({completed.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map((goal) => (
                  <Link key={goal.id} href={`/objetivos/${goal.id}`}
                    className="bg-card rounded-xl border border-border/50 p-5 opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3">
                      <GoalIcon icon={goal.icon} color="#3aaa6e" size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium truncate">{goal.name}</p>
                          <CheckCircle2 className="w-4 h-4 text-income shrink-0" />
                        </div>
                        <p className="text-sm text-income font-medium">{formatCurrency(goal.target_amount)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
