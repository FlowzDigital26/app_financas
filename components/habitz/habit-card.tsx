'use client'

import { useState } from 'react'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HabitCardProps {
  id: string
  nome: string
  icone: string
  cor: string
  periodo: string
  streak: number
  horario?: string | null
  vezesPorDia: number
  vezesConcluido: number
  onToggle: (vezes: number) => Promise<void>
}

const PERIODO_LABEL: Record<string, string> = {
  manha: 'MANHÃ',
  tarde: 'TARDE',
  noite: 'NOITE',
  qualquer: 'QUALQUER HORA',
}

const FREQUENCIA_LABEL = 'TODOS OS DIAS'

export function HabitCard({
  nome, icone, cor, periodo, streak, horario,
  vezesPorDia, vezesConcluido, onToggle,
}: HabitCardProps) {
  const [loading, setLoading] = useState(false)
  const done = vezesConcluido >= vezesPorDia
  const progress = Math.min(vezesConcluido, vezesPorDia)

  async function handleClick() {
    if (loading) return
    setLoading(true)
    const next = done ? 0 : progress + 1
    await onToggle(next)
    setLoading(false)
  }

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 flex items-start gap-4 transition-all duration-300',
        done
          ? 'border-accent/30 bg-accent/5 opacity-80'
          : 'border-border/60 bg-[#0E2330]'
      )}
      style={{ ['--habit-color' as string]: cor }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 mt-0.5"
        style={{ backgroundColor: cor + '22' }}
      >
        {icone}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold tracking-widest text-[#6B7280] uppercase mb-1">
          {FREQUENCIA_LABEL} · {PERIODO_LABEL[periodo] ?? periodo.toUpperCase()}
        </p>
        <p
          className="text-base font-bold leading-tight truncate"
          style={{ color: done ? '#6B7280' : (cor ?? '#F59E0B') }}
        >
          {done && <span className="mr-1.5">✓</span>}
          {nome}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          {streak > 0 && (
            <span className="flex items-center gap-1 text-amber-500 font-medium">
              <Flame className="w-3.5 h-3.5" />
              {streak} {streak === 1 ? 'dia' : 'dias'}
            </span>
          )}
          {horario && (
            <span className="flex items-center gap-1">
              ⏰ {horario.slice(0, 5)}
            </span>
          )}
        </div>
      </div>

      {/* Check button */}
      <button
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'w-11 h-11 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
          'transition-all duration-300 font-semibold text-sm',
          done
            ? 'bg-accent border-accent text-white scale-95'
            : 'border-accent/60 text-muted-foreground hover:border-accent hover:scale-105 active:scale-95'
        )}
        style={done ? {} : { color: cor }}
      >
        {done ? (
          <span className="text-white text-base">✓</span>
        ) : (
          <span className="text-xs">{progress}/{vezesPorDia}</span>
        )}
      </button>
    </div>
  )
}
