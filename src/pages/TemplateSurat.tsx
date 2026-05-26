import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FilePlus, Trash2, Pencil, Download, Sparkles } from 'lucide-react'
import { countNomorSlots } from '@/utils/placeholderDetector'
import type { TemplateSurat, DetectedPlaceholder } from '@/types'
import { cn } from '@/lib/utils'
import { crmShell } from '@/lib/aisura-crm-ui'
import { useAI } from '@/contexts/AIContext'

export function TemplateSuratPage() {
  const ai = useAI()
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
  const [editFileBytes, setEditFileBytes] = useState<Uint8Array | null>(null)
  const [editFileName, setEditFileName] = useState('')

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => { loadTemplates() }, [])

  const getTemplateDownloadName = (template: TemplateSurat) => {
    const safeName = template.nama.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ') || 'template-surat'
    return `${safeName}.docx`
  }

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
    try {
      const svc = await import('@/services/templateService')
      await svc.deleteTemplate(id)
      setDeleteConfirmId(null)
      await loadTemplates()
    } catch (err) { alert('Gagal menghapus'); console.error(err) }
  }

  const handleDownloadTemplate = async (template: TemplateSurat) => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const svc = await import('@/services/templateService')
      const destinationPath = await save({
        defaultPath: getTemplateDownloadName(template),
        filters: [{ name: 'Word', extensions: ['docx'] }],
      })
      if (!destinationPath) return
      await svc.downloadTemplateToPath(template.file_path, destinationPath)
    } catch (err) { alert('Gagal download template'); console.error(err) }
  }

  const openEditModal = (t: TemplateSurat) => {
    setEditId(t.id)
    setEditNama(t.nama)
    setEditDeskripsi(t.deskripsi)
    setEditPrefix(t.prefix_surat || '')
    setEditFileBytes(null)
    setEditFileName('')
    setEditModal(true)
  }

  const handlePickReplacementDocx = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const filePath = await open({ filters: [{ name: 'Word', extensions: ['docx'] }], multiple: false })
      if (!filePath) return
      const bytes = await readFile(filePath as string)
      setEditFileBytes(bytes)
      setEditFileName((filePath as string).split(/[\\/]/).pop() || 'template.docx')
    } catch (err) { alert('Gagal memilih file DOCX'); console.error(err) }
  }

  const handleSaveEdit = async () => {
    try {
      const svc = await import('@/services/templateService')
      await svc.updateTemplate(editId, editNama, editDeskripsi, editPrefix, editFileBytes || undefined)
      setEditModal(false)
      setEditFileBytes(null)
      setEditFileName('')
      await loadTemplates()
    } catch (err) { alert('Gagal menyimpan'); console.error(err) }
  }

  const getPlaceholders = (t: TemplateSurat): DetectedPlaceholder[] => {
    try { return JSON.parse(t.placeholders) } catch { return [] }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className={crmShell.page}>
      <div className={crmShell.pageHeader}>
        <div>
          <p className={crmShell.eyebrow}>Template center</p>
          <h1 className={crmShell.title}>Template Surat</h1>
          <p className={crmShell.subtitle}>Kelola DOCX, placeholder, prefix, dan file template.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => ai.openDrawer({ mode: 'template' })}
            disabled={!ai.credentials}
            title={ai.credentials ? 'Saran placeholder pakai AI' : 'Aktifkan AI di Pengaturan dulu'}
          >
            <Sparkles className="mr-1 h-3.5 w-3.5 text-blue-600" />
            Saran AI
          </Button>
          <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => setUploadModal(true)}>
            <FilePlus className="mr-1 h-3.5 w-3.5" /> Upload Template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card className={crmShell.card}><CardContent className="py-10 text-center text-muted-foreground">Belum ada template. Upload template pertama.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {templates.map(t => {
            const ph = getPlaceholders(t)
            return (
              <Card key={t.id} className={cn(crmShell.card, 'transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md hover:shadow-blue-100/60 dark:hover:border-blue-900/60 dark:hover:shadow-none')}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{t.nama}</h3>
                    {t.deskripsi && <p className="text-xs text-muted-foreground mt-0.5">{t.deskripsi}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300">{ph.length} placeholder</Badge>
                     {t.warga_count > 0 && <Badge variant="outline" className="rounded-full">{t.warga_count} warga</Badge>}
                     {t.prefix_surat && <Badge variant="outline" className="rounded-full">Prefix: {t.prefix_surat}</Badge>}
                     {countNomorSlots(ph) > 1 && <Badge variant="outline" className="rounded-full">{countNomorSlots(ph)} nomor</Badge>}
                      <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadTemplate(t)} title="Download template DOCX">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditModal(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirmId(t.id)}>
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
            <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>File DOCX</Label>
                  <p className="text-[10px] text-muted-foreground">Ganti file template tanpa membuat template baru.</p>
                </div>
                <Button size="sm" variant="outline" onClick={handlePickReplacementDocx}>Ganti File</Button>
              </div>
              {editFileName && (
                <p className="rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground">
                  File baru: <span className="font-medium text-foreground">{editFileName}</span>. Placeholder akan diperbarui saat disimpan.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(false)}>Batal</Button>
            <Button onClick={handleSaveEdit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Template yang dihapus tidak bisa dikembalikan. Riwayat surat yang menggunakan template ini tetap tersimpan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
