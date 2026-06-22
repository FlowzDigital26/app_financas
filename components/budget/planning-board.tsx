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
import { realizedFor, type ActualMaps } from '@/lib/planning'
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
  actualMaps: ActualMaps
  incomeCategories: string[]
  expenseCategories: string[]
  subsByCategory: Record<string, string[]>
}

interface Row {
  item: BudgetPlanItem
  actual: number
  result: number   // renda: actual-planned ; despesa: planned-actual (positivo = bom)
  pct: number
}

const NONE = '__none__'
const NEW = '__new__'

const KIND_LABEL: Record<PlanKind, string> = {
  renda: 'Renda', investimento: 'Investimentos', fixo: 'Fixo', variavel: 'Variável',
}
const KIND_COLOR: Record<PlanKind, string> = {
  renda: '#3aaa6e', investimento: '#06b6d4', fixo: '#f97316', variavel: '#f59e0b',
}
const VALUE_LABEL: Record<PlanKind, string> = {
  renda: 'Recebido', investimento: 'Investido', fixo: 'Gasto', variavel: 'Gasto',
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

const GRID = 'grid-cols-[1.4fr_1fr_1fr_0.9fr_1fr_1fr_1.1fr_auto]'

export function PlanningBoard({
  month, items, actualMaps, incomeCategories, expenseCategories, subsByCategory,
}: PlanningBoardProps) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const monthDate = parseISO(`${month}-01`)
  const monthLabel = format(monthDate, 'MMMM/yyyy', { locale: ptBR }).toUpperCase()

  // Local copy of subcategories so newly created ones show up immediately
  const [subs, setSubs] = useState<Record<string, string[]>>(subsByCategory)

  // ── Dialog state (add / edit) ──
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [fKind, setFKind] = useState<PlanKind>('fixo')
  const [fLabel, setFLabel] = useState('')
  const [fCategory, setFCategory] = useState('')
  const [fSub, setFSub] = useState('')          // '' = nenhuma
  const [fPlanned, setFPlanned] = useState('')
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const rowsByKind = useMemo(() => {
    const map: Record<PlanKind, Row[]> = { renda: [], investimento: [], fixo: [], variavel: [] }
    for (const item of items) {
      const actual = realizedFor(item, actualMaps)
      const result = item.kind === 'renda' ? actual - item.planned : item.planned - actual
      const pct = item.planned > 0 ? (actual / item.planned) * 100 : actual > 0 ? 100 : 0
      map[item.kind].push({ item, actual, result, pct })
    }
    return map
  }, [items, actualMaps])

  const plannedRenda = rowsByKind.renda.reduce((s, r) => s + r.item.planned, 0)
  const plannedFixo = rowsByKind.fixo.reduce((s, r) => s + r.item.planned, 0)
  const plannedInvest = rowsByKind.investimento.reduce((s, r) => s + r.item.planned, 0)
  const plannedVariavel = rowsByKind.variavel.reduce((s, r) => s + r.item.planned, 0)
  const plannedSaidas = plannedFixo + plannedInvest + plannedVariavel
  const saldo = plannedRenda - plannedSaidas

  function goMonth(delta: number) {
    const target = delta < 0 ? subMonths(monthDate, 1) : addMonths(monthDate, 1)
    router.push(`/planejamento?mes=${format(target, 'yyyy-MM')}`)
  }

  function openAdd(kind: PlanKind) {
    setEditId(null); setFKind(kind); setFLabel(''); setFCategory(''); setFSub(''); setFPlanned('')
    setDialogOpen(true)
  }
  function openEdit(item: BudgetPlanItem) {
    setEditId(item.id); setFKind(item.kind); setFLabel(item.label)
    setFCategory(item.category); setFSub(item.subcategory ?? ''); setFPlanned(String(item.planned))
    setDialogOpen(true)
  }

  const dialogCategories = fKind === 'renda' ? incomeCategories : expenseCategories
  const dialogSubs = fCategory ? (subs[fCategory] ?? []) : []

  async function createSubcategory() {
    if (!fCategory) { toast({ title: 'Escolha uma categoria primeiro', variant: 'destructive' }); return }
    const name = window.prompt(`Nova subcategoria em "${fCategory}":`)?.trim()
    if (!name) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('subcategories')
      .upsert({ user_id: user.id, category_name: fCategory, name }, { onConflict: 'user_id,category_name,name', ignoreDuplicates: true })
    if (error) { toast({ title: 'Erro ao criar subcategoria', description: error.message, variant: 'destructive' }); return }
    setSubs((prev) => {
      const list = prev[fCategory] ?? []
      return list.includes(name) ? prev : { ...prev, [fCategory]: [...list, name].sort() }
    })
    setFSub(name)
    router.refresh()
  }

  async function handleSave() {
    if (!fLabel.trim()) { toast({ title: 'Informe o nome', variant: 'destructive' }); return }
    if (!fCategory) { toast({ title: 'Escolha uma categoria', variant: 'destructive' }); return }
    const planned = parseFloat(fPlanned.replace(',', '.'))
    if (isNaN(planned) || planned < 0) { toast({ title: 'Valor inválido', variant: 'destructive' }); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = {
      kind: fKind,
      label: fLabel.trim(),
      category: fCategory,
      subcategory: fSub || null,
      planned,
    }

    let error
    if (editId) {
      ({ error } = await supabase.from('budget_plans').update(payload).eq('id', editId))
    } else {
      ({ error } = await supabase.from('budget_plans').upsert(
        { user_id: user.id, month: `${month}-01`, ...payload },
        { onConflict: 'user_id,month,kind,label' },
      ))
    }
    setSaving(false)
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); return }
    toast({ title: editId ? 'Planejamento atualizado!' : 'Planejamento adicionado!' })
    setDialogOpen(false)
    router.refresh()
  }

  async function handleDelete(item: BudgetPlanItem) {
    if (!confirm(`Remover "${item.label}" do planejamento?`)) return
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
      .from('budget_plans').select('kind, label, category, subcategory, planned')
      .eq('user_id', user.id).eq('month', prev)
    if (fetchErr) { setBusy(false); toast({ title: 'Erro ao buscar mês anterior', variant: 'destructive' }); return }
    if (!prevItems || prevItems.length === 0) {
      setBusy(false); toast({ title: 'Mês anterior está vazio', description: 'Nada para copiar.' }); return
    }
    const rows = prevItems.map((p) => ({ user_id: user.id, month: `${month}-01`, ...p }))
    const { error } = await supabase.from('budget_plans')
      .upsert(rows, { onConflict: 'user_id,month,kind,label', ignoreDuplicates: true })
    setBusy(false)
    if (error) { toast({ title: 'Erro ao copiar', description: error.message, variant: 'destructive' }); return }
    toast({ title: `${rows.length} itens copiados do mês anterior` })
    router.refresh()
  }

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
      )}

      {/* Sections */}
      {PLAN_KINDS.map(({ value: kind }) => {
        const rows = rowsByKind[kind]
        const totalPlanned = rows.reduce((s, r) => s + r.item.planned, 0)
        const totalActual = rows.reduce((s, r) => s + r.actual, 0)
        const totalResult = kind === 'renda' ? totalActual - totalPlanned : totalPlanned - totalActual
        return (
          <div key={kind} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: KIND_COLOR[kind] }} />
                <h2 className="text-sm font-semibold">{KIND_LABEL[kind]}</h2>
              </div>
              <button onClick={() => openAdd(kind)} className="text-xs font-medium text-accent hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>

            {rows.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 py-4">Nenhuma categoria planejada aqui ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[820px] divide-y divide-border">
                  {/* Column header */}
                  <div className={`grid ${GRID} gap-3 px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider`}>
                    <span>Nome</span>
                    <span>Categoria</span>
                    <span>Subcategoria</span>
                    <span className="text-right">Valor</span>
                    <span className="text-right">{VALUE_LABEL[kind]}</span>
                    <span className="text-right">Resultado</span>
                    <span>Progresso</span>
                    <span className="w-14" />
                  </div>
                  {rows.map((r) => (
                    <div key={r.item.id} className={`grid ${GRID} gap-3 px-4 py-2.5 items-center text-sm group`}>
                      <span className="font-medium truncate" title={r.item.label}>{r.item.label}</span>
                      <span className="text-muted-foreground truncate">{r.item.category}</span>
                      <span className="text-muted-foreground truncate">{r.item.subcategory || '—'}</span>
                      <span className="text-right">{r.item.planned > 0 ? formatCurrency(r.item.planned) : <span className="text-muted-foreground/60">—</span>}</span>
                      <span className="text-right">{formatCurrency(r.actual)}</span>
                      {r.item.planned > 0 ? (
                        <span className={`text-right font-medium ${r.result >= 0 ? 'text-income' : 'text-expense'}`}>
                          {formatCurrency(r.result)}
                        </span>
                      ) : (
                        <span className="text-right text-[11px] text-muted-foreground italic">sem meta</span>
                      )}
                      <div className="flex items-center gap-2">
                        {r.item.planned > 0 ? (
                          <>
                            <ProgressBar pct={r.pct} kind={kind} />
                            <span className="text-[10px] text-muted-foreground w-9 text-right shrink-0">{r.pct.toFixed(0)}%</span>
                          </>
                        ) : (
                          <button onClick={() => openEdit(r.item)} className="text-[10px] text-accent hover:underline">definir meta</button>
                        )}
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
                  <div className={`grid ${GRID} gap-3 px-4 py-2.5 items-center text-sm font-semibold bg-muted/30`}>
                    <span>Total</span>
                    <span /><span />
                    <span className="text-right">{formatCurrency(totalPlanned)}</span>
                    <span className="text-right">{formatCurrency(totalActual)}</span>
                    <span className={`text-right ${totalResult >= 0 ? 'text-income' : 'text-expense'}`}>{formatCurrency(totalResult)}</span>
                    <span /><span />
                  </div>
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
              <Select value={fKind} onValueChange={(v) => { setFKind(v as PlanKind); setFCategory(''); setFSub('') }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLAN_KINDS.map((k) => (<SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-label">Nome</Label>
              <Input id="plan-label" placeholder="Ex: Assinatura do Spotify" value={fLabel}
                onChange={(e) => setFLabel(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={fCategory} onValueChange={(v) => { setFCategory(v); setFSub('') }}>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  {dialogCategories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Não achou? Crie em <Link href="/categorias" className="text-accent hover:underline">Categorias</Link>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Subcategoria <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Select
                value={fSub || NONE}
                onValueChange={(v) => {
                  if (v === NEW) createSubcategory()
                  else if (v === NONE) setFSub('')
                  else setFSub(v)
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Nenhuma —</SelectItem>
                  {dialogSubs.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  <SelectItem value={NEW}>➕ Nova subcategoria…</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Use para detalhar (ex: Spotify). O realizado casa com despesas lançadas nessa subcategoria.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="planned">Valor (R$)</Label>
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
