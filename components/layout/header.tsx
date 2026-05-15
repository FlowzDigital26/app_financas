'use client'

import { useRouter } from 'next/navigation'
import { LogOut, Leaf } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  title: string
  subtitle?: string
  userEmail?: string
}

export function Header({ title, subtitle, userEmail }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-semibold text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {userEmail && (
          <span className="hidden sm:block text-sm text-muted-foreground">
            {userEmail}
          </span>
        )}
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-1.5 mr-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Leaf className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-display text-base font-semibold">
            Finanças<span className="text-accent italic">Pro</span>
          </span>
        </div>
      </div>
    </header>
  )
}
