import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Download, Trash2, RotateCcw, Search, FileText } from 'lucide-react'
import { getAllRiwayat, deleteRiwayat, deleteAllRiwayat, getRiwayatData } from '@/services/riwayatService'
import { exportRiwayatToExcel } from '@/utils/excelExporter'
import { useConfirm } from '@/hooks/use-confirm'
import type { RiwayatSurat } from '@/types'
import { cn } from '@/lib/utils'
import { crmShell } from '@/lib/aisura-crm-ui'

export function RiwayatSuratPage() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [riwayat, setRiwayat] = useState<RiwayatSurat[]>([])
  const [filtered, setFiltered] = useState<RiwayatSurat[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [detailModal, setDetailModal] = useState(false)
  const [detailRiwayat, setDetailRiwayat] = useState<RiwayatSurat | null>(null)
  const [detailPlaceholders, setDetailPlaceholders] = useState<Record<string, string>>({})
  const [detailLoading, setDetailLoading] = useState(false)
  const perPage = 50

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    if (search.length >= 2) {
      const q = search.toLowerCase()
      setFiltered(riwayat.filter(r => r.nomor_surat.toLowerCase().includes(q) || r.template_nama.toLowerCase().includes(q) || (r.pemohon_nama || '').toLowerCase().includes(q)))
    } else { setFiltered(riwayat) }
    setPage(0)
  }, [search, riwayat])

  const loadData = async () => {
    try { const data = await getAllRiwayat(); setRiwayat(data); setFiltered(data) } catch {} finally { setLoading(false) }
  }

  const handleExport = async () => {
    try {
      const buffer = exportRiwayatToExcel(riwayat)
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')
      const filePath = await save({ defaultPath: `laporan-surat-${new Date().toISOString().split('T')[0]}.xlsx`, filters: [{ name: 'Excel', extensions: ['xlsx'] }] })
      if (!filePath) return
      await writeFile(filePath, new Uint8Array(buffer))
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Hapus Riwayat?', description: 'Riwayat surat ini akan dihapus.' })
    if (!ok) return
    await deleteRiwayat(id); await loadData()
  }

  const handleDeleteAll = async () => {
    const ok = await confirm({ title: 'Hapus Semua Riwayat?', description: 'Semua riwayat surat akan dihapus permanen.' })
    if (!ok) return
    await deleteAllRiwayat(); await loadData()
  }

  const handleShowDetail = async (r: RiwayatSurat) => {
    setDetailRiwayat(r)
    setDetailPlaceholders({})
    setDetailModal(true)
    setDetailLoading(true)
    try {
      const data = await getRiwayatData(r.id)
      setDetailPlaceholders(data || {})
    } catch (err) {
      console.error('Gagal load detail riwayat', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleRegenerate = async (r: RiwayatSurat) => {
    try {
      // Load saved placeholder data
      const placeholderData = await getRiwayatData(r.id)
      if (!placeholderData || Object.keys(placeholderData).length === 0) {
        alert('Data placeholder tidak ditemukan untuk riwayat ini.')
        return
      }
      // Load template file
      const svc = await import('@/services/templateService')
      const template = (await svc.getAllTemplates()).find(t => t.id === r.template_id)
      if (!template) { alert('Template tidak ditemukan. Mungkin sudah dihapus.'); return }
      const templateBytes = await svc.getTemplateBlob(template.file_path)
      const { processDocxTemplate, downloadDocx } = await import('@/utils/docxProcessor')
      const result = await processDocxTemplate(templateBytes, placeholderData)
      const filename = `${r.template_nama.replace(/\s+/g, '_')}_${r.nomor_surat.replace(/\//g, '-')}.docx`
      await downloadDocx(result, filename)
    } catch (err) { alert('Gagal generate ulang surat'); console.error(err) }
  }

  const paginated = filtered.slice(page * perPage, (page + 1) * perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Static header */}
      <div className={cn(crmShell.card, 'shrink-0 p-4')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={crmShell.eyebrow}>Document history</p>
            <h1 className={crmShell.title}>Riwayat Surat</h1>
            <p className={crmShell.subtitle}>{riwayat.length} riwayat surat tersimpan</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {riwayat.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={handleExport}><Download className="mr-1 h-3.5 w-3.5" />Laporan</Button>
                <Button size="sm" variant="destructive" onClick={handleDeleteAll}><Trash2 className="mr-1 h-3.5 w-3.5" />Hapus Semua</Button>
              </>
            )}
          </div>
        </div>
        <div className="relative max-w-sm mt-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nomor surat, template, atau pemohon..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
      </div>

      {/* Scrollable table */}
      <div className="min-h-0 flex-1 overflow-y-auto py-4">
        <Card className={cn(crmShell.card, 'overflow-hidden')}>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Nomor Surat</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Pemohon</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="font-table">
                {paginated.map((r, i) => (
                  <TableRow
                    key={r.id}
                    onClick={() => handleShowDetail(r)}
                    className="cursor-pointer transition-colors hover:bg-blue-50/60 dark:hover:bg-blue-950/20"
                  >
                    <TableCell className="text-muted-foreground font-data-number">{page * perPage + i + 1}</TableCell>
                    <TableCell className="font-data-number text-foreground/80">{new Date(r.tanggal_generate).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="font-semibold font-data-number">
                      {r.nomor_surat}
                      {r.nomor_urut_akhir > r.nomor_urut && (
                        <span className="ml-2 rounded-full bg-blue-600/10 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">+{r.nomor_urut_akhir - r.nomor_urut}</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-foreground/80">{r.template_nama}</TableCell>
                    <TableCell className="font-semibold">{r.pemohon_nama || '-'}</TableCell>
                    <TableCell className="font-data-number text-foreground/80">{r.pemohon_nik || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRegenerate(r)} title="Generate ulang"><RotateCcw className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada riwayat surat</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Static pagination footer */}
      {totalPages > 1 && (
        <div className={cn(crmShell.card, 'shrink-0 p-3')}>
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
            <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ConfirmDialog />

      {/* Detail Modal */}
      <Dialog open={detailModal} onOpenChange={setDetailModal}>
        <DialogContent className="!max-w-[70vw] !w-[70vw] max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Detail Riwayat Surat
            </DialogTitle>
          </DialogHeader>
          {detailRiwayat && (
            <RiwayatDetailView
              riwayat={detailRiwayat}
              placeholders={detailPlaceholders}
              loading={detailLoading}
            />
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDetailModal(false)}>Tutup</Button>
            {detailRiwayat && (
              <Button onClick={() => { setDetailModal(false); handleRegenerate(detailRiwayat) }}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" />Generate Ulang
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RiwayatDetailView({ riwayat, placeholders, loading }: { riwayat: RiwayatSurat; placeholders: Record<string, string>; loading: boolean }) {
  const formatDate = (iso?: string) => {
    if (!iso) return '-'
    try { return new Date(iso).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) } catch { return iso }
  }

  // Group placeholders by category prefix
  const groups: Record<string, [string, string][]> = {
    'Nomor Surat': [],
    'Warga': [],
    'Perangkat Desa': [],
    'Desa': [],
    'Lainnya': [],
  }

  const DESA_TOKENS = ['DESA', 'KECAMATAN', 'KABUPATEN', 'PROVINSI', 'KODE_POS', 'TELEPON_DESA', 'EMAIL_DESA', 'ALAMAT_KANTOR_DESA', 'KOP_SURAT']
  const PERANGKAT_ALIASES = ['KEPALA_DESA', 'NIK_KEPALA_DESA', 'NIPD_KEPALA_DESA', 'JABATAN_KEPALA_DESA', 'ALAMAT_KEPALA_DESA', 'SEKRETARIS_DESA', 'NIK_SEKRETARIS_DESA', 'NIPD_SEKRETARIS_DESA', 'JABATAN_SEKRETARIS_DESA', 'ALAMAT_SEKRETARIS_DESA']

  for (const [key, value] of Object.entries(placeholders)) {
    if (/^N\d+_/.test(key) || key === 'NOMOR_SURAT' || key.startsWith('S_')) {
      groups['Nomor Surat'].push([key, value])
    } else if (/^W\d+_/.test(key)) {
      groups['Warga'].push([key, value])
    } else if (/^PD\d+_/.test(key) || PERANGKAT_ALIASES.includes(key.replace(/_(U|L|P)$/, ''))) {
      groups['Perangkat Desa'].push([key, value])
    } else if (DESA_TOKENS.includes(key.replace(/_(U|L|P)$/, ''))) {
      groups['Desa'].push([key, value])
    } else {
      groups['Lainnya'].push([key, value])
    }
  }

  // Sort each group alphabetically (with W1, W2, ... ordered numerically)
  const slotSort = (a: [string, string], b: [string, string]) => a[0].localeCompare(b[0], 'en', { numeric: true })
  for (const k of Object.keys(groups)) groups[k].sort(slotSort)

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/80 via-background to-background p-4 dark:border-blue-900/50 dark:from-blue-950/20">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Nomor Surat" value={riwayat.nomor_surat} bold mono />
          <DetailItem label="Template" value={riwayat.template_nama} bold />
          <DetailItem label="Tanggal Generate" value={formatDate(riwayat.tanggal_generate)} />
          <DetailItem
            label="Nomor Urut"
            value={riwayat.nomor_urut_akhir > riwayat.nomor_urut
              ? `${riwayat.nomor_urut} – ${riwayat.nomor_urut_akhir}`
              : String(riwayat.nomor_urut)}
            mono
          />
        </div>
      </div>

      {/* Pemohon snapshot */}
      <DetailGroup title="Pemohon">
        <DetailItem label="Nama" value={riwayat.pemohon_nama} bold />
        <DetailItem label="NIK" value={riwayat.pemohon_nik} mono />
        <DetailItem label="Alamat" value={riwayat.pemohon_alamat} colSpan />
      </DetailGroup>

      {/* Placeholder data per group */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Memuat data placeholder...
        </div>
      ) : (
        <>
          {Object.entries(groups).map(([title, entries]) => entries.length > 0 && (
            <DetailGroup key={title} title={`Data ${title}`}>
              {entries.map(([key, value]) => {
                const isImage = typeof value === 'string' && value.startsWith('data:image/')
                return (
                  <DetailItem
                    key={key}
                    label={key}
                    value={isImage ? '(gambar)' : value}
                    colSpan={(value || '').length > 40 || isImage}
                    mono
                  />
                )
              })}
            </DetailGroup>
          ))}
          {Object.values(groups).every(g => g.length === 0) && (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Tidak ada data placeholder tersimpan untuk riwayat ini.
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{title}</p>
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-slate-50/70 p-3 sm:grid-cols-2 lg:grid-cols-3 dark:bg-zinc-900/50">
        {children}
      </div>
    </div>
  )
}

function DetailItem({ label, value, bold, mono, colSpan }: { label: string; value?: string | number; bold?: boolean; mono?: boolean; colSpan?: boolean }) {
  const display = value === '' || value === null || value === undefined ? '-' : value
  return (
    <div className={cn('space-y-0.5', colSpan && 'col-span-full')}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('text-sm break-words', bold && 'font-semibold', mono && 'font-data-number')}>{display}</p>
    </div>
  )
}
