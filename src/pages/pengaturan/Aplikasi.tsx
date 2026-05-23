import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useConfirm } from '@/hooks/use-confirm'

export function AplikasiPage() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [loginImage, setLoginImage] = useState<string | null>(null)

  useEffect(() => {
    const img = localStorage.getItem('aisura-login-image')
    if (img) setLoginImage(img)
  }, [])

  const handleBackup = async () => {
    try {
      const { exportBackup } = await import('@/services/backupService')
      const ok = await exportBackup()
      if (ok) alert('Backup berhasil')
    } catch { alert('Gagal backup') }
  }

  const handleRestore = async () => {
    try {
      const { importBackup } = await import('@/services/backupService')
      const ok = await importBackup()
      if (ok) alert('Restore berhasil. Restart aplikasi.')
    } catch { alert('Gagal restore') }
  }

  const handleReset = async () => {
    const ok = await confirm({ title: 'Reset Semua Data?', description: 'Semua data (kecuali password) akan dihapus permanen. Tidak bisa dibatalkan.' })
    if (!ok) return
    try {
      const { resetAllData } = await import('@/services/backupService')
      await resetAllData()
      alert('Data berhasil direset')
    } catch { alert('Gagal reset') }
  }

  const handleUploadLoginImage = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const filePath = await open({ filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg'] }], multiple: false })
      if (!filePath) return
      const bytes = await readFile(filePath as string)
      const base64 = btoa(String.fromCharCode(...bytes))
      const ext = (filePath as string).split('.').pop()?.toLowerCase() || 'png'
      const mimeType = ext === 'jpg' ? 'jpeg' : ext
      const dataUrl = `data:image/${mimeType};base64,${base64}`
      localStorage.setItem('aisura-login-image', dataUrl)
      setLoginImage(dataUrl)
    } catch (err) { console.error(err) }
  }

  const handleRemoveLoginImage = () => {
    localStorage.removeItem('aisura-login-image')
    setLoginImage(null)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Aplikasi</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Gambar Halaman Login</CardTitle>
          <CardDescription>Ganti gambar ilustrasi di halaman login (PNG/JPG)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loginImage && (
            <div className="border rounded-md p-2">
              <img src={loginImage} alt="Login illustration" className="max-h-32 object-contain rounded" />
            </div>
          )}
          {!loginImage && (
            <div className="border rounded-md p-4 text-center text-sm text-muted-foreground">
              Menggunakan gambar default
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleUploadLoginImage}>Upload Gambar</Button>
            {loginImage && <Button size="sm" variant="ghost" onClick={handleRemoveLoginImage}>Kembalikan Default</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Backup & Restore</CardTitle>
          <CardDescription>Export/import semua data ke file JSON</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button size="sm" onClick={handleBackup}>Export Backup</Button>
          <Button size="sm" variant="outline" onClick={handleRestore}>Import Backup</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Reset Data</CardTitle>
          <CardDescription>Hapus semua data kecuali password</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="destructive" onClick={handleReset}>Reset Semua Data</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Informasi</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1 text-muted-foreground">
          <p>Versi: <span className="font-medium text-foreground">v1.0.0</span></p>
          <p>Developer: EAS Creative Studio</p>
          <p>Email: dev@eas.biz.id</p>
          <p>Web: eas.biz.id</p>
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  )
}
