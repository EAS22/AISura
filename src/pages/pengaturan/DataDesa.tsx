import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Search, ImageIcon, Save } from 'lucide-react'
import { getDataDesa, saveDataDesa } from '@/services/desaService'
import { getAllPerangkatDesa, savePerangkatDesa, deletePerangkatDesa } from '@/services/perangkatDesaService'
import { searchWarga } from '@/services/wargaService'
import { createImageDataUrl, SUPPORTED_IMAGE_EXTENSIONS } from '@/services/imageFileService'
import { useConfirm } from '@/hooks/use-confirm'
import type { DataDesa, PerangkatDesa, Warga } from '@/types'

const DEFAULT_JABATAN = ['Kepala Desa', 'Sekretaris Desa', 'Kaur TU & Umum', 'Kaur Keuangan', 'Kaur Perencanaan', 'Kasi Pemerintahan', 'Kasi Kesejahteraan', 'Kasi Pelayanan']

export function DataDesaPage() {
  const { confirm, ConfirmDialog } = useConfirm()
  const [desa, setDesa] = useState<Partial<DataDesa>>({})
  const [perangkat, setPerangkat] = useState<Partial<PerangkatDesa>[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<PerangkatDesa>>({})

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const d = await getDataDesa(); if (d) setDesa(d)
      const pd = await getAllPerangkatDesa()
      setPerangkat(pd.length > 0 ? pd : DEFAULT_JABATAN.map((j, i) => ({ urutan: i + 1, jabatan: j, nama: '', gelar_depan: '', gelar_belakang: '', nik: '', nipd: '', alamat: '', warga_id: null })))
    } catch {} finally { setLoading(false) }
  }

  const handleSaveDesa = async () => {
    try { await saveDataDesa(desa as any); alert('Data desa disimpan') } catch { alert('Gagal') }
  }

  const openAddModal = () => {
    const n = perangkat.length + 1
    setEditData({ urutan: n, jabatan: n <= 8 ? DEFAULT_JABATAN[n - 1] || `Kadus ${n - 8}` : `Kadus ${n - 8}`, nama: '', gelar_depan: '', gelar_belakang: '', nik: '', nipd: '', alamat: '', warga_id: null })
    setEditIndex(null)
    setModalOpen(true)
  }

  const openEditModal = (index: number) => {
    setEditData({ ...perangkat[index] })
    setEditIndex(index)
    setModalOpen(true)
  }

  const handleSaveModal = async () => {
    try {
      if (editIndex !== null) {
        const updated = [...perangkat]; updated[editIndex] = { ...updated[editIndex], ...editData }; setPerangkat(updated)
      } else {
        setPerangkat([...perangkat, editData])
      }
      await savePerangkatDesa(editData as any)
      setModalOpen(false)
      alert('Perangkat desa disimpan')
    } catch { alert('Gagal') }
  }

  const handleDelete = async (index: number) => {
    const ok = await confirm({ title: 'Hapus Perangkat Desa?', description: 'Data perangkat desa ini akan dihapus.' })
    if (!ok) return
    const pd = perangkat[index]; if (pd.id) await deletePerangkatDesa(pd.id)
    setPerangkat(perangkat.filter((_, i) => i !== index))
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Desa</h1>
        <p className="text-sm text-muted-foreground">Lengkapi identitas desa, kop surat, logo, dan perangkat desa.</p>
      </div>

      {/* Identitas Desa */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-sm">Identitas Desa</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Nama Desa</Label><Input value={desa.desa || ''} onChange={e => setDesa({ ...desa, desa: e.target.value })} /></div>
          <div className="space-y-1"><Label>Kecamatan</Label><Input value={desa.kecamatan || ''} onChange={e => setDesa({ ...desa, kecamatan: e.target.value })} /></div>
          <div className="space-y-1"><Label>Kabupaten</Label><Input value={desa.kabupaten || ''} onChange={e => setDesa({ ...desa, kabupaten: e.target.value })} /></div>
          <div className="space-y-1"><Label>Provinsi</Label><Input value={desa.provinsi || ''} onChange={e => setDesa({ ...desa, provinsi: e.target.value })} /></div>
          <div className="space-y-1"><Label>Kode Pos</Label><Input value={desa.kode_pos || ''} onChange={e => setDesa({ ...desa, kode_pos: e.target.value })} /></div>
          <div className="space-y-1"><Label>Telepon</Label><Input value={desa.telepon || ''} onChange={e => setDesa({ ...desa, telepon: e.target.value })} /></div>
          <div className="space-y-1"><Label>Email</Label><Input value={desa.email || ''} onChange={e => setDesa({ ...desa, email: e.target.value })} /></div>
          <div className="space-y-1"><Label>Alamat Kantor</Label><Input value={desa.alamat_kantor || ''} onChange={e => setDesa({ ...desa, alamat_kantor: e.target.value })} /></div>
        </CardContent>
      </Card>

      {/* Kop Surat & Logo */}
      <Card className="shadow-sm">
        <CardHeader><CardTitle className="text-sm">Kop Surat & Logo Desa</CardTitle></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-blue-600" /><Label>Kop Surat (placeholder: {'{KOP_SURAT}'})</Label></div>
            <p className="text-xs text-muted-foreground">Gambar header surat yang akan menggantikan placeholder {'{KOP_SURAT}'} di template docx.</p>
            {desa.kop_surat && (
              <div className="rounded-lg border bg-background p-2">
                <img src={desa.kop_surat} alt="Kop Surat" className="max-h-24 w-full object-contain" />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={async () => {
                try {
                  const { open } = await import('@tauri-apps/plugin-dialog')
                  const { readFile } = await import('@tauri-apps/plugin-fs')
                  const filePath = await open({ filters: [{ name: 'Image', extensions: SUPPORTED_IMAGE_EXTENSIONS }], multiple: false })
                  if (!filePath) return
                  const bytes = await readFile(filePath as string)
                  const dataUrl = createImageDataUrl(filePath as string, bytes)
                  setDesa({ ...desa, kop_surat: dataUrl })
                } catch (err) { console.error(err) }
              }}>Upload Kop Surat</Button>
              {desa.kop_surat && <Button size="sm" variant="ghost" onClick={() => setDesa({ ...desa, kop_surat: '' })}>Hapus</Button>}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-blue-600" /><Label>Logo Desa</Label></div>
            <p className="text-xs text-muted-foreground">Logo/lambang desa.</p>
            {desa.logo_desa && (
              <div className="rounded-lg border bg-background p-2">
                <img src={desa.logo_desa} alt="Logo Desa" className="max-h-24 w-full object-contain" />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={async () => {
                try {
                  const { open } = await import('@tauri-apps/plugin-dialog')
                  const { readFile } = await import('@tauri-apps/plugin-fs')
                  const filePath = await open({ filters: [{ name: 'Image', extensions: SUPPORTED_IMAGE_EXTENSIONS }], multiple: false })
                  if (!filePath) return
                  const bytes = await readFile(filePath as string)
                  const dataUrl = createImageDataUrl(filePath as string, bytes)
                  setDesa({ ...desa, logo_desa: dataUrl })
                } catch (err) { console.error(err) }
              }}>Upload Logo</Button>
              {desa.logo_desa && <Button size="sm" variant="ghost" onClick={() => setDesa({ ...desa, logo_desa: '' })}>Hapus</Button>}
            </div>
          </div>

          <div className="lg:col-span-2">
            <Button size="sm" onClick={handleSaveDesa}><Save className="mr-1 h-3.5 w-3.5" />Simpan Data Desa</Button>
          </div>
        </CardContent>
      </Card>

      {/* Perangkat Desa - Table */}
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Perangkat Desa</CardTitle>
          <Button size="sm" onClick={openAddModal}><Plus className="mr-1 h-3.5 w-3.5" />Tambah</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>NIPD</TableHead>
                <TableHead className="w-20 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-table">
              {perangkat.map((pd, i) => (
                <TableRow key={i}>
                  <TableCell className="font-data-number text-muted-foreground">PD{pd.urutan || i + 1}</TableCell>
                  <TableCell>{pd.jabatan}</TableCell>
                  <TableCell className="font-medium">
                    {[pd.gelar_depan, pd.nama, pd.gelar_belakang].filter(Boolean).join(' ') || '-'}
                  </TableCell>
                  <TableCell className="font-data-number text-foreground/80">{pd.nik || '-'}</TableCell>
                  <TableCell className="font-data-number text-foreground/80">{pd.nipd || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditModal(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {perangkat.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada data perangkat desa</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Add/Edit */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editIndex !== null ? 'Edit' : 'Tambah'} Perangkat Desa</DialogTitle>
          </DialogHeader>
          <PerangkatForm data={editData} onChange={setEditData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSaveModal}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  )
}

function PerangkatForm({ data, onChange }: { data: Partial<PerangkatDesa>; onChange: (d: Partial<PerangkatDesa>) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Warga[]>([])
  const [show, setShow] = useState(false)

  const handleSearch = async (q: string) => {
    setQuery(q)
    if (q.length >= 2) { setResults(await searchWarga(q)); setShow(true) } else { setResults([]); setShow(false) }
  }

  const selectWarga = (w: Warga) => {
    onChange({ ...data, warga_id: w.id, nama: w.nama, nik: w.nik, alamat: `${w.alamat} RT ${w.rt} RW ${w.rw}` })
    setShow(false); setQuery('')
  }

  return (
    <div className="space-y-3">
      {/* Search warga */}
      <div className="relative">
        <Label className="text-xs">Cari dari data warga (opsional)</Label>
        <div className="relative mt-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Cari warga..." value={query} onChange={e => handleSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        {show && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-10 max-h-32 overflow-y-auto">
            {results.map(w => (
              <button key={w.id} onClick={() => selectWarga(w)} className="w-full text-left px-2 py-1.5 hover:bg-accent text-xs border-b last:border-0">
                <span className="font-medium">{w.nama}</span> — <span className="text-muted-foreground">{w.nik}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1"><Label className="text-xs">Gelar Depan</Label><Input value={data.gelar_depan || ''} onChange={e => onChange({ ...data, gelar_depan: e.target.value })} className="h-8 text-xs" placeholder="H." /></div>
        <div className="space-y-1 col-span-2"><Label className="text-xs">Nama</Label><Input value={data.nama || ''} onChange={e => onChange({ ...data, nama: e.target.value })} className="h-8 text-xs" /></div>
        <div className="space-y-1"><Label className="text-xs">Gelar Belakang</Label><Input value={data.gelar_belakang || ''} onChange={e => onChange({ ...data, gelar_belakang: e.target.value })} className="h-8 text-xs" placeholder="S.Pd." /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1"><Label className="text-xs">NIK</Label><Input value={data.nik || ''} onChange={e => onChange({ ...data, nik: e.target.value })} className="h-8 text-xs" /></div>
        <div className="space-y-1"><Label className="text-xs">NIPD</Label><Input value={data.nipd || ''} onChange={e => onChange({ ...data, nipd: e.target.value })} className="h-8 text-xs" /></div>
        <div className="space-y-1"><Label className="text-xs">Jabatan</Label><Input value={data.jabatan || ''} onChange={e => onChange({ ...data, jabatan: e.target.value })} className="h-8 text-xs" /></div>
      </div>
      <div className="space-y-1"><Label className="text-xs">Alamat</Label><Input value={data.alamat || ''} onChange={e => onChange({ ...data, alamat: e.target.value })} className="h-8 text-xs" /></div>
    </div>
  )
}
