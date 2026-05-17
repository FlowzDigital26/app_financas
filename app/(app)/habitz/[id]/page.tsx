'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format, startOfYear, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { X, Pencil, Plus, Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { HabitCalendar } from '@/components/habitz/habit-calendar'
import { cn } from '@/lib/utils'

type Habito = {
  id: string; nome: string; icone: string; cor: string
  periodo: string; streak_atual: number; streak_maximo: number
  data_inicio: string; vezes_por_dia: number
}

type Registro = { data: string; concluido: boolean; nota: string | null }

export default function HabitoDetailPage() {
  const params  = useParams()
  const rawId   = params.id
  const id      = Array.isArray(rawId) ? rawId[0] : (rawId ?? '')
  const router  = useRouter()
  const supabase = createClient()

  const [habito, setHabito]       = useState<Habito | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [notaHoje, setNotaHoje]   = useState('')
  const [addingNota, setAddingNota] = useState(false)
  const [savingNota, setSavingNota] = useState(false)
  const [loading, setLoading]     = useState(true)

  const today = format(new Date(), 'yyyy-MM-dd')

  const load = useCallback(async () => {
    const { data: h } = await supabase
      .from('habitos')
      .select('*')
      .eq('id', id)
      .single()

    if (!h) { router.push('/habitz'); return }

    const { data: r } = await supabase
      .from('habito_registros')
      .select('data, concluido, nota')
      .eq('habito_id', id)
      .gte('data', format(startOfYear(new Date()), 'yyyy-MM-dd'))
      .order('data', { ascending: false })

    setHabito(h as Habito)
    setRegistros((r ?? []) as Registro[])
    const todayReg = (r ?? []).find((x) => x.data === today)
    if (todayReg?.nota) setNotaHoje(todayReg.nota)
    setLoading(false)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  /* Stats */
  const regMap: Record<string, boolean> = {}
  registros.forEach((r) => { regMap[r.data] = r.concluido })

  const now = new Date()
  const weekDays   = eachDayOfInterval({ start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) })
  const monthDays  = eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) })
  const semana = weekDays.filter((d) => regMap[format(d, 'yyyy-MM-dd')]).length
  const mes    = monthDays.filter((d) => regMap[format(d, 'yyyy-MM-dd')]).length
  const ano    = registros.filter((r) => r.concluido).length

  async function saveNota() {
    if (!notaHoje.trim()) return
    setSavingNota(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingNota(false); return }

    await supabase.from('habito_registros').upsert({
      habito_id: id,
      user_id:   user.id,
      data:      today,
      nota:      notaHoje.trim(),
    }, { onConflict: 'habito_id,data' })

    setAddingNota(false)
    setSavingNota(false)
    load()
  }

  const notasComConteudo = registros.filter((r) => r.nota)

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!habito) return null

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/habitz')}
          className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-2.5 min-w-0">
          <span className="text-2xl leading-none">{habito.icone}</span>
          <h1 className="text-xl font-display font-bold truncate">{habito.nome}</h1>
        </div>
        <button className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon="🔥" label="Dias em sequência"
          value={habito.streak_atual} valueColor="#F59E0B"
        />
        <StatCard
          icon="👑" label="Maior sequência"
          value={habito.streak_maximo} valueColor="#F59E0B"
        />
        <StatCard icon="📅" label="Essa semana" value={`${semana}/7`} />
        <StatCard icon="📅" label="Esse mês" value={`${mes}/30`} />
        <div className="col-span-2">
          <StatCard icon="📅" label="Esse ano" value={`${ano}/365`} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Esse hábito começou em{' '}
        {format(new Date(habito.data_inicio + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </p>

      {/* Calendar */}
      <div className="bg-[#0E2330] border border-border/60 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold">Histórico</h2>
          <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-accent inline-block" /> Concluído
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-muted/60 inline-block" /> Não feito
            </span>
          </div>
        </div>
        <HabitCalendar registros={regMap} dataInicio={habito.data_inicio} />
      </div>

      {/* Streak highlight */}
      {habito.streak_atual > 0 && (
        <div
          className="flex items-center gap-3 rounded-2xl p-4"
          style={{ backgroundColor: '#F59E0B18', border: '1.5px solid #F59E0B40' }}
        >
          <Flame className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm">
            Você está em uma sequência de{' '}
            <span className="font-bold text-amber-500">{habito.streak_atual} dia{habito.streak_atual !== 1 ? 's' : ''}</span>
            {habito.streak_atual >= habito.streak_maximo && habito.streak_maximo > 0
              ? ' — novo recorde pessoal! 🎉'
              : '. Continue assim!'}
          </p>
        </div>
      )}

      {/* Notes */}
      <div className="bg-[#0E2330] border border-border/60 rounded-2xl p-5 space-y-4 pb-32 lg:pb-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Notas</h2>
          {!addingNota && (
            <button
              onClick={() => setAddingNota(true)}
              className="flex items-center gap-1.5 text-xs text-accent font-medium hover:text-accent/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar nota
            </button>
          )}
        </div>

        {addingNota && (
          <div className="space-y-2">
            <textarea
              value={notaHoje}
              onChange={(e) => setNotaHoje(e.target.value)}
              placeholder="Como foi hoje com esse hábito?"
              className="w-full h-24 bg-background/50 border border-border/60 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent/50 text-foreground placeholder:text-muted-foreground transition-all"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setAddingNota(false)}
                className="flex-1 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveNota}
                disabled={savingNota || !notaHoje.trim()}
                className="flex-1 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {savingNota ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        )}

        {notasComConteudo.length === 0 && !addingNota ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota ainda</p>
        ) : (
          <div className="space-y-2">
            {notasComConteudo.map((r) => (
              <div key={r.data} className="bg-background/30 rounded-xl p-3.5 space-y-1">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  {format(new Date(r.data + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-sm leading-relaxed">{r.nota}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon, label, value, valueColor, className,
}: {
  icon: string; label: string; value: number | string
  valueColor?: string; className?: string
}) {
  return (
    <div className={cn('bg-[#0E2330] border border-border/60 rounded-2xl p-4', className)}>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-lg leading-none">{icon}</span>
        <p className="text-xs text-muted-foreground font-medium leading-tight">{label}</p>
      </div>
      <p
        className="text-2xl font-bold font-display tabular-nums"
        style={valueColor ? { color: valueColor } : {}}
      >
        {value}
      </p>
    </div>
  )
}
