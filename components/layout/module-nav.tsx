'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const modules = [
  { label: '💰 Flowz Finance', href: '/dashboard', match: (p: string) => !p.startsWith('/habitz') },
  { label: '🔥 Flowz Habitz',  href: '/habitz',    match: (p: string) => p.startsWith('/habitz') },
  { label: '📓 Flowz Journalz', href: null,         match: () => false, soon: true },
]

export function ModuleNav() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 bg-muted/60 rounded-full p-1 border border-border/50">
      {modules.map((mod) => {
        const active = mod.match(pathname)

        if (mod.soon) {
          return (
            <div key={mod.label} className="relative group">
              <span className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium cursor-not-allowed select-none',
                'text-muted-foreground/40'
              )}>
                {mod.label}
              </span>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                Em breve
              </div>
            </div>
          )
        }

        return (
          <Link
            key={mod.label}
            href={mod.href!}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
              active
                ? 'bg-background text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {mod.label}
          </Link>
        )
      })}
    </div>
  )
}
