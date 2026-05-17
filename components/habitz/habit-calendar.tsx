'use client'

import { useState } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  getDay, addMonths, subMonths, isFuture, isToday, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HabitCalendarProps {
  registros: Record<string, boolean>  // 'yyyy-MM-dd' → concluido
  dataInicio: string                  // 'yyyy-MM-dd'
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function HabitCalendar({ registros, dataInicio }: HabitCalendarProps) {
  const [ref, setRef] = useState(new Date())

  const days   = eachDayOfInterval({ start: startOfMonth(ref), end: endOfMonth(ref) })
  const offset = getDay(startOfMonth(ref))  // 0=Sun
  const inicio = parseISO(dataInicio)

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setRef(subMonths(ref, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold capitalize">
          {format(ref, 'MMMM yyyy', { locale: ptBR })}
        </p>
        <button
          onClick={() => setRef(addMonths(ref, 1))}
          disabled={format(addMonths(ref, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Week headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map((d) => (
          <p key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</p>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const future = isFuture(day) && !isToday(day)
          const beforeStart = day < inicio
          const done = registros[key] === true
          const missed = !future && !beforeStart && registros[key] === false
          const noRecord = !future && !beforeStart && registros[key] === undefined

          return (
            <div
              key={key}
              className={cn(
                'aspect-square rounded-lg flex items-center justify-center text-xs font-medium',
                future || beforeStart ? 'text-muted-foreground/30' : '',
                done ? 'bg-accent text-white' : '',
                (missed || noRecord) && !future && !beforeStart ? 'bg-muted/40 text-muted-foreground' : '',
                isToday(day) && !done ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''
              )}
            >
              {done ? '✓' : future || beforeStart ? format(day, 'd') : format(day, 'd')}
            </div>
          )
        })}
      </div>
    </div>
  )
}
