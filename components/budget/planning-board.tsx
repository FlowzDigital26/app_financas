'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { parseISO, addMonths, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Loader2, Tags, Copy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { PLAN_KINDS, type PlanKind, type BudgetPlanItem } from '@/types'

interface PlanningBoardProps {
  month: string // 'yyyy-MM'
  items: BudgetPlanItem[]
  incomeActual: Record<string, number>
  expenseActual: Record<string, number>
  incomeCategories: string[]
  expenseCategories: string[]
}

interface Row {
  item: BudgetPlanItem
  actual: number
  result: number   // renda: actual-planned ; despesa: planned-actual (positivo = bom)
  pct: number
}

const KIND_LABEL: Record<PlanKind, string> = {
  renda: 'Renda', investimento: 'Investimentos', fixo: 'Fixo', variavel: 'Variável',
}
const KIND_COLOR: Record<PlanKind, string> = {
  renda: '#3aaa6e', investimento: '#06b6d4', fixo: '#f97316', variavel: '#f59e0b',
}
const VALUE_LABEL: Record<PlanKind, string> = {
  renda: 'Valor recebido', investimento: 'Valor investido', fixo: 'Valor gasto', variavel: 'Valor gasto',
}

function pctColor(pct: number, kind: PlanKind) {
  if (kind === 'renda') return pct >= 100 ? 'bg-income' : pct > 0 ? 'bg-income/70' : 'bg-muted-foreground/30'
  return pct >= 100 ? 'bg-expense' : pct >= 85 ? 'bg-gold' : 'bg-income'
}

function ProgressBar({ pct, kind }: { pct: number; kind: PlanKind }) {
  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${pctColor(pct, kind)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

export function PlanningBoard({
  month, items, incomeActual, expenseActual, incomeCategories, expenseCategories,
}: PlanningBoardProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const monthDate = parseISO(`${month}-01`)
  const monthLabel = format(monthDate, 'MMMM/yyyy', { locale: ptBR }).toUpperCase()

  // ── Dialog state (add / edit) ──
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [fKind, setFKind] = useState<PlanKind>('fixo')
  const [fName, setFName] = useState('')
  const [fPlanned, setFPlanned] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  function actualFor(it: BudgetPlanItem) {
    return (it.kind === 'renda' ? incomeActual[it.name] : expenseActual[it.name]) ?? 0
  }

  const rowsByKind = useMemo(() => {
    const map: Record<PlanKind, Row[]> = { renda: [], investimento: [], fixo: [], variavel: [] }
    for (const item of items) {
      const actual = actualFor(item)
      const result = item.kind === 'renda' ? actual - item.planned : item.planned - actual
      const pct = item.planned > 0 ? (actual / item.planned) * 100 : actual > 0 ? 100 : 0
      map[item.kind].push({ item, actual, result, pct })
    }
    return map
  }, [items, incomeActual, expenseActual]) // eslint-disable-line react-hooks/exhaustive-deps

  const plannedRenda = rowsByKind.renda.reduce((s, r) => s + r.item.planned, 0)
  const plannedFixo = rowsByKind.fixo.reduce((s, r) => s + r.item.planned, 0)
  const plannedInvest = rowsByKind.investimento.reduce((s, r) => s + r.item.planned, 0)
  const plannedVariavel = rowsByKind.variavel.reduce((s, r) => s + r.item.planned, 0)
  const plannedSaidas = plannedFixo + plannedInvest + plannedVariavel
  const saldo = plannedRenda - plannedSaidas

  // ── Navigation ──
  function goMonth(delta: number) {
    const target = delta < 0 ? subMonths(monthDate, 1) : addMonths(monthDate, 1)
    router.push(`/planejamento?mes=${format(target, 'yyyy-MM')}`)
  }

  // ── CRUD ──
  function openAdd(kind: PlanKind) {
    setEditId(null); setFKind(kind); setFName(''); setFPlanned('')
    setDialogOpen(true)
  }
  function openEdit(item: BudgetPlanItem) {
    setEditId(item.id); setFKind(item.kind); setFName(item.name); setFPlanned(String(item.planned))
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!fName.trim()) { toast({ title: 'Escolha uma categoria', variant: 'destructive' }); return }
    const planned = parseFloat(fPlanned.replace(',', '.'))
    if (isNaN(planned) || planned < 0) { toast({ title: 'Valor inválido', variant: 'destructive' }); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    let error
    if (editId) {
      ({ error } = await supabase.from('budget_plans')
        .update({ name: fName.trim(), kind: fKind, planned })
        .eq('id', editId))
    } else {
      ({ error } = await supabase.from('budget_plans').upsert({
        user_id: user.id,
        month: `${month}-01`,
        name: fName.trim(),
        kind: fKind,
        planned,
      }, { onConflict: 'user_id,month,name,kind' }))
    }
    setSaving(false)
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); return
    }
    toast({ title: editId ? 'Planejamento atualizado!' : 'Planejamento adicionado!' })
    setDialogOpen(false)
    router.refresh()
  }

  async function handleDelete(item: BudgetPlanItem) {
    if (!confirm(`Remover "${item.name}" do planejamento?`)) return
    const { error } = await supabase.from('budget_plans').delete().eq('id', item.id)
    if (error) { toast({ title: 'Erro ao excluir', variant: 'destructive' }); return }
    toast({ title: 'Removido do planejamento' })
    router.refresh()
  }

  async function copyFromPreviousMonth() {
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); return }
    const prev = format(subMonths(monthDate, 1), 'yyyy-MM-dd')
    const { data: prevItems, error: fetchErr } = await supabase
      .from('budget_plans').select('name, kind, planned').eq('user_id', user.id).eq('month', prev)
    if (fetchErr) { setBusy(false); toast({ title: 'Erro ao buscar mês anterior', variant: 'destructive' }); return }
    if (!prevItems || prevItems.length === 0) {
      setBusy(false); toast({ title: 'Mês anterior está vazio', description: 'Nada para copiar.' }); return
    }
    const rows = prevItems.map((p) => ({
      user_id: user.id, month: `${month}-01`, name: p.name, kind: p.kind, planned: p.planned,
    }))
    const { error } = await supabase.from('budget_plans')
      .upsert(rows, { onConflict: 'user_id,month,name,kind', ignoreDuplicates: true })
    setBusy(false)
    if (error) { toast({ title: 'Erro ao copiar', description: error.message, variant: 'destructive' }); return }
    toast({ title: `${rows.length} itens copiados do mês anterior` })
    router.refresh()
  }

  const dialogCategories = fKind === 'renda' ? incomeCategories : expenseCategories

  // Distribution bar segments (% of planned saídas)
  const segments = plannedSaidas > 0 ? [
    { label: 'Fixo', value: plannedFixo, color: KIND_COLOR.fixo },
    { label: 'Investimento', value: plannedInvest, color: KIND_COLOR.investimento },
    { label: 'Variável', value: plannedVariavel, color: KIND_COLOR.variavel },
  ].filter((s) => s.value > 0) : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">Planejamento</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Defina metas por categoria e acompanhe o realizado do mês
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/categorias">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Tags className="w-3.5 h-3.5" /> Gerenciar categorias
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={copyFromPreviousMonth} disabled={busy}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
            Copiar de outro mês
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => openAdd('fixo')}>
            <Plus className="w-3.5 h-3.5" /> Novo planejamento
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Renda planejada</p>
          <p className="text-xl font-display font-semibold text-income mt-1">{formatCurrency(plannedRenda)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Saídas planejadas</p>
          <p className="text-xl font-display font-semibold text-expense mt-1">{formatCurrency(plannedSaidas)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className={`text-xl font-display font-semibold mt-1 ${saldo >= 0 ? 'text-income' : 'text-expense'}`}>
            {formatCurrency(saldo)}
          </p>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-1.5 w-fit">
        <button onClick={() => goMonth(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Mês anterior">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold px-2 min-w-[140px] text-center">{monthLabel}</span>
        <button onClick={() => goMonth(1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Próximo mês">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Distribution bar */}
      {segments.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-6 w-full rounded-lg overflow-hidden">
            {segments.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-center text-[10px] font-semibold text-white"
                style={{ width: `${(s.value / plannedSaidas) * 100}%`, backgroundColor: s.color }}
                title={`${s.label}: ${formatCurrency(s.value)}`}
              >
                {((s.value / plannedSaidas) * 100) >= 8 && `${((s.value / plannedSaidas) * 100).toFixed(1)}% ${s.label}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      {PLAN_KINDS.map(({ value: kind }) => {
        const rows = rowsByKind[kind]
        const totalPlanned = rows.reduce((s, r) => s + r.item.planned, 0)
        const totalActual = rows.reduce((s, r) => s + r.actual, 0)
        const totalResult = kind === 'renda' ? totalActual - totalPlanned : totalPlanned - totalActual
        return (
          <div key={kind} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: KIND_COLOR[kind] }} />
                <h2 className="text-sm font-semibold">{KIND_LABEL[kind]}</h2>
              </div>
              <button
                onClick={() => openAdd(kind)}
                className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>

            {rows.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 py-4">Nenhuma categoria planejada aqui ainda.</p>
            ) : (
              <div className="divide-y divide-border">
                {/* Column header */}
                <div className="hidden sm:grid grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr_auto] gap-3 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <span>Categoria</span>
                  <span className="text-right">Meta</span>
                  <span className="text-right">{VALUE_LABEL[kind]}</span>
                  <span className="text-right">Resultado</span>
                  <span>Progresso</span>
                  <span className="w-14" />
                </div>
                {rows.map((r) => (
                  <div key={r.item.id} className="grid grid-cols-2 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr_auto] gap-x-3 gap-y-1 px-4 py-2.5 items-center text-sm group">
                    <span className="font-medium truncate">{r.item.name}</span>
                    <span className="text-right text-muted-foreground sm:text-foreground">{formatCurrency(r.item.planned)}</span>
                    <span className="text-right">{formatCurrency(r.actual)}</span>
                    <span className={`text-right font-medium ${r.result >= 0 ? 'text-income' : 'text-expense'}`}>
                      {formatCurrency(r.result)}
                    </span>
                    <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                      <ProgressBar pct={r.pct} kind={kind} />
                      <span className="text-[10px] text-muted-foreground w-9 text-right shrink-0">{r.pct.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-end gap-0.5 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(r.item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-expense hover:bg-expense/10" onClick={() => handleDelete(r.item)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {/* Total row */}
                <div className="grid grid-cols-2 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr_auto] gap-3 px-4 py-2.5 items-center text-sm font-semibold bg-muted/30">
                  <span>Total</span>
                  <span className="text-right">{formatCurrency(totalPlanned)}</span>
                  <span className="text-right">{formatCurrency(totalActual)}</span>
                  <span className={`text-right ${totalResult >= 0 ? 'text-income' : 'text-expense'}`}>{formatCurrency(totalResult)}</span>
                  <span className="hidden sm:block" />
                  <span className="hidden sm:block" />
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar planejamento' : 'Novo planejamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={fKind} onValueChange={(v) => { setFKind(v as PlanKind); setFName('') }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={fName} onValueChange={setFName}>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  {dialogCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Não achou? Crie em <Link href="/categorias" className="text-accent hover:underline">Categorias</Link>.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="planned">Meta (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">R$</span>
                <Input id="planned" inputMode="decimal" placeholder="0,00" value={fPlanned}
                  onChange={(e) => setFPlanned(e.target.value)} className="pl-8" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editId ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
