import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, Trash2, RotateCcw, Search } from 'lucide-react'
import { getAllRiwayat, deleteRiwayat, deleteAllRiwayat } from '@/services/riwayatService'
import { exportRiwayatToExcel } from '@/utils/excelExporter'
import { useConfirm } from '@/hooks/use-confirm'
import type { RiwayatSurat } from '@/types'

export function RiwayatSuratPage() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [riwayat, setRiwayat] = useState<RiwayatSurat[]>([])
  const [filtered, setFiltered] = useState<RiwayatSurat[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    if (search.length >= 2) {
      const q = search.toLowerCase()
      setFiltered(riwayat.filter(r => r.nomor_surat.toLowerCase().includes(q) || r.template_nama.toLowerCase().includes(q)))
    } else { setFiltered(riwayat) }
  }, [search, riwayat])

  const loadData = async () => {
    try { setRiwayat(await getAllRiwayat()); setFiltered(await getAllRiwayat()) } catch {} finally { setLoading(false) }
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

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Riwayat Surat</h1>
        <div className="flex gap-2">
          {riwayat.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={handleExport}><Download className="mr-1 h-3.5 w-3.5" />Laporan</Button>
              <Button size="sm" variant="destructive" onClick={handleDeleteAll}><Trash2 className="mr-1 h-3.5 w-3.5" />Hapus Semua</Button>
            </>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nomor surat atau template..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      <Card>
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
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(r.tanggal_generate).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="font-mono text-xs">{r.nomor_surat}</TableCell>
                  <TableCell>{r.template_nama}</TableCell>
                  <TableCell>{r.pemohon_nama || '-'}</TableCell>
                  <TableCell className="font-mono text-xs">{r.pemohon_nik || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7"><RotateCcw className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Belum ada riwayat surat</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  )
}
