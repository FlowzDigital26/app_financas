import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, MobileNav } from '@/components/layout/sidebar'
import { UserMenu } from '@/components/layout/user-menu'
import { ModuleNav } from '@/components/layout/module-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky top bar */}
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          {/* Logo — mobile only */}
          <div className="lg:hidden">
            <Image src="/flowz-logo.svg" alt="Flowz" width={90} height={32} className="object-contain h-7 w-auto" />
          </div>

          {/* Module nav pills — centrado */}
          <div className="hidden lg:flex flex-1 justify-center">
            <ModuleNav />
          </div>

          {/* Right: logo faint + user menu */}
          <div className="flex items-center gap-3">
            <Image
              src="/flowz-logo.svg"
              alt="Flowz"
              width={72} height={28}
              className="object-contain h-6 w-auto hidden lg:block opacity-40 hover:opacity-80 transition-opacity"
            />
            <UserMenu email={user.email ?? ''} fullName={profile?.full_name} />
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-6">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
