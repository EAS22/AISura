import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePassword, updateDisplayName, getDisplayName } from '@/services/authService'
import { crmShell } from '@/lib/aisura-crm-ui'

export function Profil() {
  const [name, setName] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    loadName()
  }, [])

  const loadName = async () => {
    try {
      const n = await getDisplayName()
      setName(n)
    } catch { setName('Admin') }
  }

  const handleSaveName = async () => {
    try { await updateDisplayName(name); alert('Nama berhasil diubah') } catch { alert('Gagal') }
  }

  const handleChangePassword = async () => {
    if (newPassword.length < 4) { alert('Password minimal 4 karakter'); return }
    if (newPassword !== confirmPassword) { alert('Password tidak cocok'); return }
    try {
      const ok = await changePassword(oldPassword, newPassword)
      if (ok) { alert('Password diubah'); setOldPassword(''); setNewPassword(''); setConfirmPassword('') }
      else alert('Password lama salah')
    } catch { alert('Gagal') }
  }

  return (
    <div className={`${crmShell.page} max-w-md`}>
      <div>
        <p className={crmShell.eyebrow}>Account</p>
        <h1 className={crmShell.title}>Profil</h1>
        <p className={crmShell.subtitle}>Kelola nama tampilan dan password admin.</p>
      </div>

      <Card className={crmShell.card}>
        <CardHeader><CardTitle className="text-sm">Nama Pengguna</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} className="flex-1" />
          <Button size="sm" onClick={handleSaveName}>Simpan</Button>
        </CardContent>
      </Card>

      <Card className={crmShell.card}>
        <CardHeader><CardTitle className="text-sm">Ganti Password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label>Password Lama</Label><Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} /></div>
          <div className="space-y-1"><Label>Password Baru</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
          <div className="space-y-1"><Label>Konfirmasi</Label><Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
          <Button size="sm" onClick={handleChangePassword}>Ganti Password</Button>
        </CardContent>
      </Card>
    </div>
  )
}
