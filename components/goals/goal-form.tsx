'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { GOAL_ICONS, GOAL_COLORS, type Goal } from '@/types'
import { GoalIcon } from './goal-icon'

interface GoalFormProps {
  goal?: Goal
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function GoalForm({ goal, onSuccess, trigger }: GoalFormProps) {
  const isEditing = !!goal
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(goal?.name ?? '')
  const [description, setDescription] = useState(goal?.description ?? '')
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.target_amount) : '')
  const [startDate, setStartDate] = useState(goal?.start_date ?? format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(goal?.end_date ?? '')
  const [icon, setIcon] = useState(goal?.icon ?? 'target')
  const [color, setColor] = useState(goal?.color ?? GOAL_COLORS[0])
  const { toast } = useToast()
  const supabase = createClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !targetAmount || !startDate || !endDate) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }
    const amount = parseFloat(targetAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const payload = { user_id: user.id, name, description, target_amount: amount, start_date: startDate, end_date: endDate, icon, color }
    const { error } = isEditing
      ? await supabase.from('goals').update(payload).eq('id', goal.id)
      : await supabase.from('goals').insert(payload)

    setLoading(false)
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); return }
    toast({ title: isEditing ? 'Objetivo atualizado!' : 'Objetivo criado!' })
    setOpen(false)
    router.refresh()
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button className="gap-2"><Plus className="w-4 h-4" />Novo Objetivo</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{isEditing ? 'Editar Objetivo' : 'Novo Objetivo'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do objetivo *</Label>
            <Input placeholder="Ex: Comprar um notebook" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Valor da meta (R$) *</Label>
            <Input inputMode="decimal" placeholder="5.000,00" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Meta para *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map((g) => (
                <button key={g.value} type="button" onClick={() => setIcon(g.value)}
                  className={`p-1.5 rounded-xl transition-all ${icon === g.value ? 'ring-2 ring-accent bg-accent/10' : 'hover:bg-muted'}`}
                  title={g.label}>
                  <GoalIcon icon={g.value} color={icon === g.value ? color : '#94a3b8'} size="sm" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {GOAL_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar Objetivo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
