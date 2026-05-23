import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FilePlus, Trash2, Pencil } from 'lucide-react'
import type { TemplateSurat, DetectedPlaceholder } from '@/types'

export function TemplateSuratPage() {
  const [templates, setTemplates] = useState<TemplateSurat[]>([])
  const [loading, setLoading] = useState(true)

  // Upload modal state
  const [uploadModal, setUploadModal] = useState(false)
  const [uploadNama, setUploadNama] = useState('')
  const [uploadDeskripsi, setUploadDeskripsi] = useState('')
  const [uploadPrefix, setUploadPrefix] = useState('')

  // Edit modal state
  const [editModal, setEditModal] = useState(false)
  const [editId, setEditId] = useState('')
  const [editNama, setEditNama] = useState('')
  const [editDeskripsi, setEditDeskripsi] = useState('')
  const [editPrefix, setEditPrefix] = useState('')

  useEffect(() => { loadTemplates() }, [])

  const loadTemplates = async () => {
    try {
      const svc = await import('@/services/templateService')
      setTemplates(await svc.getAllTemplates())
    } catch {} finally { setLoading(false) }
  }

  const handleUpload = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const filePath = await open({ filters: [{ name: 'Word', extensions: ['docx'] }], multiple: false })
      if (!filePath) return
      const bytes = await readFile(filePath as string)
      const svc = await import('@/services/templateService')
      await svc.uploadTemplate(bytes, uploadNama || 'Template Baru', uploadDeskripsi, uploadPrefix)
      setUploadModal(false)
      setUploadNama(''); setUploadDeskripsi(''); setUploadPrefix('')
      await loadTemplates()
    } catch (err) { alert('Gagal upload'); console.error(err) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus template ini?')) return
    try {
      const svc = await import('@/services/templateService')
      await svc.deleteTemplate(id)
      await loadTemplates()
    } catch (err) { alert('Gagal menghapus'); console.error(err) }
  }

  const openEditModal = (t: TemplateSurat) => {
    setEditId(t.id)
    setEditNama(t.nama)
    setEditDeskripsi(t.deskripsi)
    setEditPrefix(t.prefix_surat || '')
    setEditModal(true)
  }

  const handleSaveEdit = async () => {
    try {
      const svc = await import('@/services/templateService')
      await svc.updateTemplate(editId, editNama, editDeskripsi)
      setEditModal(false)
      await loadTemplates()
    } catch (err) { alert('Gagal menyimpan'); console.error(err) }
  }

  const getPlaceholders = (t: TemplateSurat): DetectedPlaceholder[] => {
    try { return JSON.parse(t.placeholders) } catch { return [] }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Template Surat</h1>
        <Button size="sm" onClick={() => setUploadModal(true)}>
          <FilePlus className="mr-1 h-3.5 w-3.5" /> Upload Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Belum ada template. Upload template pertama.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {templates.map(t => {
            const ph = getPlaceholders(t)
            return (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{t.nama}</h3>
                    {t.deskripsi && <p className="text-xs text-muted-foreground mt-0.5">{t.deskripsi}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="secondary">{ph.length} placeholder</Badge>
                      {t.warga_count > 0 && <Badge variant="outline">{t.warga_count} warga</Badge>}
                      {t.prefix_surat && <Badge variant="outline">Prefix: {t.prefix_surat}</Badge>}
                      <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditModal(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={uploadModal} onOpenChange={setUploadModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Template Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Template</Label>
              <Input value={uploadNama} onChange={e => setUploadNama(e.target.value)} placeholder="Surat Keterangan Domisili" />
            </div>
            <div className="space-y-1">
              <Label>Deskripsi</Label>
              <Input value={uploadDeskripsi} onChange={e => setUploadDeskripsi(e.target.value)} placeholder="Deskripsi singkat" />
            </div>
            <div className="space-y-1">
              <Label>Prefix Surat</Label>
              <Input value={uploadPrefix} onChange={e => setUploadPrefix(e.target.value)} placeholder="SKD, SKU, SP, dll." />
              <p className="text-[10px] text-muted-foreground">Prefix untuk nomor surat (placeholder {'{S_PREFIX}'})</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModal(false)}>Batal</Button>
            <Button onClick={handleUpload}>Pilih File & Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Template</Label>
              <Input value={editNama} onChange={e => setEditNama(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Deskripsi</Label>
              <Input value={editDeskripsi} onChange={e => setEditDeskripsi(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Prefix Surat</Label>
              <Input value={editPrefix} onChange={e => setEditPrefix(e.target.value)} placeholder="SKD, SKU, SP, dll." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(false)}>Batal</Button>
            <Button onClick={handleSaveEdit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
