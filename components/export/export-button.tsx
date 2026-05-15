'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface ExportButtonProps {
  userId?: string
}

export function ExportButton({ userId }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleExport() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const uid = userId ?? user?.id
    if (!uid) { setLoading(false); return }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false })

    if (!transactions || transactions.length === 0) {
      setLoading(false)
      return
    }

    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)']
    const rows = transactions.map((t) => [
      format(new Date(t.date + 'T00:00:00'), 'dd/MM/yyyy'),
      t.type === 'income' ? 'Receita' : 'Despesa',
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.amount.toFixed(2).replace('.', ','),
    ])

    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const bom = '﻿' // UTF-8 BOM for Excel
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financas-pro-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setLoading(false)
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      <span className="hidden sm:inline">Exportar CSV</span>
    </Button>
  )
}
