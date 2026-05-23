import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getNomorSuratConfig, saveNomorSuratConfig } from '@/services/nomorSuratService'
import { generateNomorSuratParts } from '@/utils/nomorSuratGenerator'

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

  const preview = generateNomorSuratParts(format, counter, kodeDesa)

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight">Nomor Surat</h1>

      <Card>
        <CardHeader><CardTitle className="text-sm">Format</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Format Nomor Surat</Label>
            <Input value={format} onChange={e => setFormat(e.target.value)} />
            <p className="text-[10px] text-muted-foreground">Gunakan: {'{S_NOMOR}'}, {'{S_KODE_DESA}'}, {'{S_BULAN_ROM}'}, {'{S_TAHUN}'}</p>
          </div>
          <div className="space-y-1">
            <Label>Kode Desa</Label>
            <Input value={kodeDesa} onChange={e => setKodeDesa(e.target.value)} placeholder="DS-GRM" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Counter</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">Counter saat ini: <span className="font-bold">{counter}</span></p>
          <div className="space-y-1">
            <Label>Set Nomor Awal (opsional)</Label>
            <Input value={nomorAwal} onChange={e => setNomorAwal(e.target.value)} placeholder="Kosongkan jika tidak ubah" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
        <CardContent>
          <p className="font-mono text-lg font-bold">{preview.NOMOR_SURAT}</p>
          <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-muted-foreground">
            <span>S_NOMOR: {preview.S_NOMOR}</span>
            <span>S_BULAN: {preview.S_BULAN}</span>
            <span>S_BULAN_ROM: {preview.S_BULAN_ROM}</span>
            <span>S_TAHUN: {preview.S_TAHUN}</span>
            <span>S_KODE_DESA: {preview.S_KODE_DESA}</span>
            <span>S_TANGGAL: {preview.S_TANGGAL}</span>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave}>Simpan Konfigurasi</Button>
    </div>
  )
}
