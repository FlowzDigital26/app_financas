'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'

interface UserMenuProps {
  email: string
  fullName?: string | null
}

export function UserMenu({ email, fullName }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()
  const initials = getInitials(fullName || email.split('@')[0])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full bg-accent text-white font-semibold text-sm flex items-center justify-center hover:opacity-90 transition-opacity ring-2 ring-accent/20"
        aria-label="Menu do usuário"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[200px] bg-card border border-border rounded-xl shadow-xl py-1">
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-sm font-medium truncate">{fullName || 'Usuário'}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors"
          >
            <User className="w-4 h-4 text-muted-foreground" />
            Meu Perfil
          </Link>
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-expense hover:bg-expense/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
