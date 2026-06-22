'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import {
  DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES,
  PAYMENT_METHODS, PLAN_KINDS,
  type TransactionType, type Transaction, type Category, type PaymentMethod, type PlanKind,
} from '@/types'

interface TransactionFormProps {
  transaction?: Transaction
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function TransactionForm({ transaction, onSuccess, trigger }: TransactionFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [hiddenDefaults, setHiddenDefaults] = useState<string[]>([])
  const [subsByCategory, setSubsByCategory] = useState<Record<string, string[]>>({})
  const router = useRouter()
  const [kind, setKind] = useState<PlanKind>(
    transaction?.kind ?? (transaction?.type === 'income' ? 'renda' : 'variavel'),
  )
  const type: TransactionType = kind === 'renda' ? 'income' : 'expense'
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [category, setCategory] = useState(transaction?.category ?? '')
  const [subcategory, setSubcategory] = useState(transaction?.subcategory ?? '')
  const [date, setDate] = useState(transaction?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(transaction?.payment_method ?? 'pix')
  const [bank, setBank] = useState(transaction?.bank ?? '')
  const { toast } = useToast()
  const supabase = createClient()
  const isEditing = !!transaction

  // Load custom categories + hidden defaults
  useEffect(() => {
    if (!open) return
    async function loadCategories() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: cats }, { data: profile }, { data: subs }] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
        supabase.from('profiles').select('hidden_defaults').eq('id', user.id).maybeSingle(),
        supabase.from('subcategories').select('category_name, name').eq('user_id', user.id).order('name'),
      ])
      setCustomCategories((cats ?? []) as Category[])
      setHiddenDefaults((profile?.hidden_defaults ?? []) as string[])
      const grouped: Record<string, string[]> = {}
      for (const s of (subs ?? []) as { category_name: string; name: string }[]) {
        ;(grouped[s.category_name] ??= []).push(s.name)
      }
      setSubsByCategory(grouped)
    }
    loadCategories()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build categories list: visible defaults + custom, filtered by type
  const defaultCats = (type === 'income'
    ? DEFAULT_INCOME_CATEGORIES
    : DEFAULT_EXPENSE_CATEGORIES
  ).filter((c) => !hiddenDefaults.includes(c.name)).map((c) => c.name)
  const customCats = customCategories
    .filter((c) => c.type === type)
    .map((c) => c.name)
  const allCategories = [...defaultCats, ...customCats]

  function resetForm() {
    setKind('variavel')
    setAmount('')
    setDescription('')
    setCategory('')
    setSubcategory('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setPaymentMethod('pix')
    setBank('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || !description || !category || !date) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }
    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' })
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const payload = {
      type, kind, amount: parsedAmount, description, category,
      subcategory: subcategory || null,
      date,
      payment_method: paymentMethod,
      bank: bank.trim() || null,
      user_id: user.id,
    }

    const { error } = isEditing
      ? await supabase.from('transactions').update(payload).eq('id', transaction.id)
      : await supabase.from('transactions').insert(payload)

    if (error) {
      setLoading(false)
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
      return
    }

    // Cria automaticamente a linha correspondente no Planejamento do mês (meta 0,
    // sem sobrescrever se já existir). Falha aqui não bloqueia a transação.
    const label = subcategory.trim() || category
    const { error: planErr } = await supabase.from('budget_plans').upsert({
      user_id: user.id,
      month: `${date.slice(0, 7)}-01`,
      kind,
      label,
      category,
      subcategory: subcategory || null,
      planned: 0,
    }, { onConflict: 'user_id,month,kind,label', ignoreDuplicates: true })
    if (planErr) console.error('Falha ao criar item no planejamento:', planErr.message)

    setLoading(false)
    toast({ title: isEditing ? 'Transação atualizada!' : 'Transação registrada!' })
    setOpen(false)
    router.refresh()
    onSuccess?.()
    if (!isEditing) resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Transação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo (classificação do planejamento) */}
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLAN_KINDS.map((k) => {
                const active = kind === k.value
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => { setKind(k.value); setCategory(''); setSubcategory('') }}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                      active ? 'text-white border-transparent shadow-sm' : 'text-muted-foreground border-border hover:text-foreground'
                    }`}
                    style={active ? { backgroundColor: k.color } : undefined}
                  >
                    {k.label}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {type === 'income' ? 'Entra como Receita' : 'Entra como Despesa'} · cria a linha no Planejamento automaticamente
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input id="amount" inputMode="decimal" placeholder="0,00" value={amount}
                onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Data *</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição *</Label>
            <Input id="description" placeholder="Ex: Almoço no restaurante" value={description}
              onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory('') }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category && (subsByCategory[category]?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <Label>Subcategoria</Label>
              <Select value={subcategory || '__none__'} onValueChange={(v) => setSubcategory(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nenhuma —</SelectItem>
                  {subsByCategory[category].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Vincula este gasto à subcategoria no Planejamento.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bank">Banco / Origem</Label>
            <Input id="bank" placeholder="Ex: Nubank, Bradesco, Itaú..." value={bank}
              onChange={(e) => setBank(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant={type === 'income' ? 'income' : 'expense'} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
