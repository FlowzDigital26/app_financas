'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const ICONES = ['⭐', '🏃', '💧', '📚', '🧘', '💪', '🍎', '😴', '✍️', '🎯', '💰', '🧠']
const CORES = [
  '#2ECC9A', '#F59E0B', '#3B82F6', '#EF4444',
  '#8B5CF6', '#EC4899', '#10B981', '#F97316',
  '#06B6D4', '#84CC16',
]
const DIAS = [
  { key: 'seg', label: 'Seg' }, { key: 'ter', label: 'Ter' },
  { key: 'qua', label: 'Qua' }, { key: 'qui', label: 'Qui' },
  { key: 'sex', label: 'Sex' }, { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' },
]

type Form = {
  nome: string; icone: string; cor: string; descricao: string
  dataInicio: 'hoje' | 'amanha' | 'custom'; dataCustom: string
  frequencia: 'diaria' | 'semanal' | 'quinzenal' | 'mensal'
  diasSemana: string[]; vezesPorDia: number
  periodo: 'manha' | 'tarde' | 'noite' | 'personalizado'; horario: string
}

type Patch = <K extends keyof Form>(k: K, v: Form[K]) => void

const STEP_LABELS = ['Identidade', 'Quando começa', 'Frequência', 'Horário', 'Revisão']

export default function NovoHabitoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Form>({
    nome: '', icone: '⭐', cor: '#2ECC9A', descricao: '',
    dataInicio: 'hoje', dataCustom: format(new Date(), 'yyyy-MM-dd'),
    frequencia: 'diaria', diasSemana: ['seg', 'ter', 'qua', 'qui', 'sex'],
    vezesPorDia: 1, periodo: 'manha', horario: '08:00',
  })

  const patch: Patch = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  function toggleDia(d: string) {
    setForm((p) => ({
      ...p,
      diasSemana: p.diasSemana.includes(d)
        ? p.diasSemana.filter((x) => x !== d)
        : [...p.diasSemana, d],
    }))
  }

  async function handleCreate() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const dataInicio =
      form.dataInicio === 'hoje'   ? format(new Date(), 'yyyy-MM-dd') :
      form.dataInicio === 'amanha' ? format(addDays(new Date(), 1), 'yyyy-MM-dd') :
      form.dataCustom

    await supabase.from('habitos').insert({
      user_id:       user.id,
      nome:          form.nome.trim(),
      icone:         form.icone,
      cor:           form.cor,
      descricao:     form.descricao.trim() || null,
      data_inicio:   dataInicio,
      frequencia:    form.frequencia,
      dias_semana:   form.frequencia === 'semanal' ? form.diasSemana : [],
      vezes_por_dia: form.vezesPorDia,
      periodo:       form.periodo === 'personalizado' ? 'qualquer' : form.periodo,
      horario:       form.periodo === 'personalizado' ? form.horario + ':00' : null,
    })
    router.push('/habitz')
  }

  const canAdvance = step === 0 ? form.nome.trim().length > 0 : true
  const isLast = step === STEP_LABELS.length - 1

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => step === 0 ? router.back() : setStep((s) => s - 1)}
          className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          {step === 0 ? <X className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">
            Passo {step + 1} de {STEP_LABELS.length}
          </p>
          <h1 className="text-xl font-display font-bold">{STEP_LABELS[step]}</h1>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
        />
      </div>

      {/* Step card */}
      <div className="bg-[#0E2330] border border-border/60 rounded-2xl p-6">
        {step === 0 && <S1Identidade  form={form} patch={patch} />}
        {step === 1 && <S2Inicio      form={form} patch={patch} />}
        {step === 2 && <S3Frequencia  form={form} patch={patch} toggleDia={toggleDia} />}
        {step === 3 && <S4Horario     form={form} patch={patch} />}
        {step === 4 && <S5Revisao     form={form} />}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-24 lg:pb-0">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 py-3.5 rounded-xl border border-border font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            Voltar
          </button>
        )}
        <button
          onClick={isLast ? handleCreate : () => setStep((s) => s + 1)}
          disabled={!canAdvance || saving}
          className={cn(
            'flex-1 py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2',
            canAdvance && !saving
              ? 'bg-accent text-white shadow-lg shadow-accent/25 hover:bg-accent/90 active:scale-[0.98]'
              : 'bg-muted/60 text-muted-foreground cursor-not-allowed'
          )}
        >
          {isLast
            ? (saving ? 'Criando...' : 'Criar hábito 🎯')
            : (<>Continuar <ChevronRight className="w-4 h-4" /></>)
          }
        </button>
      </div>
    </div>
  )
}

/* ─── Step 1: Identidade ─── */
function S1Identidade({ form, patch }: { form: Form; patch: Patch }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Nome do hábito
        </label>
        <input
          type="text"
          value={form.nome}
          onChange={(e) => patch('nome', e.target.value)}
          placeholder="Ex: Beber 2 litros de água"
          className="w-full bg-background/40 border border-border/60 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted-foreground/50 transition-all"
          autoFocus
          maxLength={60}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Ícone
        </label>
        <div className="grid grid-cols-6 gap-2">
          {ICONES.map((ic) => (
            <button
              key={ic}
              onClick={() => patch('icone', ic)}
              className={cn(
                'aspect-square rounded-xl text-2xl flex items-center justify-center transition-all',
                form.icone === ic
                  ? 'bg-accent/20 border-2 border-accent scale-110'
                  : 'bg-muted/40 border-2 border-transparent hover:bg-muted hover:scale-105'
              )}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Cor
        </label>
        <div className="flex flex-wrap gap-2.5">
          {CORES.map((c) => (
            <button
              key={c}
              onClick={() => patch('cor', c)}
              className={cn(
                'w-9 h-9 rounded-full transition-all',
                form.cor === c
                  ? 'scale-125 ring-2 ring-white/30 ring-offset-2 ring-offset-[#0E2330]'
                  : 'hover:scale-110'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Descrição <span className="normal-case font-normal">(opcional)</span>
        </label>
        <textarea
          value={form.descricao}
          onChange={(e) => patch('descricao', e.target.value)}
          placeholder="Por que esse hábito é importante para você?"
          rows={2}
          className="w-full bg-background/40 border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder:text-muted-foreground/50 resize-none transition-all"
        />
      </div>
    </div>
  )
}

/* ─── Step 2: Quando começa ─── */
function S2Inicio({ form, patch }: { form: Form; patch: Patch }) {
  const opts: { key: Form['dataInicio']; label: string; desc: string }[] = [
    { key: 'hoje',   label: '📅 Hoje',       desc: format(new Date(), "dd 'de' MMMM", { locale: ptBR }) },
    { key: 'amanha', label: '☀️ Amanhã',    desc: format(addDays(new Date(), 1), "dd 'de' MMMM", { locale: ptBR }) },
    { key: 'custom', label: '📆 Escolher',   desc: 'Definir uma data' },
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Quando você quer começar esse hábito?</p>
      <div className="space-y-2">
        {opts.map((o) => (
          <button
            key={o.key}
            onClick={() => patch('dataInicio', o.key)}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
              form.dataInicio === o.key
                ? 'border-accent bg-accent/10'
                : 'border-border/50 bg-background/30 hover:border-accent/40 hover:bg-muted/20'
            )}
          >
            <div className="flex-1">
              <p className="font-semibold text-sm">{o.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
            </div>
            <div className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
              form.dataInicio === o.key ? 'bg-accent border-accent' : 'border-muted-foreground/30'
            )}>
              {form.dataInicio === o.key && <span className="text-white text-[10px] font-bold">✓</span>}
            </div>
          </button>
        ))}
      </div>
      {form.dataInicio === 'custom' && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Escolha a data</label>
          <input
            type="date"
            value={form.dataCustom}
            onChange={(e) => patch('dataCustom', e.target.value)}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="w-full bg-background/40 border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all [color-scheme:dark]"
          />
        </div>
      )}
    </div>
  )
}

/* ─── Step 3: Frequência ─── */
function S3Frequencia({ form, patch, toggleDia }: { form: Form; patch: Patch; toggleDia: (d: string) => void }) {
  const opts: { key: Form['frequencia']; label: string; desc: string }[] = [
    { key: 'diaria',    label: '🔄 Diária',     desc: 'Todos os dias' },
    { key: 'semanal',   label: '📅 Semanal',    desc: 'Dias específicos' },
    { key: 'quinzenal', label: '🗓️ Quinzenal', desc: 'A cada 15 dias' },
    { key: 'mensal',    label: '📆 Mensal',     desc: 'Uma vez por mês' },
  ]
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <button
            key={o.key}
            onClick={() => patch('frequencia', o.key)}
            className={cn(
              'flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all',
              form.frequencia === o.key
                ? 'border-accent bg-accent/10'
                : 'border-border/50 bg-background/30 hover:border-accent/40 hover:bg-muted/20'
            )}
          >
            <p className="font-semibold text-sm">{o.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
          </button>
        ))}
      </div>

      {form.frequencia === 'semanal' && (
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Dias da semana
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {DIAS.map((d) => (
              <button
                key={d.key}
                onClick={() => toggleDia(d.key)}
                className={cn(
                  'w-11 h-11 rounded-xl text-xs font-bold transition-all',
                  form.diasSemana.includes(d.key)
                    ? 'bg-accent text-white shadow-md shadow-accent/25'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Vezes por dia
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => patch('vezesPorDia', Math.max(1, form.vezesPorDia - 1))}
            className="w-10 h-10 rounded-xl bg-muted/60 font-bold text-xl hover:bg-muted transition-colors flex items-center justify-center leading-none"
          >
            −
          </button>
          <span className="w-12 text-center text-2xl font-bold tabular-nums">{form.vezesPorDia}</span>
          <button
            onClick={() => patch('vezesPorDia', Math.min(10, form.vezesPorDia + 1))}
            className="w-10 h-10 rounded-xl bg-muted/60 font-bold text-xl hover:bg-muted transition-colors flex items-center justify-center leading-none"
          >
            +
          </button>
          <span className="text-sm text-muted-foreground">
            {form.vezesPorDia === 1 ? 'vez por dia' : 'vezes por dia'}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Step 4: Horário ─── */
function S4Horario({ form, patch }: { form: Form; patch: Patch }) {
  const opts: { key: Form['periodo']; label: string; desc: string }[] = [
    { key: 'manha',         label: '☀️ Manhã',          desc: 'Entre 6h e 12h' },
    { key: 'tarde',         label: '🌤️ Tarde',          desc: 'Entre 12h e 18h' },
    { key: 'noite',         label: '🌙 Noite',           desc: 'Entre 18h e 22h' },
    { key: 'personalizado', label: '🕐 Personalizado',  desc: 'Escolher horário' },
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Qual o melhor momento para esse hábito?</p>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <button
            key={o.key}
            onClick={() => patch('periodo', o.key)}
            className={cn(
              'flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all',
              form.periodo === o.key
                ? 'border-accent bg-accent/10'
                : 'border-border/50 bg-background/30 hover:border-accent/40 hover:bg-muted/20'
            )}
          >
            <p className="font-semibold text-sm">{o.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{o.desc}</p>
          </button>
        ))}
      </div>
      {form.periodo === 'personalizado' && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Horário específico</label>
          <input
            type="time"
            value={form.horario}
            onChange={(e) => patch('horario', e.target.value)}
            className="w-full bg-background/40 border border-border/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all [color-scheme:dark]"
          />
        </div>
      )}
    </div>
  )
}

/* ─── Step 5: Revisão ─── */
function S5Revisao({ form }: { form: Form }) {
  const PERIODO_LABEL: Record<string, string> = {
    manha: '☀️ Manhã', tarde: '🌤️ Tarde', noite: '🌙 Noite',
    personalizado: `🕐 ${form.horario}`,
  }
  const FREQ_LABEL: Record<string, string> = {
    diaria: 'Todos os dias', semanal: 'Semanal',
    quinzenal: 'A cada 15 dias', mensal: 'Mensal',
  }
  const DATA_LABEL: Record<string, string> = {
    hoje: 'Hoje', amanha: 'Amanhã', custom: form.dataCustom,
  }
  const rows = [
    { label: 'Começa em',  value: DATA_LABEL[form.dataInicio] },
    {
      label: 'Frequência',
      value: FREQ_LABEL[form.frequencia]
        + (form.frequencia === 'semanal' && form.diasSemana.length
          ? ` · ${form.diasSemana.join(', ')}`
          : ''),
    },
    { label: 'Vezes/dia',  value: `${form.vezesPorDia}×` },
    { label: 'Horário',    value: PERIODO_LABEL[form.periodo] },
  ]

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div
        className="flex items-center gap-4 p-4 rounded-xl"
        style={{ backgroundColor: form.cor + '18', border: `2px solid ${form.cor}50` }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
          style={{ backgroundColor: form.cor + '30' }}
        >
          {form.icone}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-lg leading-tight truncate">{form.nome || 'Meu hábito'}</p>
          {form.descricao && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{form.descricao}</p>
          )}
        </div>
      </div>

      <div className="divide-y divide-border/40">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className="text-sm font-semibold text-right max-w-[60%]">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
