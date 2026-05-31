'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2,
  X, ChevronDown, RotateCcw, ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, cn } from '@/lib/utils'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types'

const BANKS = [
  'Nubank', 'C6 Bank', 'Itaú', 'Bradesco', 'Banco do Brasil',
  'Santander', 'Caixa Econômica Federal', 'Banco Inter', 'XP Investimentos',
  'BTG Pactual', 'Sicoob', 'Sicredi', 'PicPay', 'Outro',
]

const ALL_CATEGORIES = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, 'Salário', 'Freelance', 'Investimentos'])]

type Step = 'upload' | 'processing' | 'preview' | 'saving' | 'done'

interface ExtractedTx {
  _id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  selected: boolean
}

interface SaveResult {
  saved: number
  income: number
  expense: number
}

export default function ImportarExtratoPage() {
  const [step, setStep]         = useState<Step>('upload')
  const [bank, setBank]         = useState('')
  const [file, setFile]         = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [transactions, setTransactions] = useState<ExtractedTx[]>([])
  const [error, setError]       = useState('')
  const [result, setResult]     = useState<SaveResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  // ── File handling ──────────────────────────────────────────────
  function pickFile(f: File) {
    if (!f.type.includes('pdf') && !f.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: 'Apenas arquivos PDF são aceitos', variant: 'destructive' }); return
    }
    if (f.size > 12 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande (máx. 12 MB)', variant: 'destructive' }); return
    }
    setFile(f)
  }

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Process PDF ────────────────────────────────────────────────
  async function handleProcess() {
    if (!file) { toast({ title: 'Selecione um arquivo PDF', variant: 'destructive' }); return }
    if (!bank) { toast({ title: 'Selecione o banco', variant: 'destructive' }); return }

    setStep('processing')
    setError('')

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bank', bank)

      const res = await fetch('/api/importar-extrato', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) { setError(data.error ?? 'Erro ao processar PDF'); setStep('upload'); return }

      const txs: ExtractedTx[] = data.transactions.map((t: Omit<ExtractedTx, 'selected'>) => ({
        ...t, selected: true,
      }))
      setTransactions(txs)
      setStep('preview')
    } catch {
      setError('Erro de rede. Verifique sua conexão e tente novamente.')
      setStep('upload')
    }
  }

  // ── Transaction editing ────────────────────────────────────────
  function toggleSelect(id: string) {
    setTransactions(prev => prev.map(t => t._id === id ? { ...t, selected: !t.selected } : t))
  }
  function toggleAll(v: boolean) {
    setTransactions(prev => prev.map(t => ({ ...t, selected: v })))
  }
  function setCategory(id: string, cat: string) {
    setTransactions(prev => prev.map(t => t._id === id ? { ...t, category: cat } : t))
  }
  function setType(id: string, type: 'income' | 'expense') {
    setTransactions(prev => prev.map(t => t._id === id ? { ...t, type } : t))
  }

  // ── Save to Supabase ───────────────────────────────────────────
  async function handleSave() {
    const selected = transactions.filter(t => t.selected)
    if (!selected.length) { toast({ title: 'Nenhuma transação selecionada', variant: 'destructive' }); return }

    setStep('saving')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast({ title: 'Sessão expirada. Faça login novamente.', variant: 'destructive' }); setStep('preview'); return }

    const { error: dbError } = await supabase.from('transactions').insert(
      selected.map(t => ({
        user_id: user.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        category: t.category,
        date: t.date,
        payment_method: 'outros' as const,
        bank,
      }))
    )

    if (dbError) {
      toast({ title: 'Erro ao salvar', description: dbError.message, variant: 'destructive' })
      setStep('preview')
      return
    }

    const inc = selected.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const exp = selected.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    setResult({ saved: selected.length, income: inc, expense: exp })
    setStep('done')
  }

  function reset() {
    setStep('upload'); setFile(null); setBank(''); setTransactions([]); setError(''); setResult(null)
  }

  // ── Derived stats ──────────────────────────────────────────────
  const selected = transactions.filter(t => t.selected)
  const allSelected = transactions.length > 0 && transactions.every(t => t.selected)
  const totalIncome = selected.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = selected.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">Importar Extrato</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Faça upload do PDF do seu banco — a IA extrai e categoriza tudo automaticamente
          </p>
        </div>
        {step !== 'upload' && step !== 'done' && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-2 shrink-0">
            <RotateCcw className="w-3.5 h-3.5" /> Recomeçar
          </Button>
        )}
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs">
        {(['upload', 'preview', 'done'] as const).map((s, i) => {
          const labels = ['1. Upload', '2. Revisar', '3. Pronto']
          const done = step === 'done' || (step === 'preview' && i === 0) || (step === 'saving' && i <= 1)
          const active = step === s || (step === 'processing' && s === 'upload') || (step === 'saving' && s === 'preview')
          return (
            <div key={s} className="flex items-center gap-2">
              <span className={cn(
                'px-2.5 py-1 rounded-full font-medium transition-colors',
                done ? 'bg-accent text-white' : active ? 'bg-accent/15 text-accent' : 'bg-muted text-muted-foreground'
              )}>
                {labels[i]}
              </span>
              {i < 2 && <div className="w-4 h-px bg-border" />}
            </div>
          )
        })}
      </div>

      {/* ── Step: Upload ── */}
      {(step === 'upload' || step === 'processing') && (
        <Card>
          <CardContent className="p-6 space-y-5">
            {/* Bank selector */}
            <div className="space-y-1.5">
              <Label>Banco / instituição</Label>
              <Select value={bank} onValueChange={setBank} disabled={step === 'processing'}>
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Selecione o banco..." />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer',
                dragging ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border hover:border-accent/50 hover:bg-muted/30',
                step === 'processing' && 'pointer-events-none opacity-50'
              )}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-accent" />
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  <button
                    className="text-xs text-expense hover:underline mt-1"
                    onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  >
                    <X className="w-3 h-3 inline mr-1" />Remover
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Arraste o PDF aqui ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground">Extrato bancário em formato PDF · Máx. 12 MB</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }} />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-expense/10 border border-expense/20 p-3 text-sm text-expense">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              onClick={handleProcess}
              disabled={!file || !bank || step === 'processing'}
              className="w-full gap-2"
              size="lg"
            >
              {step === 'processing' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analisando PDF com IA... (pode levar até 60s)
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Processar extrato
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              O PDF é enviado diretamente para a IA e <strong>não é armazenado</strong> em nenhum servidor além do seu Supabase.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Step: Preview ── */}
      {(step === 'preview' || step === 'saving') && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Encontradas', value: transactions.length.toString(), sub: 'transações no PDF' },
              { label: 'Selecionadas', value: selected.length.toString(), sub: 'para importar' },
              { label: 'Entradas', value: formatCurrency(totalIncome), sub: '', color: 'text-income' },
              { label: 'Saídas', value: formatCurrency(totalExpense), sub: '', color: 'text-expense' },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                  <p className={cn('text-xl font-semibold', item.color)}>{item.value}</p>
                  {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table */}
          <Card>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => toggleAll(e.target.checked)}
                  className="w-4 h-4 accent-[hsl(var(--accent))] cursor-pointer"
                />
                <p className="text-sm font-medium">{transactions.length} transações extraídas</p>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Revise tipo e categoria antes de salvar
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="w-8 px-4 py-2.5 text-left" />
                    <th className="px-3 py-2.5 text-left whitespace-nowrap">Data</th>
                    <th className="px-3 py-2.5 text-left">Descrição</th>
                    <th className="px-3 py-2.5 text-left">Categoria</th>
                    <th className="px-3 py-2.5 text-left whitespace-nowrap">Tipo</th>
                    <th className="px-3 py-2.5 text-right whitespace-nowrap">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map(tx => (
                    <tr key={tx._id} className={cn(
                      'transition-colors hover:bg-muted/30',
                      !tx.selected && 'opacity-40'
                    )}>
                      {/* Checkbox */}
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={tx.selected}
                          onChange={() => toggleSelect(tx._id)}
                          className="w-4 h-4 accent-[hsl(var(--accent))] cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground text-xs">
                        {tx.date.split('-').reverse().join('/')}
                      </td>

                      {/* Description */}
                      <td className="px-3 py-2.5 max-w-[180px]">
                        <span className="block truncate" title={tx.description}>{tx.description}</span>
                      </td>

                      {/* Category */}
                      <td className="px-3 py-2.5">
                        <div className="relative">
                          <select
                            value={tx.category}
                            onChange={e => setCategory(tx._id, e.target.value)}
                            className="w-full text-xs bg-background border border-input rounded-md px-2 py-1.5 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                          >
                            {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                        </div>
                      </td>

                      {/* Type toggle */}
                      <td className="px-3 py-2.5">
                        <div className="flex rounded-md border border-input overflow-hidden text-xs w-fit">
                          <button
                            onClick={() => setType(tx._id, 'income')}
                            className={cn(
                              'px-2 py-1 transition-colors',
                              tx.type === 'income'
                                ? 'bg-income text-white'
                                : 'bg-background text-muted-foreground hover:text-foreground'
                            )}
                          >
                            Entrada
                          </button>
                          <button
                            onClick={() => setType(tx._id, 'expense')}
                            className={cn(
                              'px-2 py-1 transition-colors border-l border-input',
                              tx.type === 'expense'
                                ? 'bg-expense text-white'
                                : 'bg-background text-muted-foreground hover:text-foreground'
                            )}
                          >
                            Saída
                          </button>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className={cn(
                        'px-3 py-2.5 text-right font-medium whitespace-nowrap',
                        tx.type === 'income' ? 'text-income' : 'text-expense'
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Action bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {selected.length} de {transactions.length} selecionadas para importar
            </p>
            <Button
              onClick={handleSave}
              disabled={selected.length === 0 || step === 'saving'}
              className="gap-2"
              size="lg"
            >
              {step === 'saving' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</>
              ) : (
                <><CheckCircle className="w-4 h-4" />Salvar {selected.length} transações</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: Done ── */}
      {step === 'done' && result && (
        <Card>
          <CardContent className="p-10 flex flex-col items-center text-center gap-5">
            <div className="w-16 h-16 rounded-full bg-income/15 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-income" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold">Importação concluída!</h2>
              <p className="text-muted-foreground mt-1">
                {result.saved} transações de {bank} foram salvas com sucesso.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
              <div className="rounded-xl bg-income/5 border border-income/15 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Entradas</p>
                <p className="text-lg font-semibold text-income">{formatCurrency(result.income)}</p>
              </div>
              <div className="rounded-xl bg-expense/5 border border-expense/15 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Saídas</p>
                <p className="text-lg font-semibold text-expense">{formatCurrency(result.expense)}</p>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button variant="outline" onClick={reset} className="gap-2">
                <Upload className="w-4 h-4" /> Importar outro extrato
              </Button>
              <Button asChild className="gap-2">
                <a href="/extrato"><FileText className="w-4 h-4" /> Ver no extrato</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
