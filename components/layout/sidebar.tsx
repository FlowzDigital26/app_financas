'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, FileText, Target, Tags, LogOut,
  ChevronLeft, ChevronRight, Repeat2, Settings, Bot, FileUp, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const navItems = [
  { href: '/dashboard',        label: 'Visão Geral',    icon: LayoutDashboard },
  { href: '/extrato',          label: 'Extrato',         icon: FileText },
  { href: '/planejamento',     label: 'Planejamento',    icon: ClipboardList },
  { href: '/importar-extrato', label: 'Importar PDF',    icon: FileUp },
  { href: '/objetivos',        label: 'Objetivos',       icon: Target },
  { href: '/categorias',       label: 'Categorias',      icon: Tags },
  { href: '/assinaturas',      label: 'Assinaturas',     icon: Repeat2 },
  { href: '/assessor',         label: 'Assessor IA',     icon: Bot },
]

const mobileNavItems = [
  { href: '/dashboard',        label: 'Visão',    icon: LayoutDashboard },
  { href: '/extrato',          label: 'Extrato',  icon: FileText },
  { href: '/importar-extrato', label: 'Importar', icon: FileUp },
  { href: '/assessor',         label: 'Assessor', icon: Bot },
  { href: '/configuracoes',    label: 'Config',   icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const linkClass = (href: string) =>
    cn(
      'flex items-center rounded-lg text-sm font-medium transition-all',
      collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5',
      pathname === href
        ? 'bg-accent text-white shadow-sm'
        : 'text-primary-foreground/60 hover:text-accent hover:bg-accent/15'
    )

  return (
    <aside className={cn(
      'hidden lg:flex flex-col h-screen sticky top-0 bg-primary text-primary-foreground shrink-0 transition-all duration-300',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className={cn('py-5 flex items-center', collapsed ? 'px-3 justify-center' : 'px-5')}>
        {collapsed ? (
          <div className="w-8 h-8 flex items-center justify-center">
            <Image src="/flowz-logo.svg" alt="Flowz" width={28} height={28} className="object-contain" />
          </div>
        ) : (
          <Image src="/flowz-logo.svg" alt="Flowz Finance" width={120} height={40} className="object-contain h-8 w-auto" />
        )}
      </div>

      <div className="px-3"><div className="h-px bg-primary-foreground/10" /></div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* MENU label + collapse toggle */}
        <div className={cn('flex items-center mb-3', collapsed ? 'justify-center' : 'justify-between px-1')}>
          {!collapsed && (
            <p className="text-xs font-medium tracking-wider uppercase text-primary-foreground/40">Menu</p>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1 rounded-md text-primary-foreground/40 hover:text-accent hover:bg-accent/10 transition-colors"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} title={collapsed ? label : undefined} className={linkClass(href)}>
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && label}
          </Link>
        ))}
      </nav>

      {/* Bottom controls — always visible, inside scroll area */}
      <div className={cn('px-3 pb-6 space-y-1')}>
        <div className="h-px bg-primary-foreground/10 mb-3" />

        {/* Configurações */}
        <Link
          href="/configuracoes"
          title={collapsed ? 'Configurações' : undefined}
          className={linkClass('/configuracoes')}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && 'Configurações'}
        </Link>

        {/* Tema */}
        <ThemeToggle
          className={cn(
            'text-primary-foreground/60 hover:text-accent hover:bg-accent/15 w-full rounded-lg py-2.5 text-sm font-medium transition-all',
            collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3'
          )}
          label={collapsed ? undefined : 'Tema'}
        />

        {/* Sair */}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'flex items-center w-full rounded-lg py-2.5 text-sm font-medium text-primary-foreground/60 hover:text-expense hover:bg-expense/10 transition-colors',
            collapsed ? 'justify-center px-0' : 'gap-3 px-3'
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && 'Sair'}
        </button>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                active ? 'text-accent' : 'text-muted-foreground hover:text-accent'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
