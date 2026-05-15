'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

export default function PerfilPage() {
  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { toast } = useToast()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
      setFullName(profile?.full_name ?? '')
      setPageLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveProfile() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: fullName.trim(), updated_at: new Date().toISOString() })
    setSaving(false)
    if (error) {
      toast({ title: 'Erro ao salvar perfil', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Perfil atualizado!' })
    router.refresh()
  }

  async function handleChangePassword() {
    if (!newPassword) {
      toast({ title: 'Informe a nova senha', variant: 'destructive' }); return
    }
    if (newPassword.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' }); return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' }); return
    }
    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setChangingPassword(false)
    if (error) {
      toast({ title: 'Erro ao alterar senha', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Senha alterada com sucesso!' })
    setNewPassword('')
    setConfirmPassword('')
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-semibold">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas informações pessoais</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              placeholder="Seu nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar perfil
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Alterar Senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword} variant="outline" className="gap-2">
            {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Alterar senha
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
