import { ChevronRight, FileText, IdCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeOneLine } from '@/utils/textNormalizer'
import type { AIChoice, AIQuickReplies } from '@/services/ai'

interface ChoiceCardListProps {
  quickReplies: AIQuickReplies
  /** True when this choice set is the latest (interactive). Older sets render disabled. */
  active: boolean
  onPick: (choice: AIChoice) => void
}

export function ChoiceCardList({ quickReplies, active, onPick }: ChoiceCardListProps) {
  const Icon = quickReplies.kind === 'pick_template' ? FileText : IdCard
  return (
    <div className="space-y-2">
      {quickReplies.prompt && (
        <p className="text-[11px] font-medium text-muted-foreground">{quickReplies.prompt}</p>
      )}
      {quickReplies.choices.length === 0 ? (
        <div className="rounded-xl border border-dashed p-3 text-center text-[11px] text-muted-foreground">
          Tidak ada hasil. Coba ketik kata kunci lain.
        </div>
      ) : (
        <div className="grid gap-2">
          {quickReplies.choices.map((c, idx) => (
            <button
              key={c.id}
              type="button"
              disabled={!active}
              onClick={() => active && onPick(c)}
              title={c.fullText}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl border bg-white/72 p-3 text-left transition backdrop-blur-md dark:bg-zinc-950/55',
                active
                  ? 'border-blue-200/70 hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md hover:shadow-blue-100/40 dark:border-blue-900/40 dark:hover:bg-blue-950/30'
                  : 'cursor-not-allowed border-white/40 opacity-60 dark:border-white/10',
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{normalizeOneLine(c.primary)}</p>
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-data-number text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    #{idx + 1}
                  </span>
                </div>
                {c.secondary && (
                  <p className="truncate font-data-number text-[11px] text-muted-foreground">{normalizeOneLine(c.secondary)}</p>
                )}
                {c.tertiary && (
                  <p className="line-clamp-1 text-[11px] text-muted-foreground/85">{normalizeOneLine(c.tertiary)}</p>
                )}
                {c.badges && c.badges.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.badges.map((b) => (
                      <span
                        key={b}
                        className="rounded-full border border-blue-200/70 bg-blue-50/80 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <ChevronRight
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  active && 'group-hover:translate-x-0.5 group-hover:text-blue-600',
                )}
              />
            </button>
          ))}
        </div>
      )}
      {quickReplies.needsRefine && active && (
        <p className="text-[10px] text-muted-foreground">
          Banyak hasil cocok. Pilih dari atas atau ketik nama lebih spesifik.
        </p>
      )}
    </div>
  )
}
