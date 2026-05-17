'use client'

import { addDays, format, isSameDay, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const HUMOR_EMOJI: Record<number, string> = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }

interface DaySelectorProps {
  selected: Date
  onChange: (d: Date) => void
  humorMap?: Record<string, number>  // 'yyyy-MM-dd' → humor 1-5
}

export function DaySelector({ selected, onChange, humorMap = {} }: DaySelectorProps) {
  // Center window around selected day
  const days = Array.from({ length: 7 }, (_, i) => addDays(selected, i - 3))

  function prev() { onChange(addDays(selected, -1)) }
  function next() {
    const next = addDays(selected, 1)
    if (next <= new Date()) onChange(next)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={prev}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex gap-1 flex-1 justify-center">
        {days.map((day) => {
          const active = isSameDay(day, selected)
          const future = day > new Date()
          const key = format(day, 'yyyy-MM-dd')
          const humor = humorMap[key]
          const today = isToday(day)

          return (
            <button
              key={key}
              disabled={future}
              onClick={() => !future && onChange(day)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 transition-all min-w-[44px]',
                active
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : future
                  ? 'opacity-30 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className="text-[10px] font-medium uppercase">
                {format(day, 'EEE', { locale: ptBR }).slice(0, 3)}
              </span>
              <span className={cn('text-sm font-bold', today && !active && 'text-accent')}>
                {format(day, 'd')}
              </span>
              <span className="text-xs leading-none h-3.5">
                {humor ? HUMOR_EMOJI[humor] : today ? '·' : ''}
              </span>
            </button>
          )
        })}
      </div>

      <button
        onClick={next}
        disabled={isSameDay(selected, new Date())}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
