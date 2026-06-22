'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TransactionForm } from './transaction-form'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CATEGORY_COLORS, PAYMENT_METHODS, type Transaction } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

const PAYMENT_LABEL: Record<string, string> = Object.fromEntries(
  PAYMENT_METHODS.map((p) => [p.value, p.label])
)

interface TransactionListProps {
  transactions: Transaction[]
  onRefresh?: () => void
  showPaymentInfo?: boolean
}

export function TransactionList({ transactions, onRefresh, showPaymentInfo }: TransactionListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const { error } = await supabase.from('transactions').delete().eq('id', deleteId)
    setDeleting(false)
    setDeleteId(null)
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Transação excluída' })
    router.refresh()
    onRefresh?.()
  }

  if (transactions.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
          <TrendingDown className="w-7 h-7 text-muted-foreground/50" />
        </div>
        <p className="font-medium">Nenhuma transação encontrada</p>
        <p className="text-sm mt-1">Adicione sua primeira transação clicando no botão acima</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-1">
        {transactions.map((tx, i) => {
          const isIncome = tx.type === 'income'
          const catColor = CATEGORY_COLORS[tx.category] ?? '#94a3b8'
          const paymentLabel = tx.payment_method ? PAYMENT_LABEL[tx.payment_method] : null
          return (
            <div
              key={tx.id}
              className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-muted/60 transition-colors group"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: catColor + '20' }}
              >
                {isIncome
                  ? <TrendingUp className="w-4 h-4" style={{ color: catColor }} />
                  : <TrendingDown className="w-4 h-4" style={{ color: catColor }} />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tx.name || tx.description}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4"
                    style={{ borderColor: catColor + '40', color: catColor }}
                  >
                    {tx.category}
                  </Badge>
                  {showPaymentInfo && paymentLabel && (
                    <span className="text-[10px] text-muted-foreground">
                      {paymentLabel}{tx.bank ? ` · ${tx.bank}` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${isIncome ? 'text-income' : 'text-expense'}`}>
                  {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <TransactionForm
                  transaction={tx}
                  onSuccess={onRefresh}
                  trigger={
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-expense hover:text-expense hover:bg-expense/10"
                  onClick={() => setDeleteId(tx.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir transação?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
