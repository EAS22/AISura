import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { useConfirm } from '@/hooks/use-confirm'
import { Code2, Globe2, Mail, Sparkles } from 'lucide-react'

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

      <Card className="overflow-hidden border-blue-200/60 bg-gradient-to-br from-blue-50 via-background to-background shadow-sm dark:border-blue-900/40 dark:from-blue-950/30">
        <CardContent className="p-0">
          <div className="relative p-5 sm:p-6">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200/70 bg-white/75 shadow-sm dark:border-blue-900/60 dark:bg-background/70">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold leading-none" style={{ fontFamily: "'Unica One', cursive" }}>
                        <span className="text-blue-600">AI</span>
                        <span className="text-black dark:text-white">Sura</span>
                      </span>
                      <Badge variant="secondary" className="rounded-full">v1.0.0</Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">Aplikasi Surat Otomatis Desa</p>
                  </div>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Sistem desktop untuk mengelola template DOCX, data warga, nomor surat, dan riwayat administrasi desa dalam satu alur kerja.
                </p>
              </div>

              <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:min-w-[430px]">
                <InfoTile icon={Code2} label="Versi" value="v1.0.0" />
                <InfoTile icon={Sparkles} label="Developer" value="EAS Creative Studio" />
                <InfoTile icon={Mail} label="Email" value="dev@eas.biz.id" />
                <InfoTile icon={Globe2} label="Web" value="eas.biz.id" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  )
}

function InfoTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-blue-200/60 bg-white/70 p-3 shadow-sm backdrop-blur-sm dark:border-blue-900/50 dark:bg-background/55">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}
