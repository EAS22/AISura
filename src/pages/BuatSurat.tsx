import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Search, Download } from 'lucide-react'
import { searchWarga, findKepalaKeluarga } from '@/services/wargaService'
import { getDataDesa } from '@/services/desaService'
import { getAllPerangkatDesa } from '@/services/perangkatDesaService'
import { getNomorSuratConfig, incrementCounter } from '@/services/nomorSuratService'
import { saveRiwayat } from '@/services/riwayatService'
import { generateNomorSuratParts } from '@/utils/nomorSuratGenerator'
import type { TemplateSurat, DetectedPlaceholder, Warga, DataDesa, PerangkatDesa } from '@/types'

export function BuatSurat() {
  const [templates, setTemplates] = useState<TemplateSurat[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSurat | null>(null)
  const [placeholders, setPlaceholders] = useState<DetectedPlaceholder[]>([])
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [nomorOverride, setNomorOverride] = useState('')
  const [step, setStep] = useState<'select' | 'fill'>('select')
  const [loading, setLoading] = useState(true)
  const [dataDesa, setDataDesa] = useState<DataDesa | null>(null)
  const [perangkatDesa, setPerangkatDesa] = useState<PerangkatDesa[]>([])

  useEffect(() => { loadInitialData() }, [])

  const loadInitialData = async () => {
    try {
      const svc = await import('@/services/templateService')
      setTemplates(await svc.getAllTemplates())
      setDataDesa(await getDataDesa())
      setPerangkatDesa(await getAllPerangkatDesa())
    } catch {} finally { setLoading(false) }
  }

  const handleSelectTemplate = (t: TemplateSurat) => {
    setSelectedTemplate(t)
    const detected: DetectedPlaceholder[] = JSON.parse(t.placeholders || '[]')
    setPlaceholders(detected)
    const values: Record<string, string> = {}
    for (const p of detected) {
      if (p.kategori === 'desa' && dataDesa) {
        const map: Record<string, string> = { DESA: dataDesa.desa, KECAMATAN: dataDesa.kecamatan, KABUPATEN: dataDesa.kabupaten, PROVINSI: dataDesa.provinsi, KODE_POS: dataDesa.kode_pos, TELEPON_DESA: dataDesa.telepon, EMAIL_DESA: dataDesa.email, ALAMAT_KANTOR_DESA: dataDesa.alamat_kantor, KOP_SURAT: dataDesa.kop_surat || '' }
        values[p.token] = map[p.field] || ''
      } else if (p.kategori === 'perangkat_desa' && p.slot) {
        const m = p.slot.match(/^PD(\d+)$/)
        if (m) {
          const pd = perangkatDesa.find(x => x.urutan === parseInt(m[1]))
          if (pd) {
            const pdMap: Record<string, string> = { NAMA: pd.nama, NIK: pd.nik, NIPD: pd.nipd, JABATAN: pd.jabatan, ALAMAT: pd.alamat, NAMA_LENGKAP: [pd.gelar_depan, pd.nama, pd.gelar_belakang].filter(Boolean).join(' ') }
            values[p.token] = pdMap[p.field] || ''
          }
        }
      } else { values[p.token] = '' }
    }
    setFormValues(values)
    setStep('fill')
  }

  const handleGenerate = async () => {
    try {
      const config = await getNomorSuratConfig()
      if (!config) { alert('Konfigurasi nomor surat belum diatur'); return }
      const nomorUrut = await incrementCounter()
      const parts = generateNomorSuratParts(config.format, nomorUrut, config.kode_desa, selectedTemplate!.prefix_surat || '')
      const finalValues = { ...formValues }
      for (const p of placeholders) {
        if (p.kategori === 'nomor_surat') {
          if (p.field === 'NOMOR_SURAT' && nomorOverride) finalValues[p.token] = nomorOverride
          else finalValues[p.token] = parts[p.field as keyof typeof parts] || ''
        }
      }
      const svc = await import('@/services/templateService')
      const templateBytes = await svc.getTemplateBlob(selectedTemplate!.file_path)
      const { processDocxTemplate, downloadDocx } = await import('@/utils/docxProcessor')
      const result = await processDocxTemplate(templateBytes, finalValues)
      const filename = `${selectedTemplate!.nama.replace(/\s+/g, '_')}_${parts.S_NOMOR}.docx`
      await downloadDocx(result, filename)
      await saveRiwayat(selectedTemplate!.id, selectedTemplate!.nama, nomorOverride || parts.NOMOR_SURAT, nomorUrut, finalValues)
      alert('Surat berhasil di-generate!')
      setStep('select'); setSelectedTemplate(null); setFormValues({}); setNomorOverride('')
    } catch (err) { alert('Gagal generate surat'); console.error(err) }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  if (step === 'select') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Buat Surat</h1>
        <p className="text-sm text-muted-foreground">Pilih template surat</p>
        {templates.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Belum ada template.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {templates.map(t => (
              <Card key={t.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleSelectTemplate(t)}>
                <CardContent className="py-3">
                  <h3 className="font-medium">{t.nama}</h3>
                  {t.deskripsi && <p className="text-xs text-muted-foreground mt-0.5">{t.deskripsi}</p>}
                  <div className="flex gap-1.5 mt-2">
                    <Badge variant="secondary">{JSON.parse(t.placeholders || '[]').length} placeholder</Badge>
                    {t.warga_count > 0 && <Badge variant="outline">{t.warga_count} warga</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  const wargaSlots = [...new Set(placeholders.filter(p => p.kategori === 'warga' && p.slot).map(p => p.slot!))]
  const customPlaceholders = placeholders.filter(p => p.kategori === 'custom')
  const nomorPlaceholders = placeholders.filter(p => p.kategori === 'nomor_surat')

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat Surat</h1>
          <p className="text-sm text-muted-foreground">Template: {selectedTemplate?.nama}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setStep('select'); setSelectedTemplate(null) }}>Kembali</Button>
          <Button size="sm" onClick={handleGenerate}><Download className="mr-1 h-3.5 w-3.5" />Generate & Download</Button>
        </div>
      </div>

      {wargaSlots.map(slot => (
        <WargaSection key={slot} slot={slot} placeholders={placeholders.filter(p => p.slot === slot)} values={formValues} onChange={(updates) => setFormValues(prev => ({ ...prev, ...updates }))} dataDesa={dataDesa} />
      ))}

      {nomorPlaceholders.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Nomor Surat</CardTitle></CardHeader>
          <CardContent>
            <Label>Override Nomor Surat (opsional)</Label>
            <Input value={nomorOverride} onChange={e => setNomorOverride(e.target.value)} placeholder="Kosongkan untuk auto-generate" className="mt-1" />
          </CardContent>
        </Card>
      )}

      {customPlaceholders.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Data Tambahan</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {customPlaceholders.map(p => (
              <div key={p.token} className="space-y-1">
                <Label>{p.field}</Label>
                <Input value={formValues[p.token] || ''} onChange={e => setFormValues(prev => ({ ...prev, [p.token]: e.target.value }))} placeholder={`Isi ${p.field}`} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function WargaSection({ slot, placeholders, values, onChange, dataDesa }: { slot: string; placeholders: DetectedPlaceholder[]; values: Record<string, string>; onChange: (updates: Record<string, string>) => void; dataDesa: DataDesa | null }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Warga[]>([])
  const [showResults, setShowResults] = useState(false)

  const handleSearch = async (q: string) => {
    setQuery(q)
    if (q.length >= 2) { setResults(await searchWarga(q)); setShowResults(true) }
    else { setResults([]); setShowResults(false) }
  }

  const computeUmur = (tgl: string) => {
    const [d, m, y] = tgl.split('-').map(Number)
    const birth = new Date(y, m - 1, d)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
    return age.toString()
  }

  const handleSelect = async (w: Warga) => {
    const rt = w.rt.padStart(3, '0')
    const rw = w.rw.padStart(3, '0')

    // Auto-lookup kepala keluarga by NO_KK
    let kepalaKeluarga = ''
    if (w.no_kk) {
      const kk = await findKepalaKeluarga(w.no_kk)
      if (kk) kepalaKeluarga = kk.nama
    }

    // Build ALAMAT_LENGKAP with desa info
    const alamatParts = [`${w.alamat} RT ${rt} RW ${rw}`]
    if (dataDesa?.desa) alamatParts.push(`Desa ${dataDesa.desa}`)
    if (dataDesa?.kecamatan) alamatParts.push(`Kecamatan ${dataDesa.kecamatan}`)
    if (dataDesa?.kabupaten) alamatParts.push(`Kabupaten ${dataDesa.kabupaten}`)
    const alamatLengkap = alamatParts.join(' ')

    const map: Record<string, string> = { NIK: w.nik, NAMA: w.nama, JENIS_KELAMIN: w.jenis_kelamin, TEMPAT_LAHIR: w.tempat_lahir, TANGGAL_LAHIR: w.tanggal_lahir, UMUR: computeUmur(w.tanggal_lahir), AGAMA: w.agama, STATUS: w.status, HUB_KELUARGA: w.hub_keluarga, PENDIDIKAN: w.pendidikan, PEKERJAAN: w.pekerjaan, NAMA_IBU: w.nama_ibu, NAMA_AYAH: w.nama_ayah, ALAMAT: w.alamat, RT: rt, RW: rw, NO_KK: w.no_kk, ALAMAT_LENGKAP: alamatLengkap, TTL: `${w.tempat_lahir}, ${w.tanggal_lahir}`, KEPALA_KELUARGA: kepalaKeluarga }
    // Batch all updates at once to avoid stale state
    const updates: Record<string, string> = {}
    for (const p of placeholders) { if (p.field in map) updates[p.token] = map[p.field] }
    onChange(updates)
    setShowResults(false); setQuery('')
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{slot}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari warga (nama/NIK)..." value={query} onChange={e => handleSearch(e.target.value)} className="pl-8" />
          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
              {results.map(w => (
                <button key={w.id} onClick={() => handleSelect(w)} className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-0">
                  <p className="font-medium">{w.nama}</p>
                  <p className="text-xs text-muted-foreground">NIK: {w.nik} • {w.alamat} RT {w.rt} RW {w.rw} • {computeUmur(w.tanggal_lahir)} thn</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-3">
          {placeholders.map(p => (
            <div key={p.token} className="space-y-1">
              <Label className="text-xs">{p.field}</Label>
              <Input value={values[p.token] || ''} onChange={e => onChange({ [p.token]: e.target.value })} placeholder={p.field} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
