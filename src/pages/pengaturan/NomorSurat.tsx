import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getNomorSuratConfig, saveNomorSuratConfig } from '@/services/nomorSuratService'
import { generateNomorSuratParts } from '@/utils/nomorSuratGenerator'
import { Hash, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { crmShell } from '@/lib/aisura-crm-ui'

export function NomorSuratPage() {
  const [format, setFormat] = useState('{S_NOMOR}/{S_KODE_DESA}/{S_BULAN_ROM}/{S_TAHUN}')
  const [kodeDesa, setKodeDesa] = useState('')
  const [counter, setCounter] = useState(1)
  const [nomorAwal, setNomorAwal] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadConfig() }, [])

  const loadConfig = async () => {
    try {
      const c = await getNomorSuratConfig()
      if (c) { setFormat(c.format); setKodeDesa(c.kode_desa); setCounter(c.counter) }
    } catch {} finally { setLoading(false) }
  }

  const handleSave = async () => {
    try {
      const nc = nomorAwal ? parseInt(nomorAwal) : undefined
      await saveNomorSuratConfig({ format, kode_desa: kodeDesa, counter: nc })
      if (nc) setCounter(nc); setNomorAwal('')
      alert('Konfigurasi disimpan')
    } catch { alert('Gagal') }
  }

  const preview = generateNomorSuratParts(format, counter, kodeDesa, 'SKD')

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className={crmShell.page}>
      <div>
        <p className={crmShell.eyebrow}>Numbering control</p>
        <h1 className={crmShell.title}>Nomor Surat</h1>
        <p className={crmShell.subtitle}>Atur format, kode desa, dan nomor urut otomatis.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Card className={crmShell.card}>
            <CardHeader><CardTitle className="text-sm">Format</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Format Nomor Surat</Label>
                <Input value={format} onChange={e => setFormat(e.target.value)} />
                <p className="text-[10px] text-muted-foreground">Gunakan: {'{S_NOMOR}'}, {'{S_PREFIX}'}, {'{S_KODE_DESA}'}, {'{S_BULAN_ROM}'}, {'{S_TAHUN}'}</p>
              </div>
              <div className="space-y-1">
                <Label>Kode Desa</Label>
                <Input value={kodeDesa} onChange={e => setKodeDesa(e.target.value)} placeholder="DS-GRM" />
              </div>
            </CardContent>
          </Card>

          <Card className={crmShell.card}>
            <CardHeader><CardTitle className="text-sm">Counter</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Counter saat ini</p>
                <p className="font-data-number text-2xl font-bold">{counter}</p>
              </div>
              <div className="space-y-1">
                <Label>Set Nomor Awal (opsional)</Label>
                <Input value={nomorAwal} onChange={e => setNomorAwal(e.target.value)} placeholder="Kosongkan jika tidak ubah" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className={cn(crmShell.panel, 'overflow-hidden')}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Hash className="h-4 w-4 text-blue-600" />Preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-background/80 p-4">
              <p className="text-xs font-medium text-muted-foreground">Nomor berikutnya</p>
              <p className="mt-1 break-all font-data-number text-xl font-bold text-blue-700 dark:text-blue-300">{preview.NOMOR_SURAT}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>S_NOMOR: {preview.S_NOMOR}</span>
              <span>S_BULAN: {preview.S_BULAN}</span>
              <span>S_BULAN_ROM: {preview.S_BULAN_ROM}</span>
              <span>S_TAHUN: {preview.S_TAHUN}</span>
              <span>S_KODE_DESA: {preview.S_KODE_DESA}</span>
              <span>S_TANGGAL: {preview.S_TANGGAL}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave}><Save className="mr-1 h-3.5 w-3.5" />Simpan Konfigurasi</Button>
    </div>
  )
}
