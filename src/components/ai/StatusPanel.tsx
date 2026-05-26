import { CheckCircle2, Circle, Eye, FileText, CalendarDays, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { AILetterStatus } from '@/services/ai'

interface Props {
  status: AILetterStatus
  onPreview: () => void
  busy?: boolean
}

export function StatusPanel({ status, onPreview, busy }: Props) {
  const filled = status.slots.filter((s) => s.nama).length
  const total = status.slots.length
  const customMissing = status.missingCustom.length

  return (
    <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/90 via-white/70 to-white/70 p-3 shadow-sm shadow-blue-100/40 backdrop-blur-md dark:border-blue-900/40 dark:from-blue-950/40 dark:via-zinc-950/60 dark:to-zinc-950/60">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 shrink-0 text-blue-600" />
          <p className="truncate text-sm font-semibold">{status.templateName}</p>
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-medium',
            status.readyToPreview
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
          )}
        >
          {status.currentStep === 'ready'
            ? 'Siap preview'
            : status.currentStep === 'ask_warga'
              ? `Isi W${status.nextWargaSlot}`
              : status.currentStep === 'ask_custom'
                ? `Isi ${status.nextCustomToken}`
                : 'Pilih template'}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          <span className="truncate">{status.defaultDate}</span>
        </div>
        <div className="flex items-center gap-1">
          <Hash className="h-3 w-3" />
          <span className="truncate font-data-number">{status.nomorPreview || '-'}</span>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Slot warga ({filled}/{total})
          </p>
          <div className="space-y-1">
            {status.slots.map((s) => (
              <div key={s.slot} className="flex items-center gap-2 rounded-lg border bg-background/50 px-2 py-1 text-[11px]">
                {s.nama ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="font-data-number text-muted-foreground">W{s.slot}</span>
                <span className={cn('truncate', s.nama ? 'font-medium text-foreground' : 'italic text-muted-foreground')}>
                  {s.nama || 'belum dipilih'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {customMissing > 0 && (
        <p className="mt-2 text-[10px] text-amber-700 dark:text-amber-300">
          {customMissing} field custom belum diisi: {status.missingCustom.join(', ')}
        </p>
      )}

      {status.allCustomTokens.length > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Field tambahan ({status.allCustomTokens.length - customMissing}/{status.allCustomTokens.length})
          </p>
          <div className="space-y-1">
            {status.allCustomTokens.map((tok) => {
              const filled = !status.missingCustom.includes(tok)
              return (
                <div key={tok} className="flex items-center gap-2 rounded-lg border bg-background/50 px-2 py-1 text-[11px]">
                  {filled ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-data-number truncate">{tok}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Button
        size="sm"
        className="mt-3 w-full rounded-xl bg-blue-600 hover:bg-blue-700"
        onClick={onPreview}
        disabled={!status.readyToPreview || busy}
      >
        <Eye className="mr-1 h-3.5 w-3.5" />
        {busy ? 'Memproses…' : status.readyToPreview ? 'Preview Surat' : 'Lengkapi data dulu'}
      </Button>
    </div>
  )
}
