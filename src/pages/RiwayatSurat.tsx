import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, Trash2, RotateCcw, Search } from 'lucide-react'
import { getAllRiwayat, deleteRiwayat, deleteAllRiwayat, getRiwayatData } from '@/services/riwayatService'
import { exportRiwayatToExcel } from '@/utils/excelExporter'
import { useConfirm } from '@/hooks/use-confirm'
import type { RiwayatSurat } from '@/types'

export function RiwayatSuratPage() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [riwayat, setRiwayat] = useState<RiwayatSurat[]>([])
  const [filtered, setFiltered] = useState<RiwayatSurat[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
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
      <div className="shrink-0 rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Riwayat Surat</h1>
            <p className="text-sm text-muted-foreground">{riwayat.length} riwayat</p>
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
        <Card className="overflow-hidden border-border/80 shadow-sm">
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
                  <TableRow key={r.id}>
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
                      <div className="flex justify-end gap-1">
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
        <div className="shrink-0 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
            <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ConfirmDialog />
    </div>
  )
}
