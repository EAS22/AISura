import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Upload, Download, Trash2, Search, Pencil, Plus } from 'lucide-react'
import { getAllWarga, importWargaBatch, deleteAllWarga, deleteWarga, updateWarga, addWarga, getWargaCount } from '@/services/wargaService'
import { parseExcelOrCsv } from '@/utils/excelImporter'
import { generateTemplateWargaExcel } from '@/utils/excelExporter'
import { useConfirm } from '@/hooks/use-confirm'
import type { Warga } from '@/types'

export function DataWarga() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [wargaList, setWargaList] = useState<Warga[]>([])
  const [filtered, setFiltered] = useState<Warga[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [editModal, setEditModal] = useState(false)
  const [editData, setEditData] = useState<Partial<Warga>>({})
  const [addModal, setAddModal] = useState(false)
  const [addData, setAddData] = useState<Partial<Warga>>({})
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
    const ok = await confirm({ title: 'Hapus Semua Data Warga?', description: 'Semua data warga akan dihapus permanen.' })
    if (!ok) return
    await deleteAllWarga(); await loadData()
  }

  const handleEdit = (w: Warga) => {
    setEditData({ ...w })
    setEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editData.id) return
    try {
      await updateWarga(editData.id, editData as any)
      setEditModal(false)
      await loadData()
    } catch { alert('Gagal menyimpan') }
  }

  const handleDeleteSingle = async (id: string) => {
    const ok = await confirm({ title: 'Hapus Data Warga?', description: 'Data warga ini akan dihapus.' })
    if (!ok) return
    await deleteWarga(id)
    await loadData()
  }

  const handleAddWarga = async () => {
    if (!addData.nik || !addData.nama) { alert('NIK dan Nama wajib diisi'); return }
    try {
      await addWarga(addData as Omit<Warga, 'id' | 'created_at' | 'updated_at'>)
      setAddModal(false)
      setAddData({})
      await loadData()
    } catch { alert('Gagal menambah warga') }
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
            <h1 className="text-2xl font-bold tracking-tight">Data Warga</h1>
            <p className="text-sm text-muted-foreground">{count} data</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleDownloadTemplate}><Download className="mr-1 h-3.5 w-3.5" />Template</Button>
            <Button size="sm" variant="outline" onClick={handleImport}><Upload className="mr-1 h-3.5 w-3.5" />Import</Button>
            <Button size="sm" onClick={() => setAddModal(true)}><Plus className="mr-1 h-3.5 w-3.5" />Tambah Warga</Button>
            {count > 0 && <Button size="sm" variant="destructive" onClick={handleDeleteAll}><Trash2 className="mr-1 h-3.5 w-3.5" />Hapus Semua</Button>}
          </div>
        </div>
        <div className="relative max-w-sm mt-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama atau NIK..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
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
                  <TableHead>NIK</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-12">JK</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="w-20">RT/RW</TableHead>
                  <TableHead className="w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="font-table">
                {paginated.map((w, i) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-muted-foreground font-data-number">{page * perPage + i + 1}</TableCell>
                    <TableCell className="font-data-number text-foreground/90">{w.nik}</TableCell>
                    <TableCell className="font-semibold">{w.nama}</TableCell>
                    <TableCell>{w.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</TableCell>
                    <TableCell className="max-w-[320px] truncate text-foreground/80">{w.alamat}</TableCell>
                    <TableCell className="font-data-number">{w.rt.padStart(3, '0')}/{w.rw.padStart(3, '0')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSingle(w.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
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

      {/* Edit Modal */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Data Warga</DialogTitle>
          </DialogHeader>
          <WargaFormFields data={editData} onChange={setEditData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(false)}>Batal</Button>
            <Button onClick={handleSaveEdit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Data Warga</DialogTitle>
          </DialogHeader>
          <WargaFormFields data={addData} onChange={setAddData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddModal(false); setAddData({}) }}>Batal</Button>
            <Button onClick={handleAddWarga}>Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  )
}

function WargaFormFields({ data, onChange }: { data: Partial<Warga>; onChange: (d: Partial<Warga>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1"><Label className="text-xs">Nomor KK</Label><Input value={data.no_kk || ''} onChange={e => onChange({ ...data, no_kk: e.target.value })} className="h-8 text-xs" /></div>
      <div className="space-y-1"><Label className="text-xs">NIK</Label><Input value={data.nik || ''} onChange={e => onChange({ ...data, nik: e.target.value })} className="h-8 text-xs" /></div>
      <div className="space-y-1 col-span-2"><Label className="text-xs">Nama</Label><Input value={data.nama || ''} onChange={e => onChange({ ...data, nama: e.target.value })} className="h-8 text-xs" /></div>
      <div className="space-y-1"><Label className="text-xs">Jenis Kelamin</Label><Input value={data.jenis_kelamin || ''} onChange={e => onChange({ ...data, jenis_kelamin: e.target.value })} className="h-8 text-xs" placeholder="Laki-laki / Perempuan" /></div>
      <div className="space-y-1"><Label className="text-xs">Tempat Lahir</Label><Input value={data.tempat_lahir || ''} onChange={e => onChange({ ...data, tempat_lahir: e.target.value })} className="h-8 text-xs" /></div>
      <div className="space-y-1"><Label className="text-xs">Tanggal Lahir</Label><Input value={data.tanggal_lahir || ''} onChange={e => onChange({ ...data, tanggal_lahir: e.target.value })} className="h-8 text-xs" placeholder="dd-mm-yyyy" /></div>
      <div className="space-y-1"><Label className="text-xs">Agama</Label><Input value={data.agama || ''} onChange={e => onChange({ ...data, agama: e.target.value })} className="h-8 text-xs" /></div>
      <div className="space-y-1"><Label className="text-xs">Status</Label><Input value={data.status || ''} onChange={e => onChange({ ...data, status: e.target.value })} className="h-8 text-xs" placeholder="Kawin / Belum Kawin" /></div>
      <div className="space-y-1"><Label className="text-xs">Hubungan Keluarga</Label><Input value={data.hub_keluarga || ''} onChange={e => onChange({ ...data, hub_keluarga: e.target.value })} className="h-8 text-xs" placeholder="Kepala Keluarga / Istri / Anak" /></div>
      <div className="space-y-1"><Label className="text-xs">Pendidikan</Label><Input value={data.pendidikan || ''} onChange={e => onChange({ ...data, pendidikan: e.target.value })} className="h-8 text-xs" /></div>
      <div className="space-y-1"><Label className="text-xs">Pekerjaan</Label><Input value={data.pekerjaan || ''} onChange={e => onChange({ ...data, pekerjaan: e.target.value })} className="h-8 text-xs" /></div>
      <div className="space-y-1"><Label className="text-xs">Nama Ibu</Label><Input value={data.nama_ibu || ''} onChange={e => onChange({ ...data, nama_ibu: e.target.value })} className="h-8 text-xs" /></div>
      <div className="space-y-1"><Label className="text-xs">Nama Ayah</Label><Input value={data.nama_ayah || ''} onChange={e => onChange({ ...data, nama_ayah: e.target.value })} className="h-8 text-xs" /></div>
      <div className="space-y-1 col-span-2"><Label className="text-xs">Alamat</Label><Input value={data.alamat || ''} onChange={e => onChange({ ...data, alamat: e.target.value })} className="h-8 text-xs" /></div>
      <div className="space-y-1"><Label className="text-xs">RT</Label><Input value={data.rt || ''} onChange={e => onChange({ ...data, rt: e.target.value })} className="h-8 text-xs" placeholder="001" /></div>
      <div className="space-y-1"><Label className="text-xs">RW</Label><Input value={data.rw || ''} onChange={e => onChange({ ...data, rw: e.target.value })} className="h-8 text-xs" placeholder="001" /></div>
    </div>
  )
}
