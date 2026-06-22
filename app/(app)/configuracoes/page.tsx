'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User, Lock, Bell, Shield, HelpCircle, LogOut,
  ChevronRight, Sun, Moon, Repeat2, Target, Tags,
  FileText, LayoutDashboard, Loader2, CheckCircle2, Wallet,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

function SettingRow({
  icon: Icon,
  label,
  description,
  onClick,
  href,
  danger,
  value,
}: {
  icon: React.ElementType
  label: string
  description?: string
  onClick?: () => void
  href?: string
  danger?: boolean
  value?: React.ReactNode
}) {
  const base =
    'flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer'
  const content = (
    <>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${danger ? 'bg-expense/10' : 'bg-muted'}`}>
        <Icon className={`w-4 h-4 ${danger ? 'text-expense' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-expense' : 'text-foreground'}`}>{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {value && <p className="text-sm text-muted-foreground shrink-0">{value}</p>}
      {!value && <ChevronRight className={`w-4 h-4 shrink-0 ${danger ? 'text-expense/50' : 'text-muted-foreground/50'}`} />}
    </>
  )

  if (href) return <Link href={href} className={base}>{content}</Link>
  return <button className={`${base} w-full text-left`} onClick={onClick}>{content}</button>
}

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {title && (
        <div className="px-4 py-2.5 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
        </div>
      )}
      <div className="divide-y divide-border">{children}</div>
    </div>
  )
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)

  const [email, setEmail]       = useState('')
  const [fullName, setFullName] = useState('')
  const [initials, setInitials] = useState('?')
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Password change dialog
  const [pwOpen, setPwOpen]         = useState(false)
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [savingPw, setSavingPw]     = useState(false)

  useEffect(() => {
    setMounted(true)
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Profile
      setEmail(user.email ?? '')
      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      const name = profile?.full_name || user.email?.split('@')[0] || 'Usuário'
      setFullName(name)
      setInitials(getInitials(name))
      setLoadingProfile(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleChangePassword() {
    if (newPw.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' }); return
    }
    if (newPw !== confirmPw) {
      toast({ title: 'As senhas não conferem', variant: 'destructive' }); return
    }
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSavingPw(false)
    if (error) {
      toast({ title: 'Erro ao alterar senha', description: error.message, variant: 'destructive' }); return
    }
    toast({ title: 'Senha alterada com sucesso!' })
    setPwOpen(false)
    setNewPw(''); setConfirmPw('')
  }

  const isDark = theme === 'dark'

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie sua conta, orçamento e preferências</p>
      </div>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        {loadingProfile ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-accent text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-lg truncate">{fullName}</p>
              <p className="text-sm text-muted-foreground truncate">{email}</p>
            </div>
            <div className="shrink-0">
              <div className="bg-accent/10 text-accent text-xs font-semibold px-2.5 py-1 rounded-full">Grátis</div>
            </div>
          </>
        )}
      </div>

      {/* Navigation shortcuts */}
      <SectionCard title="Acessar">
        <SettingRow icon={LayoutDashboard} label="Dashboard"    href="/dashboard" />
        <SettingRow
          icon={Wallet}
          label="Planejamento"
          description="Defina metas por categoria e acompanhe o realizado do mês"
          href="/planejamento"
        />
        <SettingRow icon={FileText}        label="Extrato"      href="/extrato" />
        <SettingRow icon={Repeat2}         label="Assinaturas"  href="/assinaturas" />
        <SettingRow icon={Target}          label="Objetivos"    href="/objetivos" />
        <SettingRow icon={Tags}            label="Categorias"   href="/categorias" />
      </SectionCard>

      {/* Account */}
      <SectionCard title="Conta">
        <SettingRow
          icon={User}
          label="Editar perfil"
          description="Nome, telefone e informações pessoais"
          href="/perfil"
        />
        {mounted && (
          <SettingRow
            icon={isDark ? Sun : Moon}
            label="Tema"
            description={isDark ? 'Modo escuro ativado' : 'Modo claro ativado'}
            value={isDark ? 'Escuro' : 'Claro'}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          />
        )}
        <SettingRow
          icon={Bell}
          label="Notificações"
          description="Alertas de pagamentos e vencimentos"
          value="Em breve"
          onClick={() => {}}
        />
      </SectionCard>

      {/* Security */}
      <SectionCard title="Segurança">
        <SettingRow
          icon={Lock}
          label="Alterar senha"
          description="Redefina sua senha de acesso"
          onClick={() => setPwOpen(true)}
        />
        <SettingRow
          icon={Shield}
          label="Privacidade"
          description="Seus dados são criptografados e seguros"
          value={<CheckCircle2 className="w-4 h-4 text-income" />}
          onClick={() => {}}
        />
      </SectionCard>

      {/* Support */}
      <SectionCard title="Suporte">
        <SettingRow
          icon={HelpCircle}
          label="Falar com suporte"
          description="Tire dúvidas ou reporte um problema"
          onClick={() => {
            toast({ title: 'Suporte', description: 'Entre em contato: flowz.contato@gmail.com' })
          }}
        />
      </SectionCard>

      {/* Danger */}
      <SectionCard>
        <SettingRow
          icon={LogOut}
          label="Sair da conta"
          description="Você será desconectado do Flowz Finance"
          onClick={handleSignOut}
          danger
        />
      </SectionCard>

      <p className="text-center text-xs text-muted-foreground pb-2">Flowz Finance · v1.0</p>

      {/* Change password dialog */}
      <Dialog open={pwOpen} onOpenChange={(o) => { setPwOpen(o); if (!o) { setNewPw(''); setConfirmPw('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)} disabled={savingPw}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={savingPw} className="gap-2">
              {savingPw && <Loader2 className="w-4 h-4 animate-spin" />}
              Alterar senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
