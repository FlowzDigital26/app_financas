'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  ArrowRight,
  BarChart3,
  Target,
  CreditCard,
  TrendingUp,
  Shield,
  CheckCircle,
  Menu,
  X,
} from 'lucide-react'

const features = [
  {
    icon: BarChart3,
    title: 'Dashboard Intuitivo',
    desc: 'Visualize receitas, despesas e saldo do mês de um jeito claro e bonito, em tempo real.',
  },
  {
    icon: TrendingUp,
    title: 'Gráficos Mensais',
    desc: 'Acompanhe a evolução das suas finanças nos últimos 6 meses com gráficos interativos.',
  },
  {
    icon: Target,
    title: 'Objetivos Financeiros',
    desc: 'Defina metas de poupança e acompanhe o progresso rumo ao que você quer conquistar.',
  },
  {
    icon: CreditCard,
    title: 'Categorias Personalizadas',
    desc: 'Organize seus gastos por categorias que fazem sentido para o seu estilo de vida.',
  },
]

const steps = [
  {
    step: '01',
    title: 'Crie sua conta',
    desc: 'Cadastro gratuito e sem complicações. Basta seu email e uma senha.',
  },
  {
    step: '02',
    title: 'Registre suas transações',
    desc: 'Adicione receitas e despesas com categorias e datas. Simples assim.',
  },
  {
    step: '03',
    title: 'Acompanhe e evolua',
    desc: 'Veja gráficos, defina objetivos e tome decisões financeiras mais inteligentes.',
  },
]

const mockBars = [40, 65, 45, 80, 60, 90]
const mockTransactions = [
  { label: 'Salário', amount: '+R$ 5.000', color: 'text-[#2ECC9A]' },
  { label: 'Aluguel', amount: '-R$ 1.800', color: 'text-red-400' },
  { label: 'Freela design', amount: '+R$ 3.500', color: 'text-[#2ECC9A]' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>

      {/* ── Navbar ── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#0d2139]/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Image src="/flowz-logo.svg" alt="Flowz Finance" width={120} height={40} className="h-8 w-auto" />

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#recursos" className="text-sm font-medium text-white/80 hover:text-[#2ECC9A] transition-colors">
                Recursos
              </a>
              <a href="#como-funciona" className="text-sm font-medium text-white/80 hover:text-[#2ECC9A] transition-colors">
                Como funciona
              </a>
              <Link href="/login" className="text-sm font-medium text-white/80 hover:text-[#2ECC9A] transition-colors">
                Entrar
              </Link>
              <Link
                href="/register"
                className="bg-[#2ECC9A] text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-[#25b589] transition-colors"
              >
                Começar grátis
              </Link>
            </nav>

            {/* Mobile toggle */}
            <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#0d2139] border-t border-white/10 px-4 py-4 space-y-3">
            <a href="#recursos" className="block text-sm text-white/80 py-2" onClick={() => setMenuOpen(false)}>
              Recursos
            </a>
            <a href="#como-funciona" className="block text-sm text-white/80 py-2" onClick={() => setMenuOpen(false)}>
              Como funciona
            </a>
            <Link href="/login" className="block text-sm text-white/80 py-2" onClick={() => setMenuOpen(false)}>
              Entrar
            </Link>
            <Link
              href="/register"
              className="block bg-[#2ECC9A] text-white text-sm font-semibold px-5 py-2.5 rounded-lg text-center"
              onClick={() => setMenuOpen(false)}
            >
              Começar grátis
            </Link>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="bg-[#0d2139] min-h-screen flex items-center relative overflow-hidden pt-16">
        {/* Glow blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-[#2ECC9A]/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-32 w-[400px] h-[400px] bg-[#2ECC9A]/5 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, #2ECC9A 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[#2ECC9A]/15 border border-[#2ECC9A]/30 rounded-full px-4 py-1.5 mb-6">
                <div className="w-1.5 h-1.5 bg-[#2ECC9A] rounded-full animate-pulse" />
                <span className="text-[#2ECC9A] text-xs font-semibold tracking-wide uppercase">
                  Controle Financeiro Inteligente
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Suas finanças,
                <br />
                <span className="text-[#2ECC9A]">sob controle.</span>
                <br />
                Finalmente.
              </h1>

              <p className="text-lg text-white/60 leading-relaxed mb-8 max-w-md">
                O Flowz Finance reúne tudo que você precisa para organizar receitas, despesas e
                objetivos financeiros — de forma simples, bonita e intuitiva.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 bg-[#2ECC9A] text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-[#25b589] transition-all hover:scale-105 shadow-lg shadow-[#2ECC9A]/25"
                >
                  Criar conta grátis
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-medium px-7 py-3.5 rounded-xl hover:bg-white/5 transition-colors"
                >
                  Já tenho conta
                </Link>
              </div>

              {/* Trust pills */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-10 pt-8 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#2ECC9A]" />
                  <span className="text-xs text-white/50">Dados seguros</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#2ECC9A]" />
                  <span className="text-xs text-white/50">100% gratuito</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#2ECC9A]" />
                  <span className="text-xs text-white/50">Relatórios em tempo real</span>
                </div>
              </div>
            </div>

            {/* Right — dashboard mockup */}
            <div className="relative hidden lg:flex justify-center">
              <div className="bg-[#111f33] rounded-2xl border border-white/10 shadow-2xl p-5 w-full max-w-sm transform rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Header row */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <span className="text-white/50 text-xs font-medium">Maio de 2025</span>
                  <Image src="/flowz-logo.svg" alt="" width={60} height={20} className="h-4 w-auto opacity-50" />
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-[#2ECC9A]/10 border border-[#2ECC9A]/20 rounded-xl p-3">
                    <p className="text-[10px] text-[#2ECC9A]/70 mb-1">Receitas</p>
                    <p className="text-sm font-bold text-[#2ECC9A]">R$ 8.500</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-[10px] text-red-400/70 mb-1">Despesas</p>
                    <p className="text-sm font-bold text-red-400">R$ 4.230</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-[10px] text-white/40 mb-1">Saldo</p>
                    <p className="text-sm font-bold text-white">R$ 4.270</p>
                  </div>
                </div>

                {/* Chart bars */}
                <div className="bg-white/5 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-white/40 mb-3">Últimos 6 meses</p>
                  <div className="flex items-end gap-1 h-16">
                    {mockBars.map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col gap-0.5 justify-end">
                        <div
                          className="rounded-sm"
                          style={{ height: `${h * 0.55}%`, backgroundColor: '#2ECC9A', opacity: 0.85 }}
                        />
                        <div
                          className="rounded-sm bg-red-400/55"
                          style={{ height: `${(100 - h) * 0.3}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transactions */}
                <div className="space-y-1.5">
                  {mockTransactions.map((t) => (
                    <div key={t.label} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-[11px] text-white/65">{t.label}</span>
                      <span className={`text-[11px] font-semibold ${t.color}`}>{t.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-6 bg-[#2ECC9A] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-[#2ECC9A]/30 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Saldo positivo este mês!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="bg-[#2ECC9A] py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { value: '100%', label: 'Gratuito' },
              { value: 'Seguro', label: 'Criptografado' },
              { value: '360°', label: 'Visão financeira' },
              { value: 'Real-time', label: 'Dados ao vivo' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-white/70 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="recursos" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#2ECC9A] text-sm font-semibold uppercase tracking-wider">Recursos</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0d2139] mt-2 mb-4">
              Tudo que você precisa para
              <br />
              cuidar do seu dinheiro
            </h2>
            <p className="text-[#0d2139]/55 max-w-lg mx-auto">
              Simples de usar, poderoso o suficiente para transformar a sua relação com as finanças.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group bg-white border border-[#0d2139]/8 rounded-2xl p-6 hover:border-[#2ECC9A]/50 hover:shadow-lg hover:shadow-[#2ECC9A]/8 transition-all duration-300"
              >
                <div className="w-11 h-11 bg-[#2ECC9A]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#2ECC9A]/20 transition-colors">
                  <Icon className="w-5 h-5 text-[#2ECC9A]" />
                </div>
                <h3 className="font-semibold text-[#0d2139] mb-2">{title}</h3>
                <p className="text-sm text-[#0d2139]/55 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como-funciona" className="py-24 bg-[#f0faf6]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-[#2ECC9A] text-sm font-semibold uppercase tracking-wider">Como funciona</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0d2139] mt-2">
              Comece em 3 passos simples
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-10 relative">
            {/* Connector line (desktop) */}
            <div className="hidden sm:block absolute top-8 left-[calc(16.66%+32px)] right-[calc(16.66%+32px)] h-px bg-[#2ECC9A]/25" />

            {steps.map(({ step, title, desc }) => (
              <div key={step} className="text-center relative">
                <div className="w-16 h-16 bg-[#0d2139] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg ring-4 ring-[#f0faf6]">
                  <span className="text-[#2ECC9A] text-xl font-bold">{step}</span>
                </div>
                <h3 className="font-semibold text-[#0d2139] text-lg mb-2">{title}</h3>
                <p className="text-[#0d2139]/55 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-28 bg-[#0d2139] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#2ECC9A]/8 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-5 leading-tight">
            Pronto para assumir o<br />
            <span className="text-[#2ECC9A]">controle das suas finanças?</span>
          </h2>
          <p className="text-white/55 text-lg mb-9 max-w-lg mx-auto">
            Junte-se a quem já decidiu cuidar melhor do próprio dinheiro. Grátis, seguro e sem burocracia.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-[#2ECC9A] text-white font-semibold text-lg px-9 py-4 rounded-xl hover:bg-[#25b589] transition-all hover:scale-105 shadow-xl shadow-[#2ECC9A]/25"
          >
            Criar conta grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-white/25 text-sm mt-4">Sem cartão de crédito. Sem taxas. Para sempre.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0a1c2e] border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Image src="/flowz-logo.svg" alt="Flowz Finance" width={100} height={36} className="h-7 w-auto opacity-70" />
            <p className="text-white/25 text-xs">© 2025 Flowz Finance. Todos os direitos reservados.</p>
            <div className="flex items-center gap-6">
              <Link href="/login" className="text-white/35 hover:text-[#2ECC9A] text-xs transition-colors">
                Entrar
              </Link>
              <Link href="/register" className="text-white/35 hover:text-[#2ECC9A] text-xs transition-colors">
                Cadastrar
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
