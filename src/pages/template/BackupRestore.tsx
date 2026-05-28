import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Archive,
  Download,
  FolderInput,
  PackageOpen,
  PackageCheck,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { crmShell } from '@/lib/aisura-crm-ui'
import {
  exportTemplatesBackup,
  importTemplatesBackup,
  inspectTemplatesBackup,
  type ConflictStrategy,
  type ImportSummary,
} from '@/services/templateBackupService'

interface InspectResult {
  count: number
  exportedAt: string
  appVersion: string
  warnings: string[]
  /** Names of templates inside the backup, used to show conflict preview. */
  names: string[]
  /** Raw bytes kept in memory for the actual import call. */
  bytes: Uint8Array
  /** Filename the user picked, for display only. */
  sourceFilename: string
}

export function TemplateBackupRestorePage() {
  // Export state
  const [exporting, setExporting] = useState(false)

  // Import state
  const [picking, setPicking] = useState(false)
  const [inspecting, setInspecting] = useState(false)
  const [inspect, setInspect] = useState<InspectResult | null>(null)
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip')
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  // -----------------------------------------------------------------
  // Export flow
  // -----------------------------------------------------------------

  const handleExport = async () => {
    setExporting(true)
    try {
      const result = await exportTemplatesBackup()
      if (result.count === 0) {
        toast.error('Tidak ada template untuk di-backup')
        return
      }

      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')
      const destination = await save({
        defaultPath: result.filename,
        filters: [{ name: 'Backup AISura Template', extensions: ['zip'] }],
      })
      if (!destination) {
        toast.info('Backup dibatalkan')
        return
      }
      const buffer = await result.blob.arrayBuffer()
      await writeFile(destination, new Uint8Array(buffer))
      toast.success(`Backup berhasil disimpan`, {
        description: `${result.count} template diekspor ke ${result.filename}`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[BackupRestore] export failed', err)
      toast.error('Gagal membuat backup', { description: message })
    } finally {
      setExporting(false)
    }
  }

  // -----------------------------------------------------------------
  // Import flow
  // -----------------------------------------------------------------

  const handlePickBackup = async () => {
    setPicking(true)
    setError(null)
    setSummary(null)
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const { readFile } = await import('@tauri-apps/plugin-fs')
      const filePath = await open({
        filters: [{ name: 'Backup AISura Template', extensions: ['zip'] }],
        multiple: false,
      })
      if (!filePath) return
      setInspecting(true)
      const bytes = await readFile(filePath as string)
      const { manifest, warnings } = await inspectTemplatesBackup(bytes)
      const sourceFilename = (filePath as string).split(/[\\/]/).pop() || 'backup.zip'
      setInspect({
        count: manifest.templates.length,
        exportedAt: manifest.exportedAt,
        appVersion: manifest.appVersion,
        warnings,
        names: manifest.templates.map((t) => t.nama),
        bytes,
        sourceFilename,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[BackupRestore] inspect failed', err)
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
      const result = await importTemplatesBackup(inspect.bytes, {
        onDuplicate: conflictStrategy,
      })
      setSummary(result)
      const total = result.inserted + result.overwritten
      if (total === 0 && result.skipped > 0 && result.errors.length === 0) {
        toast.info('Tidak ada perubahan', {
          description: `${result.skipped} template dilewati (semua duplikat).`,
        })
      } else if (result.errors.length > 0) {
        toast.warning('Restore selesai dengan peringatan', {
          description: `${total} berhasil, ${result.errors.length} error.`,
        })
      } else {
        toast.success('Restore template berhasil', {
          description: `+${result.inserted} baru, ${result.overwritten} ditimpa, ${result.skipped} dilewati.`,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[BackupRestore] import failed', err)
      setError(message)
      toast.error('Gagal restore', { description: message })
    } finally {
      setImporting(false)
    }
  }

  const handleResetImport = () => {
    setInspect(null)
    setSummary(null)
    setError(null)
    setConflictStrategy('skip')
  }

  return (
    <div className={crmShell.page}>
      <div>
        <p className={crmShell.eyebrow}>Template tools</p>
        <h1 className={crmShell.title}>Backup & Restore Template</h1>
        <p className={crmShell.subtitle}>
          Ekspor semua template surat ke satu file ZIP untuk dipindahkan ke device lain, atau
          pulihkan dari backup tanpa menghapus template yang sudah ada.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Export */}
        <Card className={crmShell.card}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm">Export Backup</CardTitle>
                <CardDescription>
                  Bundel semua template (file DOCX + metadata) ke satu file ZIP.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li>Format: <span className="font-medium text-foreground">.zip</span> (bisa dibuka Windows Explorer untuk inspeksi).</li>
              <li>Isi: file <span className="font-mono text-foreground">manifest.json</span> + folder <span className="font-mono text-foreground">templates/</span>.</li>
              <li>Hanya berisi template — data warga, riwayat, dan pengaturan tidak ikut.</li>
            </ul>
            <Button onClick={handleExport} disabled={exporting} className="w-full sm:w-auto">
              <Download className="mr-1 h-3.5 w-3.5" />
              {exporting ? 'Memproses...' : 'Export Backup Template'}
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card className={crmShell.card}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600">
                <FolderInput className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm">Restore dari Backup</CardTitle>
                <CardDescription>
                  Pilih file backup ZIP, review isinya, lalu konfirmasi cara menangani duplikat.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-amber-200/70 bg-amber-50/60 p-2.5 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Restore selalu <span className="font-medium">merge</span> — template yang sudah ada di aplikasi
                tidak akan dihapus. Lu cuma perlu putuskan apa yang terjadi kalau ada
                template dengan nama sama (skip atau timpa).
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handlePickBackup}
              disabled={picking || inspecting || importing}
              className="w-full sm:w-auto"
            >
              <PackageOpen className="mr-1 h-3.5 w-3.5" />
              {picking || inspecting ? 'Membaca...' : 'Pilih file backup'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Inspect result + import preview */}
      {inspect && !summary && (
        <Card className={crmShell.card}>
          <CardHeader>
            <CardTitle className="text-sm">Preview Backup</CardTitle>
            <CardDescription>{inspect.sourceFilename}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Total template" value={String(inspect.count)} />
              <Stat label="Diekspor" value={formatDate(inspect.exportedAt)} />
              <Stat label="Versi aplikasi" value={`v${inspect.appVersion}`} />
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
              <p className="text-xs font-medium">Cara menangani template dengan nama sama:</p>
              <RadioGroup
                value={conflictStrategy}
                onValueChange={(v) => setConflictStrategy(v as ConflictStrategy)}
                className="grid gap-2 sm:grid-cols-2"
              >
                <ConflictOption
                  value="skip"
                  selected={conflictStrategy === 'skip'}
                  title="Skip duplikat (default)"
                  description="Jaga template lokal apa adanya. Hanya template baru dari backup yang ditambah."
                />
                <ConflictOption
                  value="overwrite"
                  selected={conflictStrategy === 'overwrite'}
                  title="Overwrite duplikat"
                  description="Ganti file DOCX + metadata template lokal dengan versi dari backup."
                />
              </RadioGroup>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleConfirmImport} disabled={importing}>
                <PackageCheck className="mr-1 h-3.5 w-3.5" />
                {importing ? 'Memulihkan...' : `Restore ${inspect.count} template`}
              </Button>
              <Button variant="ghost" onClick={handleResetImport} disabled={importing}>
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary after import */}
      {summary && (
        <Card className={crmShell.card}>
          <CardHeader>
            <CardTitle className="text-sm">Hasil Restore</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Ditambahkan" value={String(summary.inserted)} tone="success" />
              <Stat label="Ditimpa" value={String(summary.overwritten)} tone="info" />
              <Stat label="Dilewati" value={String(summary.skipped)} tone="muted" />
            </div>
            {summary.errors.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <p className="font-medium">{summary.errors.length} item gagal di-restore:</p>
                <ul className="mt-1 list-inside list-disc">
                  {summary.errors.map((e, i) => (
                    <li key={i}>
                      <span className="font-medium">{e.name || '(tanpa nama)'}</span>: {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleResetImport}>
              Restore backup lain
            </Button>
          </CardContent>
        </Card>
      )}

      {error && !inspect && (
        <Card className={crmShell.card}>
          <CardContent className="flex items-start gap-2 py-4 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}
    </div>
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
    <div className={cn('rounded-xl border p-3', toneClass)}>
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 font-data-number text-lg font-semibold">{value}</p>
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
      htmlFor={`conflict-${value}`}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition-colors',
        selected
          ? 'border-blue-300 bg-blue-50/70 dark:border-blue-800 dark:bg-blue-950/30'
          : 'border-slate-200/80 bg-background hover:border-slate-300 dark:border-slate-800',
      )}
    >
      <RadioGroupItem value={value} id={`conflict-${value}`} className="mt-0.5" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-[11px] leading-snug text-muted-foreground">{description}</p>
        {selected && value === 'overwrite' && (
          <Badge variant="outline" className="rounded-full text-[10px]">
            File DOCX lokal akan ditimpa
          </Badge>
        )}
      </div>
    </Label>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}
