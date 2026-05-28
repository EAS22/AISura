import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Archive,
  Download,
  FolderInput,
  PackageOpen,
  PackageCheck,
  ShieldAlert,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/hooks/use-confirm'
import {
  exportWargaBackup,
  inspectWargaBackup,
  importWargaBackup,
  type ConflictStrategy,
  type ImportSummary,
} from '@/services/wargaBackupService'
import { deleteAllWarga, getWargaCount } from '@/services/wargaService'

interface InspectResult {
  count: number
  exportedAt: string
  appVersion: string
  warnings: string[]
  bytes: Uint8Array
  sourceFilename: string
}

interface WargaBackupRestoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Callback after a successful restore so the parent page can re-fetch the list. */
  onRestored?: () => void
  /** Callback after the destructive "hapus semua" action so the parent page
   *  can re-fetch (and update the count badge). */
  onCleared?: () => void
}

export function WargaBackupRestoreDialog({ open, onOpenChange, onRestored, onCleared }: WargaBackupRestoreDialogProps) {
  const { confirm, ConfirmDialog } = useConfirm()
  const [exporting, setExporting] = useState(false)

  const [picking, setPicking] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [inspect, setInspect] = useState<InspectResult | null>(null)
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip')
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Delete-all
  const [deleting, setDeleting] = useState(false)

  const reset = () => {
    setInspect(null)
    setSummary(null)
    setError(null)
    setConflictStrategy('skip')
  }

  const handleClose = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  // -----------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------

  const handleExport = async () => {
    setExporting(true)
    try {
      const result = await exportWargaBackup()
      if (result.count === 0) {
        toast.error('Tidak ada data warga untuk di-backup')
        return
      }
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')
      const destination = await save({
        defaultPath: result.filename,
        filters: [{ name: 'Backup AISura Warga', extensions: ['json'] }],
      })
      if (!destination) {
        toast.info('Backup dibatalkan')
        return
      }
      const buffer = await result.blob.arrayBuffer()
      await writeFile(destination, new Uint8Array(buffer))
      toast.success('Backup data warga berhasil disimpan', {
        description: `${result.count} data warga diekspor ke ${result.filename}`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[WargaBackup] export failed', err)
      toast.error('Gagal membuat backup', { description: message })
    } finally {
      setExporting(false)
    }
  }

  // -----------------------------------------------------------------
  // Restore
  // -----------------------------------------------------------------

  const handlePickBackup = async () => {
    setPicking(true)
    setError(null)
    setSummary(null)
    try {
      const { open: openDialog } = await import('@tauri-apps/plugin-dialog')
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const filePath = await openDialog({
        filters: [{ name: 'Backup AISura Warga', extensions: ['json'] }],
        multiple: false,
      })
      if (!filePath) return
      setInspecting(true)
      const bytes = await readFile(filePath as string)
      const { manifest, warnings } = await inspectWargaBackup(bytes)
      const sourceFilename = (filePath as string).split(/[\\/]/).pop() || 'backup.json'
      setInspect({
        count: manifest.count,
        exportedAt: manifest.exportedAt,
        appVersion: manifest.appVersion,
        warnings,
        bytes,
        sourceFilename,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[WargaBackup] inspect failed', err)
      setInspect(null)
      setError(message)
      toast.error('File backup tidak valid', { description: message })
    } finally {
      setPicking(false)
      setInspecting(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!inspect) return
    setImporting(true)
    setError(null)
    try {
      const result = await importWargaBackup(inspect.bytes, { onDuplicate: conflictStrategy })
      setSummary(result)
      const total = result.inserted + result.overwritten
      if (total === 0 && result.skipped > 0 && result.errors.length === 0) {
        toast.info('Tidak ada perubahan', {
          description: `${result.skipped} data dilewati (semua duplikat).`,
        })
      } else if (result.errors.length > 0) {
        toast.warning('Restore selesai dengan peringatan', {
          description: `${total} berhasil, ${result.errors.length} error.`,
        })
      } else {
        toast.success('Restore data warga berhasil', {
          description: `+${result.inserted} baru, ${result.overwritten} ditimpa, ${result.skipped} dilewati.`,
        })
      }
      onRestored?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[WargaBackup] import failed', err)
      setError(message)
      toast.error('Gagal restore', { description: message })
    } finally {
      setImporting(false)
    }
  }

  // -----------------------------------------------------------------
  // Delete all
  // -----------------------------------------------------------------

  const handleDeleteAll = async () => {
    let count = 0
    try {
      count = await getWargaCount()
    } catch {
      /* ignore — confirm dialog still works without exact count */
    }
    if (count === 0) {
      toast.info('Tidak ada data warga untuk dihapus')
      return
    }
    const proceed = await confirm({
      title: 'Hapus semua data warga?',
      description:
        `Aksi ini menghapus ${count} data warga di aplikasi secara permanen. ` +
        'Riwayat surat tetap tersimpan, tapi data pemohon di riwayat akan ' +
        'jadi referensi tanpa sumber. Sarannya: backup dulu sebelum melanjutkan.',
      confirmLabel: 'Hapus Semua',
      variant: 'destructive',
    })
    if (!proceed) return
    setDeleting(true)
    try {
      await deleteAllWarga()
      toast.success(`${count} data warga dihapus`, {
        description: 'Database warga sudah dibersihkan.',
      })
      onCleared?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[WargaBackup] delete all failed', err)
      toast.error('Gagal menghapus semua data', { description: message })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-blue-600" />
            Manajemen Data Warga
          </DialogTitle>
          <DialogDescription>
            Backup semua data warga ke satu file JSON, atau restore dari backup tanpa menghapus data
            yang sudah ada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export */}
          <section className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
                <Download className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-sm font-semibold">Export Backup</p>
                  <p className="text-xs text-muted-foreground">
                    Bundel semua data warga ke file <span className="font-mono">.json</span>. Aman untuk
                    dipindah ke device lain — bisa dibuka di Notepad / VS Code untuk inspeksi.
                  </p>
                </div>
                <Button onClick={handleExport} disabled={exporting} size="sm">
                  <Download className="mr-1 h-3.5 w-3.5" />
                  {exporting ? 'Memproses...' : 'Export Data Warga'}
                </Button>
              </div>
            </div>
          </section>

          {/* Restore */}
          <section className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-600">
                <FolderInput className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-semibold">Restore dari Backup</p>
                  <p className="text-xs text-muted-foreground">
                    Pilih file backup JSON, review isinya, lalu konfirmasi cara menangani duplikat.
                  </p>
                </div>

                <div className="flex items-start gap-2 rounded-md border border-amber-200/70 bg-amber-50/60 p-2.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    Restore selalu <span className="font-medium">merge</span> — data lokal tidak akan
                    dihapus. Duplikat dideteksi berdasarkan <span className="font-medium">NIK</span>.
                  </p>
                </div>

                {!inspect && !summary && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePickBackup}
                    disabled={picking || inspecting || importing}
                  >
                    <PackageOpen className="mr-1 h-3.5 w-3.5" />
                    {picking || inspecting ? 'Membaca...' : 'Pilih file backup'}
                  </Button>
                )}

                {inspect && !summary && (
                  <div className="space-y-3 rounded-lg border bg-background p-3">
                    <div>
                      <p className="text-xs font-medium">{inspect.sourceFilename}</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <Stat label="Total entry" value={String(inspect.count)} />
                        <Stat label="Diekspor" value={formatDate(inspect.exportedAt)} />
                        <Stat label="Versi app" value={inspect.appVersion ? `v${inspect.appVersion}` : '-'} />
                      </div>
                    </div>

                    {inspect.warnings.length > 0 && (
                      <div className="rounded-md border border-amber-200/70 bg-amber-50/60 p-2.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                        <p className="font-medium">Peringatan parsing:</p>
                        <ul className="mt-1 list-inside list-disc">
                          {inspect.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-xs font-medium">Cara menangani warga dengan NIK sama:</p>
                      <RadioGroup
                        value={conflictStrategy}
                        onValueChange={(v) => setConflictStrategy(v as ConflictStrategy)}
                        className="grid gap-2 sm:grid-cols-2"
                      >
                        <ConflictOption
                          value="skip"
                          selected={conflictStrategy === 'skip'}
                          title="Skip duplikat (default)"
                          description="Jaga data lokal apa adanya. Hanya warga baru dari backup yang ditambah."
                        />
                        <ConflictOption
                          value="overwrite"
                          selected={conflictStrategy === 'overwrite'}
                          title="Overwrite duplikat"
                          description="Ganti seluruh field warga lokal dengan versi dari backup (cocok untuk update massal)."
                        />
                      </RadioGroup>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleConfirmImport} disabled={importing} size="sm">
                        <PackageCheck className="mr-1 h-3.5 w-3.5" />
                        {importing ? 'Memulihkan...' : `Restore ${inspect.count} data`}
                      </Button>
                      <Button variant="ghost" onClick={reset} disabled={importing} size="sm">
                        Batal
                      </Button>
                    </div>
                  </div>
                )}

                {summary && (
                  <div className="space-y-3 rounded-lg border bg-background p-3">
                    <p className="text-xs font-semibold">Hasil Restore</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Stat label="Ditambahkan" value={String(summary.inserted)} tone="success" />
                      <Stat label="Ditimpa" value={String(summary.overwritten)} tone="info" />
                      <Stat label="Dilewati" value={String(summary.skipped)} tone="muted" />
                    </div>
                    {summary.errors.length > 0 && (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                        <p className="font-medium">{summary.errors.length} entry gagal:</p>
                        <ul className="mt-1 list-inside list-disc">
                          {summary.errors.slice(0, 5).map((e, i) => (
                            <li key={i}>
                              <span className="font-medium">{e.nama || '(tanpa nama)'}</span>
                              {e.nik ? ` (NIK ${e.nik})` : ''}: {e.reason}
                            </li>
                          ))}
                          {summary.errors.length > 5 && (
                            <li>+{summary.errors.length - 5} error lain</li>
                          )}
                        </ul>
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={reset}>
                      Restore backup lain
                    </Button>
                  </div>
                )}

                {error && !inspect && !summary && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Danger zone: hapus semua data warga */}
          <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-sm font-semibold">Zona Berbahaya</p>
                  <p className="text-xs text-muted-foreground">
                    Hapus seluruh data warga di aplikasi sekaligus. Aksi ini tidak bisa di-undo —
                    backup dulu sebelum melanjutkan.
                  </p>
                </div>
                <ul className="list-inside list-disc space-y-0.5 text-[11px] text-muted-foreground">
                  <li>Riwayat surat tetap tersimpan, tapi referensi pemohon di sana akan kehilangan sumbernya.</li>
                  <li>Tidak menyentuh data desa, perangkat desa, template, atau pengaturan lain.</li>
                </ul>
                <Button variant="destructive" size="sm" onClick={handleDeleteAll} disabled={deleting}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  {deleting ? 'Menghapus...' : 'Hapus Semua Data Warga'}
                </Button>
              </div>
            </div>
          </section>
        </div>

        <ConfirmDialog />
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'info' | 'muted' }) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200/70 bg-emerald-50/60 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'
      : tone === 'info'
        ? 'border-blue-200/70 bg-blue-50/60 text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200'
        : tone === 'muted'
          ? 'border-slate-200/80 bg-slate-50/60 text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300'
          : 'border-slate-200/80 bg-background text-foreground dark:border-slate-800'
  return (
    <div className={cn('rounded-lg border p-2', toneClass)}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-0.5 font-data-number text-sm font-semibold">{value}</p>
    </div>
  )
}

function ConflictOption({
  value,
  selected,
  title,
  description,
}: {
  value: ConflictStrategy
  selected: boolean
  title: string
  description: string
}) {
  return (
    <Label
      htmlFor={`warga-conflict-${value}`}
      className={cn(
        'flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors',
        selected
          ? 'border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/30'
          : 'border-slate-200/80 bg-background hover:border-slate-300 dark:border-slate-800',
      )}
    >
      <RadioGroupItem value={value} id={`warga-conflict-${value}`} className="mt-0.5" />
      <div className="space-y-0.5">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{description}</p>
        {selected && value === 'overwrite' && (
          <Badge variant="outline" className="mt-1 rounded-full text-[10px]">
            Data lokal akan ditimpa
          </Badge>
        )}
      </div>
    </Label>
  )
}

function formatDate(iso: string): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}
