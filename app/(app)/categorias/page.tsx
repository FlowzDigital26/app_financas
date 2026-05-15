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
  '#3aaa6e', '#22c55e', '#10b981', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#ec4899', '#f59e0b', '#f97316', '#e85c41', '#64748b',
]

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [color, setColor] = useState(COLOR_OPTIONS[0])

  // Edit state
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(COLOR_OPTIONS[0])
  const [editSaving, setEditSaving] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id).order('type').order('name')
    setCategories((data ?? []) as Category[])
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchCategories() }, [fetchCategories])

  async function handleCreate() {
    if (!name.trim()) { toast({ title: 'Informe o nome da categoria', variant: 'destructive' }); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('categories').insert({ user_id: user.id, name: name.trim(), type, color })
    setSaving(false)
    if (error) {
      toast({ title: error.code === '23505' ? 'Categoria já existe' : 'Erro ao salvar', variant: 'destructive' })
      return
    }
    toast({ title: 'Categoria criada!' })
    setCreateOpen(false)
    setName('')
    fetchCategories()
  }

  async function handleEdit() {
    if (!editCat) return
    if (!editName.trim()) { toast({ title: 'Informe o nome da categoria', variant: 'destructive' }); return }
    setEditSaving(true)
    const { error } = await supabase
      .from('categories')
      .update({ name: editName.trim(), color: editColor })
      .eq('id', editCat.id)
    setEditSaving(false)
    if (error) {
      toast({ title: error.code === '23505' ? 'Categoria já existe' : 'Erro ao salvar', variant: 'destructive' })
      return
    }
    toast({ title: 'Categoria atualizada!' })
    setEditCat(null)
    fetchCategories()
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) { toast({ title: 'Erro ao excluir', variant: 'destructive' }); return }
    toast({ title: 'Categoria removida' })
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  function openEdit(cat: Category) {
    setEditCat(cat)
    setEditName(cat.name)
    setEditColor(cat.color)
  }

  const customIncome = categories.filter((c) => c.type === 'income')
  const customExpense = categories.filter((c) => c.type === 'expense')

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
      <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar Categoria</DialogTitle></DialogHeader>
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
            <Button variant="outline" onClick={() => setEditCat(null)} disabled={editSaving}>Cancelar</Button>
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
            {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm flex-1">{cat.name}</span>
                <span className="text-xs text-muted-foreground">padrão</span>
              </div>
            ))}
            {loading ? (
              <div className="py-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : customExpense.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-3 py-2 rounded-lg group hover:bg-muted/50">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm flex-1">{cat.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(cat)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-expense hover:bg-expense/10"
                    onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Income categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-income">Receitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-3 pt-0">
            {DEFAULT_INCOME_CATEGORIES.map((cat) => (
              <div key={cat.name} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm flex-1">{cat.name}</span>
                <span className="text-xs text-muted-foreground">padrão</span>
              </div>
            ))}
            {loading ? (
              <div className="py-2 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : customIncome.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-3 py-2 rounded-lg group hover:bg-muted/50">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-sm flex-1">{cat.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(cat)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-expense hover:bg-expense/10"
                    onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
