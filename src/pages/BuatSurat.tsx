import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, Download, CalendarIcon, Eye, Star, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { crmShell } from '@/lib/aisura-crm-ui'
import { useAI } from '@/contexts/AIContext'
import { searchWarga, findKepalaKeluarga } from '@/services/wargaService'
import { getDataDesa } from '@/services/desaService'
import { getAllPerangkatDesa } from '@/services/perangkatDesaService'
import { getNomorSuratConfig, incrementCounter, getCurrentCounter } from '@/services/nomorSuratService'
import { saveRiwayat } from '@/services/riwayatService'
import { generateNomorSuratParts, generateMultiNomorParts } from '@/utils/nomorSuratGenerator'
import { formatNamaPerangkat } from '@/lib/utils'
import type { TemplateSurat, DetectedPlaceholder, Warga, DataDesa, PerangkatDesa } from '@/types'

const TEMPLATE_ACCENTS = [
  { accent: 'blue', card: 'border-blue-200 bg-gradient-to-br from-blue-50 via-background to-background hover:border-blue-400 dark:border-blue-900/50 dark:from-blue-950/25', bar: 'bg-blue-600', badge: 'bg-blue-600/10 text-blue-700 dark:text-blue-300' },
  { accent: 'emerald', card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-background to-background hover:border-emerald-400 dark:border-emerald-900/50 dark:from-emerald-950/25', bar: 'bg-emerald-600', badge: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-300' },
  { accent: 'amber', card: 'border-amber-200 bg-gradient-to-br from-amber-50 via-background to-background hover:border-amber-400 dark:border-amber-900/50 dark:from-amber-950/25', bar: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  { accent: 'rose', card: 'border-rose-200 bg-gradient-to-br from-rose-50 via-background to-background hover:border-rose-400 dark:border-rose-900/50 dark:from-rose-950/25', bar: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  { accent: 'cyan', card: 'border-cyan-200 bg-gradient-to-br from-cyan-50 via-background to-background hover:border-cyan-400 dark:border-cyan-900/50 dark:from-cyan-950/25', bar: 'bg-cyan-600', badge: 'bg-cyan-600/10 text-cyan-700 dark:text-cyan-300' },
  { accent: 'violet', card: 'border-violet-200 bg-gradient-to-br from-violet-50 via-background to-background hover:border-violet-400 dark:border-violet-900/50 dark:from-violet-950/25', bar: 'bg-violet-600', badge: 'bg-violet-600/10 text-violet-700 dark:text-violet-300' },
]

export function getTemplateAccent(index: number) {
  return TEMPLATE_ACCENTS[index % TEMPLATE_ACCENTS.length]
}

export function getFieldStateClass(value?: string) {
  return value
    ? 'border-blue-200 bg-white shadow-[0_8px_20px_rgba(37,99,235,0.08)] dark:border-blue-900/60 dark:bg-zinc-950/80'
    : 'border-dashed border-slate-300 bg-slate-50/70 dark:border-slate-700 dark:bg-zinc-900/50'
}

export function BuatSurat() {
  const ai = useAI()
  const [templates, setTemplates] = useState<TemplateSurat[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSurat | null>(null)
  const [placeholders, setPlaceholders] = useState<DetectedPlaceholder[]>([])
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [nomorOverride, setNomorOverride] = useState('')
  const [tanggalOverride, setTanggalOverride] = useState<Date | undefined>(undefined)
  const [step, setStep] = useState<'select' | 'fill'>('select')
  const [loading, setLoading] = useState(true)
  const [dataDesa, setDataDesa] = useState<DataDesa | null>(null)
  const [perangkatDesa, setPerangkatDesa] = useState<PerangkatDesa[]>([])
  const [templateSearch, setTemplateSearch] = useState('')
  const [nomorPreview, setNomorPreview] = useState('')
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadInitialData() }, [])

  const loadInitialData = async () => {
    try {
      const svc = await import('@/services/templateService')
      setTemplates(await svc.getAllTemplates())
      setDataDesa(await getDataDesa())
      setPerangkatDesa(await getAllPerangkatDesa())
    } catch {} finally { setLoading(false) }
  }

  const handleToggleFavorite = async (e: React.MouseEvent, t: TemplateSurat) => {
    e.stopPropagation()
    const next = t.is_favorite ? 0 : 1
    // Optimistic update
    setTemplates((prev) =>
      prev.map((tt) => (tt.id === t.id ? { ...tt, is_favorite: next } : tt)),
    )
    try {
      const svc = await import('@/services/templateService')
      await svc.setTemplateFavorite(t.id, next === 1)
    } catch (err) {
      console.error('Failed to toggle favorite', err)
      // Revert on error
      setTemplates((prev) =>
        prev.map((tt) => (tt.id === t.id ? { ...tt, is_favorite: t.is_favorite } : tt)),
      )
    }
  }

  const handleSelectTemplate = (t: TemplateSurat) => {
    setSelectedTemplate(t)
    const detected: DetectedPlaceholder[] = JSON.parse(t.placeholders || '[]')
    setPlaceholders(detected)
    const values: Record<string, string> = {}
    // Aliases that mean "the signer of this letter" — should follow signer_urutan, not literal PD1.
    const SIGNER_ALIAS_TOKENS = new Set([
      'KEPALA_DESA', 'NIK_KEPALA_DESA', 'NIPD_KEPALA_DESA', 'JABATAN_KEPALA_DESA', 'ALAMAT_KEPALA_DESA',
    ])
    const signerUrutan = t.signer_urutan || 1
    for (const p of detected) {
      if (p.kategori === 'desa' && dataDesa) {
        const map: Record<string, string> = { DESA: dataDesa.desa, KECAMATAN: dataDesa.kecamatan, KABUPATEN: dataDesa.kabupaten, PROVINSI: dataDesa.provinsi, KODE_POS: dataDesa.kode_pos, TELEPON_DESA: dataDesa.telepon, EMAIL_DESA: dataDesa.email, ALAMAT_KANTOR_DESA: dataDesa.alamat_kantor, KOP_SURAT: dataDesa.kop_surat || '' }
        values[p.token] = map[p.field] || ''
      } else if (p.kategori === 'perangkat_desa' && p.slot) {
        const m = p.slot.match(/^PD(\d+)$/)
        if (m) {
          // Redirect signer aliases (KEPALA_DESA*) to the configured signer.
          const isAlias = SIGNER_ALIAS_TOKENS.has(p.token.replace(/_(U|L|P)$/, ''))
          const targetUrutan = isAlias ? signerUrutan : parseInt(m[1])
          const pd = perangkatDesa.find(x => x.urutan === targetUrutan)
          if (pd) {
            const pdMap: Record<string, string> = { NAMA: pd.nama, NIK: pd.nik, NIPD: pd.nipd, JABATAN: pd.jabatan, ALAMAT: pd.alamat, NAMA_LENGKAP: formatNamaPerangkat(pd.gelar_depan, pd.nama, pd.gelar_belakang) }
            values[p.token] = pdMap[p.field] || ''
          }
        }
      } else { values[p.token] = '' }
    }
    setFormValues(values)
    setStep('fill')
    // Load nomor surat preview
    loadNomorPreview(t.prefix_surat || '', detected)
  }

  const loadNomorPreview = async (prefix: string, detected?: typeof placeholders) => {
    try {
      const config = await getNomorSuratConfig()
      if (!config) return
      const counter = await getCurrentCounter()
      const phs = detected || placeholders
      const nomorSlots = [...new Set(phs.filter(p => p.kategori === 'nomor_surat' && p.slot).map(p => p.slot!))]
      const slotCount = nomorSlots.length || 1
      const multiParts = generateMultiNomorParts(config.format, counter, config.kode_desa, prefix, slotCount)
      if (slotCount > 1) {
        const previews = Object.entries(multiParts).map(([slot, parts]) => `${slot}: ${parts.NOMOR_SURAT}`)
        setNomorPreview(previews.join(' • '))
      } else {
        setNomorPreview(multiParts['N1'].NOMOR_SURAT)
      }
    } catch {}
  }

  /** Find the value for a W1 field by scanning placeholders for matching slot+field */
  const findW1Value = (finalValues: Record<string, string>, field: string): string => {
    const p = placeholders.find(ph => ph.slot === 'W1' && ph.field === field)
    if (p) return finalValues[p.token] || ''
    return ''
  }

  /** Build the final docx blob (shared by download and preview) */
  const buildDocx = async (): Promise<{ blob: Blob; filename: string; finalValues: Record<string, string>; nomorUrut: number; nomorSurat: string; slotCount: number } | null> => {
    const config = await getNomorSuratConfig()
    if (!config) { alert('Konfigurasi nomor surat belum diatur'); return null }

    // Determine nomor slots
    const nomorSlots = [...new Set(placeholders.filter(p => p.kategori === 'nomor_surat' && p.slot).map(p => p.slot!))]
    const slotCount = nomorSlots.length || 1

    const nomorUrut = await incrementCounter(slotCount)
    const suratDate = tanggalOverride || new Date()
    const multiParts = generateMultiNomorParts(config.format, nomorUrut, config.kode_desa, selectedTemplate!.prefix_surat || '', slotCount, suratDate)

    const finalValues = { ...formValues }
    for (const p of placeholders) {
      if (p.kategori === 'nomor_surat') {
        const slot = p.slot || 'N1'
        const parts = multiParts[slot]
        if (parts) {
          if (p.field === 'NOMOR_SURAT' && nomorOverride && slot === 'N1') {
            finalValues[p.token] = nomorOverride
          } else {
            finalValues[p.token] = parts[p.field as keyof typeof parts] || ''
          }
        }
      }
    }
    const svc = await import('@/services/templateService')
    const templateBytes = await svc.getTemplateBlob(selectedTemplate!.file_path)
    const { processDocxTemplate } = await import('@/utils/docxProcessor')
    const result = await processDocxTemplate(templateBytes, finalValues)
    const blob = new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const filename = `${selectedTemplate!.nama.replace(/\s+/g, '_')}_${multiParts['N1'].S_NOMOR}.docx`
    return { blob, filename, finalValues, nomorUrut, nomorSurat: nomorOverride || multiParts['N1'].NOMOR_SURAT, slotCount }
  }

  const handleGenerate = async () => {
    try {
      const result = await buildDocx()
      if (!result) return
      const { downloadDocx } = await import('@/utils/docxProcessor')
      await downloadDocx(await result.blob.arrayBuffer() as ArrayBuffer, result.filename)

      const pemohon = {
        nama: findW1Value(result.finalValues, 'NAMA'),
        nik: findW1Value(result.finalValues, 'NIK'),
        alamat: findW1Value(result.finalValues, 'ALAMAT_LENGKAP') || findW1Value(result.finalValues, 'ALAMAT'),
      }
      const nomorUrutAkhir = result.nomorUrut + result.slotCount - 1
      await saveRiwayat(selectedTemplate!.id, selectedTemplate!.nama, result.nomorSurat, result.nomorUrut, result.finalValues, pemohon, nomorUrutAkhir)
      alert('Surat berhasil di-generate!')
      setStep('select'); setSelectedTemplate(null); setFormValues({}); setNomorOverride(''); setTanggalOverride(undefined)
    } catch (err) { alert('Gagal generate surat'); console.error(err) }
  }

  const handlePreview = async () => {
    try {
      setPreviewLoading(true)
      setPreviewOpen(true)
      const config = await getNomorSuratConfig()
      if (!config) { alert('Konfigurasi nomor surat belum diatur'); setPreviewOpen(false); setPreviewLoading(false); return }
      // Build preview without incrementing counter
      const counter = await getCurrentCounter()
      const nomorSlots = [...new Set(placeholders.filter(p => p.kategori === 'nomor_surat' && p.slot).map(p => p.slot!))]
      const slotCount = nomorSlots.length || 1
      const suratDate = tanggalOverride || new Date()
      const multiParts = generateMultiNomorParts(config.format, counter, config.kode_desa, selectedTemplate!.prefix_surat || '', slotCount, suratDate)

      const finalValues = { ...formValues }
      for (const p of placeholders) {
        if (p.kategori === 'nomor_surat') {
          const slot = p.slot || 'N1'
          const parts = multiParts[slot]
          if (parts) {
            if (p.field === 'NOMOR_SURAT' && nomorOverride && slot === 'N1') {
              finalValues[p.token] = nomorOverride
            } else {
              finalValues[p.token] = parts[p.field as keyof typeof parts] || ''
            }
          }
        }
      }
      const svc = await import('@/services/templateService')
      const templateBytes = await svc.getTemplateBlob(selectedTemplate!.file_path)
      const { processDocxTemplate } = await import('@/utils/docxProcessor')
      const result = await processDocxTemplate(templateBytes, finalValues)
      const blob = new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      setPreviewBlob(blob)
    } catch (err) { alert('Gagal membuat preview'); setPreviewOpen(false); setPreviewLoading(false); console.error(err) }
  }

  const handlePreviewDownload = async () => {
    if (!previewBlob) return
    try {
      // For actual download, use the full generate flow (increments counter + saves riwayat)
      await handleGenerate()
      setPreviewOpen(false)
    } catch (err) { console.error(err) }
  }

  // Callback ref: render docx-preview when the container element mounts
  const previewCallbackRef = (node: HTMLDivElement | null) => {
    previewRef.current = node
    if (node && previewBlob) {
      node.innerHTML = ''
      import('docx-preview').then(({ renderAsync }) => {
        renderAsync(previewBlob, node, undefined, {
          className: 'docx-preview-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
        }).then(() => {
          setPreviewLoading(false)
        }).catch(err => {
          console.error('docx-preview error:', err)
          setPreviewLoading(false)
        })
      })
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>


  if (step === 'select') {
    const filteredTemplates = templateSearch
      ? templates.filter(t => t.nama.toLowerCase().includes(templateSearch.toLowerCase()))
      : templates
    const favoriteTemplates = filteredTemplates.filter((t) => t.is_favorite === 1)
    const otherTemplates = filteredTemplates.filter((t) => t.is_favorite !== 1)
    const aiAvailable = !!ai.credentials

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Buat Surat</h1>
            <p className="text-sm text-muted-foreground">Pilih template surat secara manual atau biarkan AI agent memandu prosesnya.</p>
          </div>
          <Button
            size="sm"
            onClick={() => ai.openDrawer({ mode: 'chat' })}
            disabled={!aiAvailable}
            title={aiAvailable ? 'Buka AI agent' : 'Aktifkan AI di Pengaturan dulu'}
            className={cn(
              'group relative shrink-0 overflow-hidden rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700 dark:shadow-none',
              !aiAvailable && 'opacity-60',
            )}
          >
            <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%]" />
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Buat Surat dengan AI Agent
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari template..." value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} className="pl-8" />
        </div>

        {filteredTemplates.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            {templates.length === 0 ? 'Belum ada template.' : 'Template tidak ditemukan.'}
          </CardContent></Card>
        ) : (
          <div className="space-y-5">
            {favoriteTemplates.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                  <h2 className="text-sm font-semibold tracking-tight">Favorit</h2>
                  <Badge variant="outline" className="rounded-full text-[10px]">
                    {favoriteTemplates.length}
                  </Badge>
                </div>
                <TemplateGrid
                  templates={favoriteTemplates}
                  onSelect={handleSelectTemplate}
                  onToggleFavorite={handleToggleFavorite}
                />
              </section>
            )}

            {otherTemplates.length > 0 && (
              <section className="space-y-2">
                {favoriteTemplates.length > 0 && (
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
                      Template lain
                    </h2>
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {otherTemplates.length}
                    </Badge>
                  </div>
                )}
                <TemplateGrid
                  templates={otherTemplates}
                  onSelect={handleSelectTemplate}
                  onToggleFavorite={handleToggleFavorite}
                  startIndex={favoriteTemplates.length}
                />
              </section>
            )}
          </div>
        )}
      </div>
    )
  }

  const wargaSlots = [...new Set(placeholders.filter(p => p.kategori === 'warga' && p.slot).map(p => p.slot!))]
  const customPlaceholders = placeholders.filter(p => p.kategori === 'custom')
  const nomorPlaceholders = placeholders.filter(p => p.kategori === 'nomor_surat')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Static header */}
      <div className={cn(crmShell.glass, 'shrink-0 p-4')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Buat Surat</h1>
            <p className="text-sm text-muted-foreground">Template: {selectedTemplate?.nama}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => { setStep('select'); setSelectedTemplate(null) }}>
            Kembali
          </Button>
        </div>
      </div>

      {/* Scrollable form area */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 py-4">

          {/* Data Surat - nomor & tanggal override (moved to top) */}
          {nomorPlaceholders.length > 0 && (
            <Card className="border-blue-200/70 bg-gradient-to-br from-blue-50/80 via-background to-background shadow-sm dark:border-blue-900/50 dark:from-blue-950/20">
              <CardHeader><CardTitle className="text-sm">Data Surat</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Override Nomor Surat (opsional)</Label>
                    <Input value={nomorOverride} onChange={e => setNomorOverride(e.target.value)} placeholder="Kosongkan untuk auto-generate" />
                    {!nomorOverride && nomorPreview && (
                      <p className="text-xs text-muted-foreground">Otomatis: <span className="font-mono font-medium text-foreground">{nomorPreview}</span></p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Override Tanggal Surat (opsional)</Label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-10', !tanggalOverride && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {tanggalOverride ? tanggalOverride.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Pilih tanggal...'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={tanggalOverride}
                          onSelect={(date) => { setTanggalOverride(date); setDatePickerOpen(false) }}
                          className="scale-110 origin-top-left m-2"
                        />
                      </PopoverContent>
                    </Popover>
                    {tanggalOverride && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setTanggalOverride(undefined)}>Reset tanggal</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warga sections */}
          {wargaSlots.map((slot, idx) => (
            <WargaSection key={slot} slot={slot} index={idx + 1} placeholders={placeholders.filter(p => p.slot === slot)} values={formValues} onChange={(updates) => setFormValues(prev => ({ ...prev, ...updates }))} dataDesa={dataDesa} />
          ))}

          {/* Custom placeholders */}
          {customPlaceholders.length > 0 && (
            <Card className="border-blue-200/70 bg-gradient-to-br from-blue-50/70 via-background to-background shadow-sm dark:border-blue-900/50 dark:from-blue-950/20">
              <CardHeader><CardTitle className="text-sm">Data Tambahan</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {customPlaceholders.map(p => (
                  <div key={p.token} className={cn('space-y-1 rounded-xl border p-3 transition-colors', getFieldStateClass(formValues[p.token]))}>
                    <Label className="text-[11px] uppercase tracking-wide text-blue-700 dark:text-blue-300">{p.field}</Label>
                    <Input value={formValues[p.token] || ''} onChange={e => setFormValues(prev => ({ ...prev, [p.token]: e.target.value }))} placeholder={`Isi ${p.field}`} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Static action bar */}
      <div className={cn(crmShell.glass, 'shrink-0 p-3')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {wargaSlots.length > 0 ? `${wargaSlots.length} section warga` : 'Tanpa data warga'}
            {customPlaceholders.length > 0 ? ` • ${customPlaceholders.length} field tambahan` : ''}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setStep('select'); setSelectedTemplate(null) }}>
              Kembali
            </Button>
            <Button className="w-full sm:w-auto" onClick={handlePreview}>
              <Eye className="mr-1 h-3.5 w-3.5" />Preview & Download
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="!max-w-[95vw] !w-[95vw] !h-[95vh] flex flex-col p-0" showCloseButton={false}>
          <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
            <DialogTitle>Preview Surat</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2">
            {previewLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <span className="ml-3 text-sm text-muted-foreground">Memproses preview...</span>
              </div>
            )}
            <div ref={previewCallbackRef} style={{ display: previewLoading ? 'none' : 'block' }} />
          </div>
          <DialogFooter className="shrink-0 px-6 pb-6 pt-2 border-t">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Tutup</Button>
            <Button onClick={handlePreviewDownload}>
              <Download className="mr-1 h-3.5 w-3.5" />Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateGrid({
  templates,
  onSelect,
  onToggleFavorite,
  startIndex = 0,
}: {
  templates: TemplateSurat[]
  onSelect: (t: TemplateSurat) => void
  onToggleFavorite: (e: React.MouseEvent, t: TemplateSurat) => void
  startIndex?: number
}) {
  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((t, idx) => {
        const accent = getTemplateAccent(startIndex + idx)
        const isFavorite = t.is_favorite === 1
        return (
          <Card
            key={t.id}
            className={cn(
              'group relative cursor-pointer overflow-hidden shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
              accent.card,
            )}
            onClick={() => onSelect(t)}
          >
            <div className={cn('absolute inset-y-0 left-0 w-1.5', accent.bar)} />
            <button
              type="button"
              onClick={(e) => onToggleFavorite(e, t)}
              title={isFavorite ? 'Hapus dari favorit' : 'Tandai favorit'}
              className={cn(
                'absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border bg-white/85 backdrop-blur transition-colors dark:bg-zinc-950/70',
                isFavorite
                  ? 'border-amber-300/80 text-amber-500 hover:border-amber-400'
                  : 'border-slate-200/80 text-slate-400 hover:border-amber-300 hover:text-amber-500 dark:border-slate-700',
              )}
            >
              <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-amber-400')} />
            </button>
            <CardContent className="py-4 pl-5 pr-10">
              <h3 className="font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300">
                {t.nama}
              </h3>
              {t.deskripsi && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.deskripsi}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Badge variant="secondary" className={accent.badge}>
                  {JSON.parse(t.placeholders || '[]').length} placeholder
                </Badge>
                {t.warga_count > 0 && <Badge variant="outline">{t.warga_count} warga</Badge>}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function WargaSection({ slot, index, placeholders, values, onChange, dataDesa }: { slot: string; index: number; placeholders: DetectedPlaceholder[]; values: Record<string, string>; onChange: (updates: Record<string, string>) => void; dataDesa: DataDesa | null }) {  const [query, setQuery] = useState('')
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

  const BULAN_INDONESIA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  /** Convert dd-mm-yyyy to "dd mmmm yyyy" (e.g. "17 Agustus 1945") */
  const formatTanggalPanjang = (tgl: string): string => {
    const [d, m, y] = tgl.split('-').map(Number)
    if (!d || !m || !y) return tgl
    return `${d} ${BULAN_INDONESIA[m - 1]} ${y}`
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

    const map: Record<string, string> = { NIK: w.nik, NAMA: w.nama, JENIS_KELAMIN: w.jenis_kelamin, TEMPAT_LAHIR: w.tempat_lahir, TANGGAL_LAHIR: w.tanggal_lahir, TANGGAL_LAHIR_PANJANG: formatTanggalPanjang(w.tanggal_lahir), UMUR: computeUmur(w.tanggal_lahir), AGAMA: w.agama, STATUS: w.status, HUB_KELUARGA: w.hub_keluarga, PENDIDIKAN: w.pendidikan, PEKERJAAN: w.pekerjaan, NAMA_IBU: w.nama_ibu, NAMA_AYAH: w.nama_ayah, ALAMAT: w.alamat, RT: rt, RW: rw, NO_KK: w.no_kk, ALAMAT_LENGKAP: alamatLengkap, TTL: `${w.tempat_lahir}, ${w.tanggal_lahir}`, KEPALA_KELUARGA: kepalaKeluarga }
    // Batch all updates at once to avoid stale state
    const updates: Record<string, string> = {}
    for (const p of placeholders) { if (p.field in map) updates[p.token] = map[p.field] }
    onChange(updates)
    setShowResults(false); setQuery('')
  }

  return (
    <Card className="border-blue-200/70 bg-gradient-to-br from-blue-50/70 via-background to-background shadow-sm dark:border-blue-900/50 dark:from-blue-950/20">
      <CardHeader><CardTitle className="text-sm">Data Warga {index}</CardTitle></CardHeader>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {placeholders.map(p => (
            <div key={p.token} className={cn('space-y-1 rounded-xl border p-3 transition-colors', getFieldStateClass(values[p.token]))}>
              <Label className="text-[11px] uppercase tracking-wide text-blue-700 dark:text-blue-300">{p.field}</Label>
              <Input value={values[p.token] || ''} onChange={e => onChange({ [p.token]: e.target.value })} placeholder={p.field} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
