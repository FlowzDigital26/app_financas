'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionForm } from '@/components/transactions/transaction-form'
import { ExportButton } from '@/components/export/export-button'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Upload, FileText, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CATEGORY_COLORS, PAYMENT_METHODS, type Transaction, type TransactionType, type PaymentMethod, type MonthlyData } from '@/types'
import { useToast } from '@/components/ui/use-toast'

type TabType = 'expense' | 'income'
type FilterType = 'all' | 'income' | 'expense'
type SortBy = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'created_desc'

function buildPeriods() {
  const now = new Date()
  const periods: { value: string; label: string; start: string; end: string }[] = [
    {
      value: 'year',
      label: `Anual ${now.getFullYear()}`,
      start: format(startOfYear(now), 'yyyy-MM-dd'),
      end: format(endOfYear(now), 'yyyy-MM-dd'),
    },
  ]
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i)
    periods.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
      start: format(startOfMonth(d), 'yyyy-MM-dd'),
      end: format(endOfMonth(d), 'yyyy-MM-dd'),
    })
  }
  return periods
}

const PERIODS = buildPeriods()

// --- CSV import helpers ---
function parseImportCSV(text: string): Array<Record<string, string>> {
  const sep = text.includes(';') ? ';' : ','
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/['"]/g, ''))
  return lines.slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const vals = line.split(sep).map((v) => v.trim().replace(/^["']|["']$/g, ''))
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
      return obj
    })
}

function rowToTransaction(row: Record<string, string>): Partial<{
  type: TransactionType; amount: number; description: string;
  category: string; date: string; payment_method: PaymentMethod; bank: string
}> | null {
  const tipo = (row['tipo'] || row['type'] || '').toLowerCase()
  const type: TransactionType = tipo === 'receita' || tipo === 'income' ? 'income' : 'expense'
  const rawAmount = row['valor'] || row['value'] || row['amount'] || ''
  const amount = parseFloat(rawAmount.replace(',', '.'))
  const description = row['descricao'] || row['description'] || row['desc'] || ''
  const category = row['categoria'] || row['category'] || ''
  const date = row['data'] || row['date'] || ''
  const pm = row['forma_pagamento'] || row['payment_method'] || ''
  const bank = row['banco'] || row['bank'] || ''

  if (!description || !category || !date || isNaN(amount) || amount <= 0) return null
  const validPm = PAYMENT_METHODS.map((p) => p.value).includes(pm as PaymentMethod) ? pm as PaymentMethod : 'outros'
  return { type, amount, description, category, date, payment_method: validPm, bank: bank || undefined }
}

// --- Chart tooltip ---
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; fill: string }>; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-md text-sm space-y-1">
      <p className="font-semibold capitalize">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ExtratoPage() {
  const [tab, setTab] = useState<TabType>('expense')
  const [period, setPeriod] = useState(PERIODS[1].value)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])

  // Filters for transaction list
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterPayment, setFilterPayment] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterBank, setFilterBank] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')

  // CSV import
  const [importOpen, setImportOpen] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importPreview, setImportPreview] = useState<ReturnType<typeof rowToTransaction>[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()
  const supabase = createClient()
  const selectedPeriod = PERIODS.find((p) => p.value === period) ?? PERIODS[1]

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('transactions').select('*').eq('user_id', user.id)
      .gte('date', selectedPeriod.start).lte('date', selectedPeriod.end)
      .order('date', { ascending: false })
    setTransactions((data ?? []) as Transaction[])
    setLoading(false)
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMonthlyData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const now = new Date()
    const result: MonthlyData[] = []
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i)
      const start = format(startOfMonth(d), 'yyyy-MM-dd')
      const end = format(endOfMonth(d), 'yyyy-MM-dd')
      const label = format(d, 'MMM', { locale: ptBR })
      const { data: mTxs = [] } = await supabase
        .from('transactions').select('type, amount').eq('user_id', user.id)
        .gte('date', start).lte('date', end)
      const inc = (mTxs ?? []).filter((t: { type: string }) => t.type === 'income').reduce((s: number, t: { amount: number }) => s + t.amount, 0)
      const exp = (mTxs ?? []).filter((t: { type: string }) => t.type === 'expense').reduce((s: number, t: { amount: number }) => s + t.amount, 0)
      result.push({ month: label, income: inc, expense: exp })
    }
    setMonthlyData(result)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchTransactions() }, [fetchTransactions])
  useEffect(() => { fetchMonthlyData() }, [fetchMonthlyData])

  // Derived stats for the period
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense

  // Category breakdown for the selected tab
  const tabFiltered = transactions.filter((t) => t.type === tab)
  const tabTotal = tabFiltered.reduce((s, t) => s + t.amount, 0)
  const byCategory: Record<string, number> = {}
  tabFiltered.forEach((t) => { byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount })
  const categoryBreakdown = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] ?? '#94a3b8' }))
    .sort((a, b) => b.value - a.value)

  // Filtered + sorted transaction list
  const listFiltered = transactions
    .filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterPayment !== 'all' && (t.payment_method ?? 'outros') !== filterPayment) return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      if (filterBank && !t.bank?.toLowerCase().includes(filterBank.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':   return a.date.localeCompare(b.date)
        case 'amount_desc': return b.amount - a.amount
        case 'amount_asc':  return a.amount - b.amount
        case 'created_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:           return b.date.localeCompare(a.date) // date_desc
      }
    })

  // All categories in the period for the filter dropdown
  const allCats = Array.from(new Set(transactions.map((t) => t.category))).sort()

  // --- CSV import ---
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseImportCSV(text)
      const parsed = rows.map(rowToTransaction)
      setImportPreview(parsed)
    }
    reader.readAsText(file, 'UTF-8')
  }

  async function handleImport() {
    const valid = importPreview.filter(Boolean) as NonNullable<ReturnType<typeof rowToTransaction>>[]
    if (!valid.length) {
      toast({ title: 'Nenhuma linha válida encontrada', variant: 'destructive' }); return
    }
    setImportLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setImportLoading(false); return }
    const { error } = await supabase.from('transactions').insert(
      valid.map((t) => ({ ...t, user_id: user.id }))
    )
    setImportLoading(false)
    if (error) {
      toast({ title: 'Erro ao importar', description: error.message, variant: 'destructive' }); return
    }
    toast({ title: `${valid.length} transações importadas!` })
    setImportOpen(false)
    setImportPreview([])
    if (fileRef.current) fileRef.current.value = ''
    fetchTransactions()
  }

  const validCount = importPreview.filter(Boolean).length
  const invalidCount = importPreview.length - validCount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">Extrato</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{selectedPeriod.label}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="capitalize">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importar CSV</span>
          </Button>
          <ExportButton />
          <TransactionForm onSuccess={fetchTransactions} />
        </div>
      </div>

      {/* Period summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Entradas', value: totalIncome, color: 'text-income' },
          { label: 'Saídas', value: totalExpense, color: 'text-expense' },
          { label: 'Saldo', value: balance, color: balance >= 0 ? 'text-income' : 'text-expense' },
        ].map((item) => (
          <Card key={item.label} className="text-center">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
              <p className={`text-2xl font-semibold ${item.color}`}>{formatCurrency(item.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evolution chart */}
      <Card>
        <div className="px-5 pt-4 pb-1">
          <h2 className="text-sm font-display font-semibold">Evolução Entrada × Saída — Últimos 6 meses</h2>
        </div>
        <CardContent className="pt-2">
          {monthlyData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">
              Carregando...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barSize={16} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={48} />
                <RechartTooltip content={<ChartTooltip />} />
                <Bar dataKey="income" name="Receitas" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Category breakdown + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="flex border-b border-border">
                {(['expense', 'income'] as TabType[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t
                      ? t === 'income' ? 'text-income border-b-2 border-income' : 'text-expense border-b-2 border-expense'
                      : 'text-muted-foreground hover:text-foreground'
                    }`}>
                    {t === 'income' ? 'Entradas' : 'Saídas'}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {loading ? (
                  <div className="py-10 flex items-center justify-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
                  </div>
                ) : categoryBreakdown.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground text-sm">
                    Nenhuma {tab === 'income' ? 'receita' : 'despesa'} no período
                  </p>
                ) : (
                  <div className="space-y-4">
                    {categoryBreakdown.map((cat) => {
                      const pct = tabTotal > 0 ? (cat.value / tabTotal) * 100 : 0
                      return (
                        <div key={cat.name}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="text-sm font-medium">{cat.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold">{formatCurrency(cat.value)}</span>
                              <span className="text-xs text-muted-foreground ml-2">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                          </div>
                        </div>
                      )
                    })}
                    <div className="pt-2 border-t border-border flex justify-between text-sm">
                      <span className="font-medium">Total</span>
                      <span className={`font-semibold ${tab === 'income' ? 'text-income' : 'text-expense'}`}>
                        {formatCurrency(tabTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-[260px]">
              {categoryBreakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {categoryBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color} strokeWidth={0} />
                        ))}
                      </Pie>
                      <RechartTooltip formatter={(val: number) => formatCurrency(val)}
                        contentStyle={{ borderRadius: '0.5rem', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-muted-foreground text-center mt-2">{categoryBreakdown.length} categorias</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center">Sem dados para o gráfico</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transaction list with advanced filters */}
      <Card>
        <div className="p-4 pb-3 border-b border-border space-y-3">
          <h2 className="text-sm font-display font-semibold">
            Todas as transações ({listFiltered.length})
          </h2>
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 items-end">
            {/* Type chips */}
            <div className="flex gap-1">
              {([
                { value: 'all', label: 'Todos' },
                { value: 'income', label: 'Entradas' },
                { value: 'expense', label: 'Saídas' },
              ] as { value: FilterType; label: string }[]).map((opt) => (
                <button key={opt.value} onClick={() => setFilterType(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filterType === opt.value
                    ? opt.value === 'income' ? 'bg-income text-white' : opt.value === 'expense' ? 'bg-expense text-white' : 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Payment method */}
            <Select value={filterPayment} onValueChange={setFilterPayment}>
              <SelectTrigger className="h-7 text-xs w-[150px]">
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meios</SelectItem>
                {PAYMENT_METHODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-7 text-xs w-[150px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {allCats.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Bank search */}
            <div className="relative">
              <Input
                placeholder="Banco / origem"
                value={filterBank}
                onChange={(e) => setFilterBank(e.target.value)}
                className="h-7 text-xs w-[130px] pr-6"
              />
              {filterBank && (
                <button onClick={() => setFilterBank('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="h-7 text-xs w-[160px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Data: mais recente</SelectItem>
                <SelectItem value="date_asc">Data: mais antiga</SelectItem>
                <SelectItem value="amount_desc">Valor: maior primeiro</SelectItem>
                <SelectItem value="amount_asc">Valor: menor primeiro</SelectItem>
                <SelectItem value="created_desc">Ordem de cadastro</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {(filterType !== 'all' || filterPayment !== 'all' || filterCategory !== 'all' || filterBank) && (
              <button onClick={() => { setFilterType('all'); setFilterPayment('all'); setFilterCategory('all'); setFilterBank('') }}
                className="text-xs text-muted-foreground hover:text-foreground underline">
                Limpar filtros
              </button>
            )}
          </div>
        </div>
        <CardContent className="p-2">
          {loading ? (
            <div className="py-10 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : (
            <TransactionList transactions={listFiltered} onRefresh={fetchTransactions} showPaymentInfo />
          )}
        </CardContent>
      </Card>

      {/* Import CSV dialog */}
      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) { setImportPreview([]); if (fileRef.current) fileRef.current.value = '' } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar transações via CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-muted rounded-lg p-4 text-xs space-y-2">
              <p className="font-semibold text-sm flex items-center gap-1.5"><FileText className="w-4 h-4" /> Formato esperado</p>
              <p className="text-muted-foreground">O arquivo deve ter as seguintes colunas (separadas por <code className="bg-background px-1 rounded">;</code> ou <code className="bg-background px-1 rounded">,</code>):</p>
              <div className="bg-background rounded p-2 font-mono text-[11px] overflow-x-auto">
                tipo;valor;descricao;categoria;data;forma_pagamento;banco<br />
                despesa;50,00;Almoço;Alimentação;2024-01-15;pix;Nubank<br />
                receita;3000,00;Salário;Salário;2024-01-05;transferencia;Itaú
              </div>
              <ul className="text-muted-foreground space-y-0.5 list-disc list-inside">
                <li><strong>tipo:</strong> receita ou despesa</li>
                <li><strong>valor:</strong> número (use vírgula ou ponto)</li>
                <li><strong>data:</strong> formato AAAA-MM-DD</li>
                <li><strong>forma_pagamento:</strong> pix, debito, cartao_credito, transferencia, boleto, dinheiro, outros</li>
                <li><strong>banco</strong> e <strong>forma_pagamento</strong> são opcionais</li>
              </ul>
            </div>

            {/* File input */}
            <div className="space-y-1.5">
              <Label>Selecione o arquivo CSV</Label>
              <Input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} />
            </div>

            {/* Preview */}
            {importPreview.length > 0 && (
              <div className="rounded-lg border border-border p-3 text-sm space-y-1">
                <p className="font-medium">
                  {importPreview.length} linhas encontradas —{' '}
                  <span className="text-income">{validCount} válidas</span>
                  {invalidCount > 0 && <span className="text-expense ml-1">· {invalidCount} inválidas (serão ignoradas)</span>}
                </p>
                {validCount > 0 && (
                  <p className="text-xs text-muted-foreground">Clique em "Importar" para inserir as transações válidas.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importLoading}>Cancelar</Button>
            <Button onClick={handleImport} disabled={importLoading || validCount === 0} className="gap-2">
              {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importar {validCount > 0 ? `(${validCount})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
