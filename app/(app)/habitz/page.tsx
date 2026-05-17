'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Loader2, Flame, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DaySelector } from '@/components/habitz/day-selector'
import { HabitCard } from '@/components/habitz/habit-card'
import { ProgressRing } from '@/components/habitz/progress-ring'

type Habito = {
  id: string; nome: string; icone: string; cor: string
  periodo: string; horario: string | null; streak_atual: number
  streak_maximo: number; vezes_por_dia: number; ativo: boolean
  data_inicio: string; frequencia: string; dias_semana: string[]
}

type Registro = {
  habito_id: string; concluido: boolean; vezes_concluido: number; humor: number | null
}

type Tab = 'fazer' | 'feito' | 'pulado'

const PERIODO_ORDER = ['manha', 'tarde', 'noite', 'qualquer']
const PERIODO_TITLE: Record<string, string> = {
  manha: '☀️ Manhã', tarde: '🌤️ Tarde', noite: '🌙 Noite', qualquer: '🕐 Qualquer hora',
}

function isDiaAtivo(h: Habito, day: Date): boolean {
  if (h.frequencia === 'diaria') return true
  if (h.frequencia === 'semanal') {
    const MAP: Record<number, string> = { 0:'dom',1:'seg',2:'ter',3:'qua',4:'qui',5:'sab',6:'dom' }
    // js getDay: 0=Sun
    const DAYMAP: Record<number, string> = {0:'dom',1:'seg',2:'ter',3:'qua',4:'qui',5:'sab',6:'dom'}
    return h.dias_semana.includes(DAYMAP[day.getDay()])
  }
  return true
}

export default function HabitzPage() {
  const supabase = createClient()
  const [selected, setSelected] = useState(new Date())
  const [habitos, setHabitos]   = useState<Habito[]>([])
  const [registros, setRegistros] = useState<Record<string, Registro>>({})
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<Tab>('fazer')
  const [humorMap, setHumorMap] = useState<Record<string, number>>({})

  const dateKey = format(selected, 'yyyy-MM-dd')

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: hData } = await supabase
      .from('habitos')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('created_at')

    const ids = (hData ?? []).map((h) => h.id)
    let regMap: Record<string, Registro> = {}
    let humor: Record<string, number> = {}

    if (ids.length) {
      const { data: rData } = await supabase
        .from('habito_registros')
        .select('habito_id, concluido, vezes_concluido, humor, data')
        .eq('user_id', user.id)
        .in('habito_id', ids)
        .gte('data', format(new Date(selected.getFullYear(), selected.getMonth() - 1, 1), 'yyyy-MM-dd'))
        .lte('data', dateKey)

      ;(rData ?? []).forEach((r) => {
        if (r.data === dateKey) regMap[r.habito_id] = r
        if (r.humor) humor[r.data] = r.humor
      })
    }

    setHabitos((hData ?? []) as Habito[])
    setRegistros(regMap)
    setHumorMap(humor)
    setLoading(false)
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function handleToggle(habito: Habito, vezes: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const concluido = vezes >= habito.vezes_por_dia

    await supabase.from('habito_registros').upsert({
      habito_id: habito.id,
      user_id: user.id,
      data: dateKey,
      concluido,
      vezes_concluido: vezes,
      horario_conclusao: concluido ? new Date().toISOString() : null,
    }, { onConflict: 'habito_id,data' })

    // Streak update (only for today)
    if (isToday(selected) && concluido) {
      const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
      const { data: yreg } = await supabase
        .from('habito_registros')
        .select('concluido')
        .eq('habito_id', habito.id)
        .eq('data', yesterday)
        .maybeSingle()

      const newStreak = (yreg?.concluido ? habito.streak_atual : 0) + 1
      const maxStreak = Math.max(newStreak, habito.streak_maximo)
      await supabase.from('habitos').update({
        streak_atual: newStreak, streak_maximo: maxStreak,
      }).eq('id', habito.id)
    } else if (isToday(selected) && !concluido) {
      await supabase.from('habitos').update({ streak_atual: 0 }).eq('id', habito.id)
    }

    setRegistros((prev) => ({
      ...prev,
      [habito.id]: { habito_id: habito.id, concluido, vezes_concluido: vezes, humor: null },
    }))
    setHabitos((prev) => prev.map((h) =>
      h.id === habito.id
        ? { ...h, streak_atual: concluido ? h.streak_atual + 1 : 0 }
        : h
    ))
  }

  // Filter by day and tab
  const dayHabits = habitos.filter((h) => {
    if (new Date(h.data_inicio) > selected) return false
    return isDiaAtivo(h, selected)
  })

  const filtered = dayHabits.filter((h) => {
    const r = registros[h.id]
    const done = r?.concluido ?? false
    if (tab === 'feito')  return done
    if (tab === 'pulado') return false
    return !done  // 'fazer'
  })

  // Group by período
  const grouped: Record<string, Habito[]> = {}
  filtered.forEach((h) => {
    const p = h.periodo ?? 'qualquer'
    grouped[p] = grouped[p] ?? []
    grouped[p].push(h)
  })

  const totalHoje  = dayHabits.length
  const feitosHoje = dayHabits.filter((h) => registros[h.id]?.concluido).length
  const progress   = totalHoje > 0 ? (feitosHoje / totalHoje) * 100 : 0

  const dayLabel = format(selected, "EEEE, dd 'de' MMMM", { locale: ptBR })
  const dayLabelCap = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)
  const restantes = dayHabits.filter((h) => !registros[h.id]?.concluido).length

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">{dayLabelCap}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {restantes === 0 && totalHoje > 0
              ? '🎉 Todos os hábitos concluídos!'
              : `${restantes} hábito${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="shrink-0">
          <ProgressRing value={progress} size={64} stroke={5} />
        </div>
      </div>

      {/* Day selector */}
      <div className="bg-card border border-border rounded-2xl p-3">
        <DaySelector selected={selected} onChange={setSelected} humorMap={humorMap} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 border border-border/50">
        {(['fazer', 'feito', 'pulado'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t ? 'bg-background shadow-sm text-foreground border border-border/60' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'fazer' ? 'A fazer' : t === 'feito' ? 'Feito' : 'Pulado'}
            {t === 'fazer' && restantes > 0 && (
              <span className="ml-1.5 text-xs bg-accent text-white rounded-full px-1.5 py-0.5">{restantes}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : totalHoje === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Sparkles className="w-10 h-10 text-accent mx-auto opacity-50" />
          <div>
            <p className="font-semibold text-foreground">Nenhum hábito cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">Crie seu primeiro hábito para começar</p>
          </div>
          <Link
            href="/habitz/novo"
            className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Criar hábito
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">{tab === 'feito' ? '🎉' : '🌿'}</p>
          <p className="font-medium">
            {tab === 'feito' ? 'Nenhum hábito concluído ainda' : tab === 'pulado' ? 'Nenhum hábito pulado' : 'Todos concluídos!'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {PERIODO_ORDER.filter((p) => grouped[p]?.length).map((periodo) => (
            <div key={periodo}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {PERIODO_TITLE[periodo]}
                </h2>
                <span className="text-xs text-muted-foreground/60">({grouped[periodo].length})</span>
              </div>
              <div className="space-y-2">
                {grouped[periodo].map((h) => {
                  const r = registros[h.id]
                  return (
                    <div key={h.id} className="relative group">
                      <Link
                        href={`/habitz/${h.id}`}
                        className="absolute inset-0 z-0"
                        tabIndex={-1}
                        aria-label={`Ver detalhes de ${h.nome}`}
                      />
                      <div className="relative z-10">
                        <HabitCard
                          id={h.id}
                          nome={h.nome}
                          icone={h.icone}
                          cor={h.cor}
                          periodo={h.periodo}
                          streak={h.streak_atual}
                          horario={h.horario}
                          vezesPorDia={h.vezes_por_dia}
                          vezesConcluido={r?.vezes_concluido ?? 0}
                          onToggle={(vezes) => handleToggle(h, vezes)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Streak summary bar */}
      {totalHoje > 0 && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
          <Flame className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Maior sequência geral:{' '}
            <span className="font-semibold text-foreground">
              {Math.max(...habitos.map((h) => h.streak_maximo), 0)} dias
            </span>
          </p>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50">
        <Link
          href="/habitz/novo"
          className="flex items-center gap-2 bg-accent text-white font-bold px-6 py-3.5 rounded-full shadow-xl shadow-accent/30 hover:bg-accent/90 hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          Novo hábito
        </Link>
      </div>
    </div>
  )
}
