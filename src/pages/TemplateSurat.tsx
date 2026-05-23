import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FilePlus, Trash2, Pencil } from 'lucide-react'
import type { TemplateSurat, DetectedPlaceholder } from '@/types'

export function TemplateSuratPage() {
  const [templates, setTemplates] = useState<TemplateSurat[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadNama, setUploadNama] = useState('')
  const [uploadDeskripsi, setUploadDeskripsi] = useState('')

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
      await svc.uploadTemplate(bytes, uploadNama || 'Template Baru', uploadDeskripsi)
      setShowUpload(false); setUploadNama(''); setUploadDeskripsi('')
      await loadTemplates()
    } catch (err) { alert('Gagal upload'); console.error(err) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus template ini?')) return
    const svc = await import('@/services/templateService')
    await svc.deleteTemplate(id)
    await loadTemplates()
  }

  const getPlaceholders = (t: TemplateSurat): DetectedPlaceholder[] => {
    try { return JSON.parse(t.placeholders) } catch { return [] }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Template Surat</h1>
        <Button size="sm" onClick={() => setShowUpload(!showUpload)}>
          <FilePlus className="mr-1 h-3.5 w-3.5" /> Upload Template
        </Button>
      </div>

      {showUpload && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Upload Template Baru</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Template</Label>
              <Input value={uploadNama} onChange={e => setUploadNama(e.target.value)} placeholder="Surat Keterangan Domisili" />
            </div>
            <div className="space-y-1">
              <Label>Deskripsi</Label>
              <Input value={uploadDeskripsi} onChange={e => setUploadDeskripsi(e.target.value)} placeholder="Deskripsi singkat" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpload}>Pilih File & Upload</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowUpload(false)}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                      <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
