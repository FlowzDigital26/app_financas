'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Plus, Minus, Pencil, Trash2, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GoalProgressRing } from '@/components/goals/goal-progress-ring'
import { GoalForm } from '@/components/goals/goal-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { type Goal, type GoalContribution } from '@/types'

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [goal, setGoal] = useState<Goal | null>(null)
  const [contributions, setContributions] = useState<GoalContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Contribution form state
  const [contribOpen, setContribOpen] = useState(false)
  const [contribType, setContribType] = useState<'add' | 'remove'>('add')
  const [contribAmount, setContribAmount] = useState('')
  const [contribNote, setContribNote] = useState('')
  const [contribDate, setContribDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [contribSaving, setContribSaving] = useState(false)

  const fetchGoal = useCallback(async () => {
    setLoading(true)
    const { data: goalData } = await supabase.from('goals').select('*').eq('id', id).single()
    const { data: contribData } = await supabase
      .from('goal_contributions').select('*').eq('goal_id', id).order('date', { ascending: false })
    setGoal(goalData as Goal)
    setContributions((contribData ?? []) as GoalContribution[])
    setLoading(false)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchGoal() }, [fetchGoal])

  async function handleContribution() {
    const parsed = parseFloat(contribAmount.replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' }); return
    }
    if (!goal) return
    const finalAmount = contribType === 'remove' ? -parsed : parsed
    const newCurrent = Math.max(0, goal.current_amount + finalAmount)

    if (contribType === 'remove' && parsed > goal.current_amount) {
      toast({ title: 'Valor maior que o acumulado', variant: 'destructive' }); return
    }

    setContribSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setContribSaving(false); return }

    const { error: contribError } = await supabase.from('goal_contributions').insert({
      goal_id: id, user_id: user.id, amount: finalAmount, note: contribNote || null, date: contribDate,
    })
    if (contribError) {
      toast({ title: 'Erro ao registrar', description: contribError.message, variant: 'destructive' })
      setContribSaving(false); return
    }

    const isCompleted = newCurrent >= goal.target_amount
    const { error: goalError } = await supabase.from('goals').update({
      current_amount: newCurrent,
      completed_at: isCompleted && !goal.completed_at ? new Date().toISOString() : goal.completed_at,
    }).eq('id', id)

    setContribSaving(false)
    if (goalError) { toast({ title: 'Erro ao atualizar objetivo', variant: 'destructive' }); return }

    toast({ title: contribType === 'add' ? 'Aporte registrado!' : 'Retirada registrada!' })
    setContribOpen(false)
    setContribAmount('')
    setContribNote('')
    if (isCompleted && !goal.completed_at) {
      toast({ title: '🎉 Objetivo concluído!', description: `Parabéns! Você atingiu a meta de ${formatCurrency(goal.target_amount)}` })
    }
    fetchGoal()
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('goals').delete().eq('id', id)
    setDeleting(false)
    router.push('/objetivos')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Objetivo não encontrado.</p>
        <Link href="/objetivos" className="text-accent text-sm hover:underline mt-2 block">← Voltar</Link>
      </div>
    )
  }

  const percentage = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0
  const remaining = Math.max(goal.target_amount - goal.current_amount, 0)
  const endDateFormatted = format(new Date(goal.end_date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link href="/objetivos">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-semibold">{goal.name}</h1>
          {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
        </div>
        <GoalForm goal={goal} onSuccess={fetchGoal} trigger={
          <Button variant="outline" size="icon"><Pencil className="w-4 h-4" /></Button>
        } />
        <Button variant="outline" size="icon" className="text-expense hover:bg-expense/10 hover:border-expense/30"
          onClick={() => setDeleteConfirm(true)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Progress ring + stats */}
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-6">
            <div className="relative">
              <GoalProgressRing percentage={percentage} size={180} strokeWidth={16} color={goal.color} />
            </div>

            {goal.completed_at && (
              <div className="flex items-center gap-1.5 text-income text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Objetivo concluído!
              </div>
            )}

            <div className="w-full space-y-3">
              {[
                { label: 'Acumulado', value: formatCurrency(goal.current_amount), color: goal.color },
                { label: 'Meta', value: formatCurrency(goal.target_amount), color: undefined },
                { label: 'Faltam', value: formatCurrency(remaining), color: remaining > 0 ? 'hsl(var(--muted-foreground))' : 'hsl(var(--income))' },
                { label: 'Prazo final', value: endDateFormatted, color: undefined },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-semibold" style={row.color ? { color: row.color } : {}}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            {!goal.completed_at && (
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button variant="income" onClick={() => { setContribType('add'); setContribOpen(true) }} className="gap-2">
                  <Plus className="w-4 h-4" /> Depositar
                </Button>
                <Button variant="outline" onClick={() => { setContribType('remove'); setContribOpen(true) }} className="gap-2"
                  disabled={goal.current_amount <= 0}>
                  <Minus className="w-4 h-4" /> Retirar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contributions history */}
        <Card>
          <div className="p-5 pb-2 border-b border-border">
            <h2 className="text-sm font-display font-semibold">Histórico de aportes</h2>
          </div>
          <CardContent className="p-3">
            {contributions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum aporte registrado ainda</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {contributions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{c.note || (c.amount > 0 ? 'Depósito' : 'Retirada')}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(c.date)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${c.amount > 0 ? 'text-income' : 'text-expense'}`}>
                      {c.amount > 0 ? '+' : ''}{formatCurrency(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contribution dialog */}
      <Dialog open={contribOpen} onOpenChange={setContribOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{contribType === 'add' ? 'Registrar Depósito' : 'Registrar Retirada'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Valor (R$) *</Label>
              <Input inputMode="decimal" placeholder="0,00" value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={contribDate} onChange={(e) => setContribDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Observação</Label>
              <Input placeholder="Opcional" value={contribNote} onChange={(e) => setContribNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContribOpen(false)} disabled={contribSaving}>Cancelar</Button>
            <Button variant={contribType === 'add' ? 'income' : 'expense'} onClick={handleContribution} disabled={contribSaving}>
              {contribSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {contribType === 'add' ? 'Confirmar depósito' : 'Confirmar retirada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Excluir objetivo?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Todo o histórico de aportes será perdido. Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
