'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES, type Category, type TransactionType } from '@/types'

const COLOR_OPTIONS = [
  '#3aaa6e', '#22c55e', '#10b981', '#2ECC9A', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#ec4899', '#f59e0b', '#f97316', '#e85c41', '#64748b',
]

// A default category entry (hardcoded) as a display object
interface DefaultCat { name: string; color: string; type: TransactionType }

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [hiddenDefaults, setHiddenDefaults] = useState<string[]>([])
  const [subsByCategory, setSubsByCategory] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [color, setColor] = useState(COLOR_OPTIONS[0])

  // Edit state (used for both custom and default categories)
  const [editTarget, setEditTarget] = useState<{ cat?: Category; default?: DefaultCat } | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(COLOR_OPTIONS[0])
  const [editSaving, setEditSaving] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const [{ data: cats }, { data: profile }, { data: subs }] = await Promise.all([
      supabase.from('categories').select('*').eq('user_id', user.id).order('type').order('name'),
      supabase.from('profiles').select('hidden_defaults').eq('id', user.id).maybeSingle(),
      supabase.from('subcategories').select('category_name, name').eq('user_id', user.id).order('name'),
    ])
    setCategories((cats ?? []) as Category[])
    setHiddenDefaults((profile?.hidden_defaults ?? []) as string[])
    const grouped: Record<string, string[]> = {}
    for (const s of (subs ?? []) as { category_name: string; name: string }[]) {
      ;(grouped[s.category_name] ??= []).push(s.name)
    }
    setSubsByCategory(grouped)
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll() }, [fetchAll])

  // --- Create custom category ---
  async function handleCreate() {
    if (!name.trim()) { toast({ title: 'Informe o nome da categoria', variant: 'destructive' }); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('categories').insert({ user_id: user.id, name: name.trim(), type, color })
    setSaving(false)
    if (error) {
      toast({ title: error.code === '23505' ? 'Categoria já existe' : 'Erro ao salvar', variant: 'destructive' }); return
    }
    toast({ title: 'Categoria criada!' })
    setCreateOpen(false)
    setName('')
    fetchAll()
  }

  // --- Edit (custom or default) ---
  function openEditCustom(cat: Category) {
    setEditTarget({ cat })
    setEditName(cat.name)
    setEditColor(cat.color)
  }

  function openEditDefault(def: DefaultCat) {
    setEditTarget({ default: def })
    setEditName(def.name)
    setEditColor(def.color)
  }

  async function handleEdit() {
    if (!editTarget || !editName.trim()) {
      toast({ title: 'Informe o nome', variant: 'destructive' }); return
    }
    setEditSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setEditSaving(false); return }

    if (editTarget.cat) {
      // Edit existing custom category
      const { error } = await supabase
        .from('categories')
        .update({ name: editName.trim(), color: editColor })
        .eq('id', editTarget.cat.id)
      setEditSaving(false)
      if (error) {
        toast({ title: error.code === '23505' ? 'Categoria já existe' : 'Erro ao salvar', variant: 'destructive' }); return
      }
    } else if (editTarget.default) {
      const originalName = editTarget.default.name
      const catType = editTarget.default.type
      // Upsert a custom category with the new name/color
      const { error } = await supabase.from('categories').upsert(
        { user_id: user.id, name: editName.trim(), type: catType, color: editColor },
        { onConflict: 'user_id,name,type' }
      )
      if (error) {
        setEditSaving(false)
        toast({ title: error.code === '23505' ? 'Categoria já existe' : 'Erro ao salvar', variant: 'destructive' }); return
      }
      // Hide the original default
      if (!hiddenDefaults.includes(originalName)) {
        const newHidden = [...hiddenDefaults, originalName]
        await supabase.from('profiles').upsert({ id: user.id, hidden_defaults: newHidden, updated_at: new Date().toISOString() })
        setHiddenDefaults(newHidden)
      }
      setEditSaving(false)
    }

    toast({ title: 'Categoria atualizada!' })
    setEditTarget(null)
    fetchAll()
  }

  // --- Delete custom category ---
  async function handleDeleteCustom(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) { toast({ title: 'Erro ao excluir', variant: 'destructive' }); return }
    toast({ title: 'Categoria removida' })
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  // --- Delete (hide) default category ---
  async function handleDeleteDefault(name: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const newHidden = [...hiddenDefaults, name]
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, hidden_defaults: newHidden, updated_at: new Date().toISOString(),
    })
    if (error) {
      toast({
        title: 'Execute a migração 004 no Supabase',
        description: 'Rode o SQL da migration 004_hidden_defaults.sql no SQL Editor do Supabase.',
        variant: 'destructive',
      }); return
    }
    setHiddenDefaults(newHidden)
    toast({ title: 'Categoria ocultada' })
  }

  // Visible default lists (filter out hidden ones)
  const visibleExpenseDefs = DEFAULT_EXPENSE_CATEGORIES.filter((c) => !hiddenDefaults.includes(c.name))
  const visibleIncomeDefs = DEFAULT_INCOME_CATEGORIES.filter((c) => !hiddenDefaults.includes(c.name))
  const customExpense = categories.filter((c) => c.type === 'expense')
  const customIncome = categories.filter((c) => c.type === 'income')

  // ── Subcategorias (criar / editar / excluir) ──
  async function addSub(categoryName: string) {
    const name = window.prompt(`Nova subcategoria em "${categoryName}":`)?.trim()
    if (!name) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('subcategories')
      .upsert({ user_id: user.id, category_name: categoryName, name }, { onConflict: 'user_id,category_name,name', ignoreDuplicates: true })
    if (error) { toast({ title: 'Erro ao criar subcategoria', description: error.message, variant: 'destructive' }); return }
    setSubsByCategory((prev) => {
      const list = prev[categoryName] ?? []
      return list.includes(name) ? prev : { ...prev, [categoryName]: [...list, name].sort() }
    })
    toast({ title: 'Subcategoria criada!' })
  }

  async function renameSub(categoryName: string, oldName: string) {
    const name = window.prompt(`Renomear "${oldName}":`, oldName)?.trim()
    if (!name || name === oldName) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('subcategories')
      .update({ name }).eq('user_id', user.id).eq('category_name', categoryName).eq('name', oldName)
    if (error) { toast({ title: error.code === '23505' ? 'Já existe' : 'Erro ao renomear', variant: 'destructive' }); return }
    // Mantém transações e planejamento vinculados ao novo nome
    await supabase.from('transactions').update({ subcategory: name })
      .eq('user_id', user.id).eq('category', categoryName).eq('subcategory', oldName)
    await supabase.from('budget_plans').update({ subcategory: name })
      .eq('user_id', user.id).eq('category', categoryName).eq('subcategory', oldName)
    setSubsByCategory((prev) => ({
      ...prev,
      [categoryName]: (prev[categoryName] ?? []).map((s) => (s === oldName ? name : s)).sort(),
    }))
    toast({ title: 'Subcategoria renomeada!' })
  }

  async function deleteSub(categoryName: string, name: string) {
    if (!confirm(`Excluir a subcategoria "${name}"?`)) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('subcategories')
      .delete().eq('user_id', user.id).eq('category_name', categoryName).eq('name', name)
    if (error) { toast({ title: 'Erro ao excluir', variant: 'destructive' }); return }
    setSubsByCategory((prev) => ({
      ...prev,
      [categoryName]: (prev[categoryName] ?? []).filter((s) => s !== name),
    }))
    toast({ title: 'Subcategoria removida' })
  }

  const CategorySubs = ({ categoryName }: { categoryName: string }) => {
    const list = subsByCategory[categoryName] ?? []
    return (
      <div className="pl-6 pr-1 pb-1 flex flex-wrap items-center gap-1.5">
        {list.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 text-[11px] bg-muted rounded-full pl-2 pr-1 py-0.5">
            <button className="hover:underline" onClick={() => renameSub(categoryName, s)} title="Renomear">{s}</button>
            <button className="text-muted-foreground hover:text-expense" onClick={() => deleteSub(categoryName, s)} title="Excluir">
              <Trash2 className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          onClick={() => addSub(categoryName)}
          className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
        >
          <Plus className="w-3 h-3" /> subcategoria
        </button>
      </div>
    )
  }

  const ColorPicker = ({ value, onChange }: { value: string; onChange: (c: string) => void }) => (
    <div className="flex flex-wrap gap-2">
      {COLOR_OPTIONS.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full transition-transform ${value === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
          style={{ backgroundColor: c }} />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas categorias de receitas e despesas</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Nova Categoria</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                {(['expense', 'income'] as TransactionType[]).map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className={`py-2 px-3 rounded-md text-sm font-medium transition-all ${type === t ? (t === 'income' ? 'bg-income text-white shadow-sm' : 'bg-expense text-white shadow-sm') : 'text-muted-foreground hover:text-foreground'}`}>
                    {t === 'income' ? 'Receita' : 'Despesa'}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input placeholder="Ex: Farmácia" value={name} onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
              </div>
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <ColorPicker value={color} onChange={setColor} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEdit()} />
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <ColorPicker value={editColor} onChange={setEditColor} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editSaving}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={editSaving}>
              {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-expense">Despesas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-3 pt-0">
            {visibleExpenseDefs.map((cat) => (
              <div key={cat.name} className="rounded-lg group hover:bg-muted/50">
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm flex-1">{cat.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDefault({ name: cat.name, color: cat.color, type: 'expense' })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-expense hover:bg-expense/10"
                      onClick={() => handleDeleteDefault(cat.name)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <CategorySubs categoryName={cat.name} />
              </div>
            ))}
            {loading ? (
              <div className="py-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : customExpense.map((cat) => (
              <div key={cat.id} className="rounded-lg group hover:bg-muted/50">
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm flex-1">{cat.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditCustom(cat)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-expense hover:bg-expense/10"
                      onClick={() => handleDeleteCustom(cat.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <CategorySubs categoryName={cat.name} />
              </div>
            ))}
            {visibleExpenseDefs.length === 0 && customExpense.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground px-3 py-2">Nenhuma categoria de despesa</p>
            )}
          </CardContent>
        </Card>

        {/* Income categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-income">Receitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-3 pt-0">
            {visibleIncomeDefs.map((cat) => (
              <div key={cat.name} className="rounded-lg group hover:bg-muted/50">
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm flex-1">{cat.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditDefault({ name: cat.name, color: cat.color, type: 'income' })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-expense hover:bg-expense/10"
                      onClick={() => handleDeleteDefault(cat.name)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <CategorySubs categoryName={cat.name} />
              </div>
            ))}
            {loading ? (
              <div className="py-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : customIncome.map((cat) => (
              <div key={cat.id} className="rounded-lg group hover:bg-muted/50">
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm flex-1">{cat.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditCustom(cat)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-expense hover:bg-expense/10"
                      onClick={() => handleDeleteCustom(cat.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <CategorySubs categoryName={cat.name} />
              </div>
            ))}
            {visibleIncomeDefs.length === 0 && customIncome.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground px-3 py-2">Nenhuma categoria de receita</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
