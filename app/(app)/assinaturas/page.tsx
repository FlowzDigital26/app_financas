'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, addDays, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, Repeat2, Loader2, MoreHorizontal,
  Calendar, CreditCard, Trash2, Pencil, TrendingDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { PAYMENT_METHODS, type PaymentMethod } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

type Cycle = 'monthly' | 'yearly' | 'weekly'

// A subscription is derived from grouped transactions (category = Assinaturas)
type Subscription = {
  id: string           // transaction id of the most-recent payment
  name: string         // description
  amount: number       // most-recent amount
  cycle: Cycle
  paymentMethod?: PaymentMethod
  bank?: string
  lastDate: string     // most-recent date
  payments: number     // count
}

const CYCLES: { value: Cycle; label: string; days: number }[] = [
  { value: 'monthly', label: 'Mensal', days: 30 },
  { value: 'yearly',  label: 'Anual',  days: 365 },
  { value: 'weekly',  label: 'Semanal', days: 7 },
]

function nextPaymentDate(lastDate: string, cycle: Cycle) {
  const d = new Date(lastDate + 'T12:00:00')
  if (cycle === 'monthly') return addMonths(d, 1)
  if (cycle === 'yearly')  return addMonths(d, 12)
  return addDays(d, 7)
}

function monthlyAmount(amount: number, cycle: Cycle) {
  if (cycle === 'yearly') return amount / 12
  if (cycle === 'weekly')  return amount * 4.33
  return amount
}

// Known service → brand color map (expandable)
const BRAND_COLORS: Record<string, string> = {
  spotify:  '#1DB954',
  netflix:  '#E50914',
  amazon:   '#FF9900',
  apple:    '#555555',
  youtube:  '#FF0000',
  microsoft:'#00A4EF',
  adobe:    '#FF0000',
  google:   '#4285F4',
  dropbox:  '#0061FF',
  github:   '#181717',
  notion:   '#000000',
  slack:    '#4A154B',
  zoom:     '#2D8CFF',
  linkedin: '#0A66C2',
  nubank:   '#820AD1',
  default:  '#6366f1',
}

function brandColor(name: string) {
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(BRAND_COLORS)) {
    if (lower.includes(k)) return v
  }
  return BRAND_COLORS.default
}

function brandInitial(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

type FormState = {
  name: string
  amount: string
  cycle: Cycle
  paymentMethod: PaymentMethod
  bank: string
  lastDate: string
}

const EMPTY_FORM: FormState = {
  name: '',
  amount: '',
  cycle: 'monthly',
  paymentMethod: 'cartao_credito',
  bank: '',
  lastDate: format(new Date(), 'yyyy-MM-dd'),
}

export default function AssinaturasPage() {
  const supabase = createClient()
  const { toast } = useToast()

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // Fetch transactions with category = Assinaturas, group by description
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('category', 'Assinaturas')
      .eq('type', 'expense')
      .order('date', { ascending: false })

    // Group by description
    const grouped: Record<string, typeof data[0][]> = {}
    for (const tx of data ?? []) {
      const key = tx.description.trim().toLowerCase()
      grouped[key] = grouped[key] ?? []
      grouped[key].push(tx)
    }

    const subs: Subscription[] = Object.values(grouped).map((txs) => {
      const latest = txs[0] // already sorted desc
      return {
        id: latest.id,
        name: latest.description,
        amount: latest.amount,
        cycle: 'monthly',
        paymentMethod: latest.payment_method,
        bank: latest.bank,
        lastDate: latest.date,
        payments: txs.length,
      }
    })

    // Sort by amount desc
    subs.sort((a, b) => b.amount - a.amount)
    setSubscriptions(subs)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSubscriptions() }, [fetchSubscriptions])

  // Summary stats
  const monthlyTotal = subscriptions.reduce((s, sub) => s + monthlyAmount(sub.amount, sub.cycle), 0)
  const annualTotal  = monthlyTotal * 12
  const avgPerSub    = subscriptions.length ? monthlyTotal / subscriptions.length : 0

  function openAdd() {
    setEditingSub(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(sub: Subscription) {
    setEditingSub(sub)
    setForm({
      name: sub.name,
      amount: String(sub.amount),
      cycle: sub.cycle,
      paymentMethod: sub.paymentMethod ?? 'cartao_credito',
      bank: sub.bank ?? '',
      lastDate: sub.lastDate,
    })
    setMenuOpen(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (!form.name.trim() || isNaN(amount) || amount <= 0) {
      toast({ title: 'Preencha nome e valor corretamente', variant: 'destructive' }); return
    }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (editingSub) {
      // Update the most-recent transaction that represents this subscription
      const { error } = await supabase
        .from('transactions')
        .update({
          description: form.name.trim(),
          amount,
          payment_method: form.paymentMethod,
          bank: form.bank || null,
          date: form.lastDate,
        })
        .eq('id', editingSub.id)
      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
        setSaving(false); return
      }
      toast({ title: 'Assinatura atualizada!' })
    } else {
      // Insert new transaction as a subscription record
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'expense',
        category: 'Assinaturas',
        description: form.name.trim(),
        amount,
        payment_method: form.paymentMethod,
        bank: form.bank || null,
        date: form.lastDate,
      })
      if (error) {
        toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' })
        setSaving(false); return
      }
      toast({ title: 'Assinatura adicionada!' })
    }

    setSaving(false)
    setDialogOpen(false)
    fetchSubscriptions()
  }

  async function handleDelete(sub: Subscription) {
    setMenuOpen(null)
    if (!confirm(`Remover "${sub.name}" do histórico de assinaturas?`)) return

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', sub.id)

    if (error) {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' }); return
    }
    toast({ title: 'Assinatura removida' })
    fetchSubscriptions()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold flex items-center gap-2">
            <Repeat2 className="w-6 h-6 text-accent" />
            Assinaturas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detectadas automaticamente do extrato · categoria "Assinaturas"
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Adicionar
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Ativas',            value: `${subscriptions.length}`, sub: 'assinaturas' },
          { label: 'Gasto mensal',      value: formatCurrency(monthlyTotal), sub: 'estimado' },
          { label: 'Projeção anual',    value: formatCurrency(annualTotal), sub: 'total/ano', highlight: true },
          { label: 'Média / serviço',   value: formatCurrency(avgPerSub), sub: 'por mês' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-xl font-bold ${s.highlight ? 'text-expense' : 'text-foreground'}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : subscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Repeat2 className="w-7 h-7 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">Nenhuma assinatura encontrada</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Adicione transações com categoria "Assinaturas" no extrato, ou clique em "Adicionar" para registrar manualmente.
              </p>
            </div>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar assinatura
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub) => {
            const color = brandColor(sub.name)
            const next  = nextPaymentDate(sub.lastDate, sub.cycle)
            const daysUntil = differenceInDays(next, new Date())
            const cycle = CYCLES.find((c) => c.value === sub.cycle)

            return (
              <Card key={sub.id} className="group">
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Brand avatar */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    {brandInitial(sub.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{sub.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Próx: {format(next, "dd 'de' MMM", { locale: ptBR })}
                        {daysUntil >= 0 && daysUntil <= 7 && (
                          <span className="ml-1 text-expense font-medium">({daysUntil === 0 ? 'hoje' : `em ${daysUntil}d`})</span>
                        )}
                      </span>
                      <span>· {sub.payments} {sub.payments === 1 ? 'pagamento' : 'pagamentos'}</span>
                      {sub.bank && (
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> {sub.bank}
                        </span>
                      )}
                      {cycle && <span>· {cycle.label}</span>}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-foreground text-lg">
                      {formatCurrency(sub.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /{cycle?.label.toLowerCase() ?? 'mês'}
                    </p>
                    {sub.cycle !== 'monthly' && (
                      <p className="text-xs text-muted-foreground">
                        ≈ {formatCurrency(monthlyAmount(sub.amount, sub.cycle))}/mês
                      </p>
                    )}
                  </div>

                  {/* Menu */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuOpen(menuOpen === sub.id ? null : sub.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen === sub.id && (
                      <div className="absolute right-0 top-8 z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[140px]">
                        <button
                          onClick={() => openEdit(sub)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Editar
                        </button>
                        <button
                          onClick={() => handleDelete(sub)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-expense hover:bg-expense/5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remover
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Annual cost bar */}
      {subscriptions.length > 0 && (
        <Card className="bg-expense/5 border-expense/20">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-expense shrink-0" />
            <div>
              <p className="text-sm font-semibold text-expense">
                Você gasta <strong>{formatCurrency(annualTotal)}</strong> por ano em assinaturas
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Equivalente a {formatCurrency(monthlyTotal)}/mês em {subscriptions.length} serviços
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingSub(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSub ? 'Editar assinatura' : 'Nova assinatura'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do serviço</Label>
              <Input
                placeholder="ex: Spotify, Netflix, Claude Pro…"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ciclo</Label>
                <Select value={form.cycle} onValueChange={(v) => setForm((f) => ({ ...f, cycle: v as Cycle }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CYCLES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Forma de pagamento</Label>
              <Select value={form.paymentMethod} onValueChange={(v) => setForm((f) => ({ ...f, paymentMethod: v as PaymentMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Banco / cartão</Label>
                <Input
                  placeholder="ex: Nubank"
                  value={form.bank}
                  onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data do último pagamento</Label>
                <Input
                  type="date"
                  value={form.lastDate}
                  onChange={(e) => setForm((f) => ({ ...f, lastDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingSub ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Click-outside to close menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  )
}
