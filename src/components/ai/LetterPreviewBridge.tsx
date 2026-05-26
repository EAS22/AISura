// Bridges AI's preview_letter tool call to a docx preview modal,
// rendered as part of the AI drawer flow.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Eye } from 'lucide-react'

interface PreviewRequest {
  templateId: string
  templateName?: string
  values: Record<string, string>
}

export interface LetterPreviewBridgeApi {
  requestPreview: (input: PreviewRequest) => Promise<void>
}

export function useLetterPreviewBridge(): LetterPreviewBridgeApi & {
  isOpen: boolean
  pending: PreviewRequest | null
  blob: Blob | null
  filename: string
  loading: boolean
  error: string | null
  setOpen: (open: boolean) => void
} {
  const [isOpen, setOpen] = useState(false)
  const [pending, setPending] = useState<PreviewRequest | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestPreview = useCallback(async (input: PreviewRequest) => {
    setError(null)
    setBlob(null)
    setPending(input)
    setOpen(true)
    setLoading(true)
    try {
      const svc = await import('@/services/templateService')
      const tpl = await svc.getTemplateById(input.templateId)
      if (!tpl) throw new Error('Template tidak ditemukan')
      const bytes = await svc.getTemplateBlob(tpl.file_path)
      const { processDocxTemplate } = await import('@/utils/docxProcessor')
      const buf = await processDocxTemplate(bytes, input.values)
      setBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))
      const safeName = (input.templateName || tpl.nama).replace(/\s+/g, '_')
      setFilename(`${safeName}.docx`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal merender preview')
    } finally {
      setLoading(false)
    }
  }, [])

  return { requestPreview, isOpen, pending, blob, filename, loading, error, setOpen }
}

export function LetterPreviewBridge({ bridge }: { bridge: ReturnType<typeof useLetterPreviewBridge> }) {
  const previewRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = previewRef.current
    if (!node || !bridge.blob) return
    node.innerHTML = ''
    let cancelled = false
    import('docx-preview').then(({ renderAsync }) => {
      if (cancelled) return
      renderAsync(bridge.blob!, node, undefined, {
        className: 'docx-preview-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        breakPages: true,
      }).catch((err) => console.error('docx-preview error', err))
    })
    return () => {
      cancelled = true
    }
  }, [bridge.blob])

  const handleDownload = async () => {
    if (!bridge.blob) return
    const arrayBuf = await bridge.blob.arrayBuffer()
    const { downloadDocx } = await import('@/utils/docxProcessor')
    await downloadDocx(arrayBuf, bridge.filename || 'surat.docx')
  }

  return (
    <Dialog open={bridge.isOpen} onOpenChange={bridge.setOpen}>
      <DialogContent className="!max-w-[90vw] !w-[90vw] !h-[90vh] flex flex-col p-0" showCloseButton={false}>
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Preview Surat AI
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2">
          {bridge.loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="ml-3 text-sm text-muted-foreground">Memproses preview...</span>
            </div>
          )}
          {bridge.error && (
            <div className="mx-auto max-w-md rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {bridge.error}
            </div>
          )}
          {!bridge.loading && !bridge.error && bridge.blob && (
            <div ref={previewRef} />
          )}
        </div>
        <DialogFooter className="shrink-0 px-6 pb-6 pt-2 border-t">
          <Button variant="outline" onClick={() => bridge.setOpen(false)}>Tutup</Button>
          <Button onClick={handleDownload} disabled={!bridge.blob}>
            <Download className="mr-1 h-3.5 w-3.5" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
