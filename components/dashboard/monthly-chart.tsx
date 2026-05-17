'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { MonthlyData } from '@/types'

interface MonthlyChartProps {
  data: MonthlyData[]
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; fill: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl p-3 shadow-xl text-sm space-y-1.5"
      style={{
        background: 'hsl(var(--primary))',
        border: '1px solid hsl(var(--accent) / 0.35)',
      }}
    >
      <p className="font-semibold capitalize" style={{ color: 'hsl(var(--accent))' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
          <span style={{ color: 'hsl(var(--accent) / 0.7)' }} className="capitalize">{p.name}:</span>
          <span className="font-medium text-white">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  return (
    <Card className="animate-slide-in-5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Receitas × Despesas — Últimos 6 meses</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
            Dados insuficientes para exibir o gráfico
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip
                content={<CustomTooltip />}
                wrapperStyle={{ outline: 'none' }}
                cursor={{ fill: 'hsl(var(--accent) / 0.06)' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs capitalize text-foreground">{value}</span>
                )}
              />
              <Bar dataKey="income" name="Receitas" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Despesas" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
