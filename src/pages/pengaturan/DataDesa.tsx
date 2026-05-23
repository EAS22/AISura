import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Search } from 'lucide-react'
import { getDataDesa, saveDataDesa } from '@/services/desaService'
import { getAllPerangkatDesa, savePerangkatDesa, deletePerangkatDesa } from '@/services/perangkatDesaService'
import { searchWarga } from '@/services/wargaService'
import type { DataDesa, PerangkatDesa, Warga } from '@/types'

const DEFAULT_JABATAN = ['Kepala Desa', 'Sekretaris Desa', 'Kaur TU & Umum', 'Kaur Keuangan', 'Kaur Perencanaan', 'Kasi Pemerintahan', 'Kasi Kesejahteraan', 'Kasi Pelayanan']

export function DataDesaPage() {
  const [desa, setDesa] = useState<Partial<DataDesa>>({})
  const [perangkat, setPerangkat] = useState<Partial<PerangkatDesa>[]>([])
  const [loading, setLoading] = useState(true)

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

  const handleSavePerangkat = async () => {
    try {
      for (const pd of perangkat) { if (pd.nama || pd.nik) await savePerangkatDesa(pd as any) }
      alert('Perangkat desa disimpan')
    } catch { alert('Gagal') }
  }

  const addPerangkat = () => {
    const n = perangkat.length + 1
    setPerangkat([...perangkat, { urutan: n, jabatan: `Kadus ${n - 8}`, nama: '', gelar_depan: '', gelar_belakang: '', nik: '', nipd: '', alamat: '', warga_id: null }])
  }

  const removePerangkat = async (i: number) => {
    const pd = perangkat[i]; if (pd.id) await deletePerangkatDesa(pd.id)
    setPerangkat(perangkat.filter((_, idx) => idx !== i))
  }

  const updatePd = (i: number, data: Partial<PerangkatDesa>) => {
    const u = [...perangkat]; u[i] = { ...u[i], ...data }; setPerangkat(u)
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Data Desa</h1>

      <Card>
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
          <div className="col-span-2"><Button size="sm" onClick={handleSaveDesa}>Simpan Data Desa</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Perangkat Desa</CardTitle>
          <Button size="sm" variant="outline" onClick={addPerangkat}><Plus className="mr-1 h-3.5 w-3.5" />Tambah</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {perangkat.map((pd, i) => (
            <PerangkatItem key={i} data={pd} index={i} onChange={d => updatePd(i, d)} onRemove={i >= 8 ? () => removePerangkat(i) : undefined} />
          ))}
          <Button size="sm" onClick={handleSavePerangkat}>Simpan Perangkat Desa</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function PerangkatItem({ data, index, onChange, onRemove }: { data: Partial<PerangkatDesa>; index: number; onChange: (d: Partial<PerangkatDesa>) => void; onRemove?: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Warga[]>([])
  const [show, setShow] = useState(false)

  const handleSearch = async (q: string) => {
    setQuery(q)
    if (q.length >= 2) { setResults(await searchWarga(q)); setShow(true) } else { setResults([]); setShow(false) }
  }

  const selectWarga = (w: Warga) => {
    onChange({ warga_id: w.id, nama: w.nama, nik: w.nik, alamat: `${w.alamat} RT ${w.rt} RW ${w.rw}` })
    setShow(false); setQuery('')
  }

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">PD{index + 1} — {data.jabatan}</span>
        {onRemove && <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>}
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Cari warga..." value={query} onChange={e => handleSearch(e.target.value)} className="pl-8 h-8 text-xs" />
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
        <div className="space-y-1"><Label className="text-[10px]">Gelar Depan</Label><Input value={data.gelar_depan || ''} onChange={e => onChange({ gelar_depan: e.target.value })} className="h-7 text-xs" /></div>
        <div className="space-y-1 col-span-2"><Label className="text-[10px]">Nama</Label><Input value={data.nama || ''} onChange={e => onChange({ nama: e.target.value })} className="h-7 text-xs" /></div>
        <div className="space-y-1"><Label className="text-[10px]">Gelar Belakang</Label><Input value={data.gelar_belakang || ''} onChange={e => onChange({ gelar_belakang: e.target.value })} className="h-7 text-xs" /></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1"><Label className="text-[10px]">NIK</Label><Input value={data.nik || ''} onChange={e => onChange({ nik: e.target.value })} className="h-7 text-xs" /></div>
        <div className="space-y-1"><Label className="text-[10px]">NIPD</Label><Input value={data.nipd || ''} onChange={e => onChange({ nipd: e.target.value })} className="h-7 text-xs" /></div>
        <div className="space-y-1"><Label className="text-[10px]">Jabatan</Label><Input value={data.jabatan || ''} onChange={e => onChange({ jabatan: e.target.value })} className="h-7 text-xs" /></div>
      </div>
      <div className="space-y-1"><Label className="text-[10px]">Alamat</Label><Input value={data.alamat || ''} onChange={e => onChange({ alamat: e.target.value })} className="h-7 text-xs" /></div>
    </div>
  )
}
