import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changePassword, updateDisplayName } from '@/services/authService'

export function Profil() {
  const [name, setName] = useState('Admin')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSaveName = async () => {
    try { await updateDisplayName(name); alert('Nama diubah') } catch { alert('Gagal') }
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
    <div className="space-y-4 max-w-md">
      <h1 className="text-2xl font-bold tracking-tight">Profil</h1>

      <Card>
        <CardHeader><CardTitle className="text-sm">Nama Pengguna</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} className="flex-1" />
          <Button size="sm" onClick={handleSaveName}>Simpan</Button>
        </CardContent>
      </Card>

      <Card>
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
