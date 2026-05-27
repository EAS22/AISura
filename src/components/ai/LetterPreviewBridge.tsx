// Bridges AI's preview_letter tool call to a docx preview modal.
// Mounted at App root level (NOT nested inside the AI drawer Sheet) to
// avoid Radix portal cleanup race when nested dialogs unmount in
// different orders, which can leave `body { pointer-events: none }`
// stale and freeze the entire app UI.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { buildLetterFilename } from '@/utils/letterFilename'

interface PreviewRequest {
  templateId: string
  templateName?: string
  values: Record<string, string>
  /**
   * Pemohon name used for filename display before commit. Final filename
   * will be re-derived from the commit() result, but having this preserves
   * the right name in the preview filename hint.
   */
  pemohonName?: string
  /**
   * Commit handler: when the user clicks Download, this is invoked to
   * actually consume the nomor surat counter, save riwayat, and return
   * the final values + metadata. The bridge then re-renders the docx
   * with the committed values and writes it to disk.
   *
   * If omitted, the bridge falls back to a "preview-only" download using
   * the values originally passed in (no counter consumption, no riwayat).
   */
  commit?: () => Promise<{
    values: Record<string, string>
    pemohonName: string
    /** For toast display + post-commit logging. */
    nomorSurat?: string
  }>
}

export interface LetterPreviewBridgeApi {
  requestPreview: (input: PreviewRequest) => Promise<void>
  isOpen: boolean
  pending: PreviewRequest | null
  blob: Blob | null
  filename: string
  loading: boolean
  error: string | null
  setOpen: (open: boolean) => void
}

export function useLetterPreviewBridge(): LetterPreviewBridgeApi {
  const [isOpen, setOpenState] = useState(false)
  const [pending, setPending] = useState<PreviewRequest | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [filename, setFilename] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Wrap open setter so when dialog closes we clear blob and any DOM
  // pointer-events lock that Radix portal might leave behind.
  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    if (!next) {
      // Defer: let Radix run its own onCloseAutoFocus first.
      setTimeout(() => {
        // Some Radix versions leave body[data-scroll-locked] or
        // pointer-events: none after nested portal close. Clear it.
        if (typeof document !== 'undefined') {
          document.body.style.pointerEvents = ''
          document.body.removeAttribute('data-scroll-locked')
        }
        setBlob(null)
        setPending(null)
        setError(null)
      }, 200)
    }
  }, [])

  const requestPreview = useCallback(async (input: PreviewRequest) => {
    setError(null)
    setBlob(null)
    setPending(input)
    setOpenState(true)
    setLoading(true)
    try {
      const svc = await import('@/services/templateService')
      const tpl = await svc.getTemplateById(input.templateId)
      if (!tpl) throw new Error('Template tidak ditemukan')
      const bytes = await svc.getTemplateBlob(tpl.file_path)
      const { processDocxTemplate } = await import('@/utils/docxProcessor')
      const buf = await processDocxTemplate(bytes, input.values)
      setBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))
      // Caller now provides pemohonName explicitly. Fallback: scan values
      // for a W*_NAMA token (case-insensitive) — robust across whichever
      // naming convention the placeholder map happens to use.
      const fallbackPemohon = (() => {
        if (input.pemohonName) return input.pemohonName
        for (const [k, v] of Object.entries(input.values)) {
          const key = k.replace(/^\{|\}$/g, '').toUpperCase()
          if (/^W1_NAMA$/.test(key) && v) return v
        }
        return ''
      })()
      setFilename(
        buildLetterFilename({
          templateName: input.templateName || tpl.nama,
          pemohonName: fallbackPemohon,
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal merender preview')
    } finally {
      setLoading(false)
    }
  }, [])

  return { requestPreview, isOpen, pending, blob, filename, loading, error, setOpen }
}

export function LetterPreviewBridge({ bridge }: { bridge: LetterPreviewBridgeApi }) {
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
    if (!bridge.blob || !bridge.pending) return
    try {
      const svc = await import('@/services/templateService')
      const { processDocxTemplate } = await import('@/utils/docxProcessor')
      const tpl = await svc.getTemplateById(bridge.pending.templateId)
      if (!tpl) throw new Error('Template tidak ditemukan')

      // If a commit callback is provided, run it to consume the nomor surat
      // counter and obtain the final values. Otherwise fall back to the
      // preview values (legacy / no-side-effect download).
      let finalValues = bridge.pending.values
      let finalPemohon = bridge.pending.pemohonName ?? ''
      if (bridge.pending.commit) {
        const committed = await bridge.pending.commit()
        finalValues = committed.values
        finalPemohon = committed.pemohonName || finalPemohon
      }

      // Re-render the docx with committed values (nomor surat now points to
      // the consumed counter slot, not the preview snapshot).
      const bytes = await svc.getTemplateBlob(tpl.file_path)
      const finalBuf = await processDocxTemplate(bytes, finalValues)

      const filename = buildLetterFilename({
        templateName: bridge.pending.templateName || tpl.nama,
        pemohonName: finalPemohon,
      })

      const { downloadDocx } = await import('@/utils/docxProcessor')
      const dl = await downloadDocx(finalBuf, filename)
      if (dl.saved) {
        toast.success('Surat berhasil disimpan', { description: filename })
        bridge.setOpen(false)
      }
    } catch (err) {
      console.error('Failed to download', err)
      toast.error('Gagal menyimpan surat', {
        description: err instanceof Error ? err.message : undefined,
      })
    }
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
