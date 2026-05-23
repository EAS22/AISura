import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, Download, Trash2, Search } from 'lucide-react'
import { getAllWarga, importWargaBatch, deleteAllWarga, getWargaCount } from '@/services/wargaService'
import { parseExcelOrCsv } from '@/utils/excelImporter'
import { generateTemplateWargaExcel } from '@/utils/excelExporter'
import type { Warga } from '@/types'

export function DataWarga() {
  const [wargaList, setWargaList] = useState<Warga[]>([])
  const [filtered, setFiltered] = useState<Warga[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const perPage = 50

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    if (search.length >= 2) {
      const q = search.toLowerCase()
      setFiltered(wargaList.filter(w => w.nama.toLowerCase().includes(q) || w.nik.includes(q)))
    } else { setFiltered(wargaList) }
    setPage(0)
  }, [search, wargaList])

  const loadData = async () => {
    try {
      const data = await getAllWarga()
      setWargaList(data); setFiltered(data)
      setCount(await getWargaCount())
    } catch {} finally { setLoading(false) }
  }

  const handleImport = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const filePath = await open({ filters: [{ name: 'Excel/CSV', extensions: ['xlsx', 'xls', 'csv'] }], multiple: false })
      if (!filePath) return
      const bytes = await readFile(filePath as string)
      const result = parseExcelOrCsv(bytes.buffer as ArrayBuffer)
      if (!result.success) { alert(`Import gagal: ${result.errors.join(', ')}`); return }
      const imported = await importWargaBatch(result.data)
      alert(`${imported} data warga berhasil diimport`)
      await loadData()
    } catch (err) { alert('Gagal import data'); console.error(err) }
  }

  const handleDownloadTemplate = async () => {
    try {
      const buffer = generateTemplateWargaExcel()
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')
      const filePath = await save({ defaultPath: 'template-import-warga.xlsx', filters: [{ name: 'Excel', extensions: ['xlsx'] }] })
      if (!filePath) return
      await writeFile(filePath, new Uint8Array(buffer))
    } catch (err) { console.error(err) }
  }

  const handleDeleteAll = async () => {
    if (!confirm('Hapus semua data warga?')) return
    await deleteAllWarga(); await loadData()
  }

  const paginated = filtered.slice(page * perPage, (page + 1) * perPage)
  const totalPages = Math.ceil(filtered.length / perPage)

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Warga</h1>
          <p className="text-sm text-muted-foreground">{count} data</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleDownloadTemplate}><Download className="mr-1 h-3.5 w-3.5" />Template</Button>
          <Button size="sm" onClick={handleImport}><Upload className="mr-1 h-3.5 w-3.5" />Import</Button>
          {count > 0 && <Button size="sm" variant="destructive" onClick={handleDeleteAll}><Trash2 className="mr-1 h-3.5 w-3.5" />Hapus Semua</Button>}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama atau NIK..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="w-12">JK</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead className="w-20">RT/RW</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((w, i) => (
                <TableRow key={w.id}>
                  <TableCell className="text-muted-foreground">{page * perPage + i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{w.nik}</TableCell>
                  <TableCell>{w.nama}</TableCell>
                  <TableCell>{w.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</TableCell>
                  <TableCell className="text-muted-foreground">{w.alamat}</TableCell>
                  <TableCell className="text-muted-foreground">{w.rt}/{w.rw}</TableCell>
                </TableRow>
              ))}
              {paginated.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
