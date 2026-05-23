import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function AplikasiPage() {
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
    if (!confirm('Hapus semua data (kecuali password)? Tidak bisa dibatalkan.')) return
    try {
      const { resetAllData } = await import('@/services/backupService')
      await resetAllData()
      alert('Data berhasil direset')
    } catch { alert('Gagal reset') }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight">Aplikasi</h1>

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
    </div>
  )
}
