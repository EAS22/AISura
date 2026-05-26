export const crmShell = {
  page: 'space-y-5',
  pageHeader: 'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
  eyebrow: 'text-xs font-semibold uppercase tracking-[0.22em] text-blue-600',
  title: 'text-2xl font-semibold tracking-tight text-slate-950 dark:text-white',
  subtitle: 'text-sm text-muted-foreground',

  // Primary glass card — used for most page content frames
  card: 'rounded-2xl border border-white/60 bg-white/72 shadow-sm shadow-blue-100/40 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/65 dark:shadow-none',

  // Glass hero panel — for highlighted sections with blue tint
  panel: 'rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50/75 via-white/55 to-white/55 shadow-sm shadow-blue-100/50 backdrop-blur-xl dark:border-blue-900/40 dark:from-blue-950/40 dark:via-zinc-950/60 dark:to-zinc-950/60',

  // Standalone glass utilities (sticky bars, floating elements)
  glass: 'rounded-2xl border border-white/60 bg-white/68 shadow-sm shadow-blue-100/30 backdrop-blur-xl supports-[backdrop-filter]:bg-white/55 dark:border-white/10 dark:bg-zinc-950/62 dark:supports-[backdrop-filter]:bg-zinc-950/52',
  glassStrong: 'rounded-2xl border border-white/70 bg-white/82 shadow-md backdrop-blur-xl dark:border-white/12 dark:bg-zinc-950/78',
  glassSubtle: 'rounded-xl border border-white/50 bg-white/40 backdrop-blur-sm dark:border-white/8 dark:bg-white/5',
}

const statTones = [
  {
    accent: 'blue',
    card: 'border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-white dark:border-blue-900/50 dark:from-blue-950/35 dark:via-zinc-950 dark:to-zinc-950',
    icon: 'bg-blue-600 text-white shadow-blue-200 dark:shadow-none',
    text: 'text-blue-600',
    bar: 'bg-blue-600',
  },
  {
    accent: 'emerald',
    card: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white dark:border-emerald-900/50 dark:from-emerald-950/25 dark:via-zinc-950 dark:to-zinc-950',
    icon: 'bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none',
    text: 'text-emerald-600',
    bar: 'bg-emerald-600',
  },
  {
    accent: 'amber',
    card: 'border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white dark:border-amber-900/50 dark:from-amber-950/25 dark:via-zinc-950 dark:to-zinc-950',
    icon: 'bg-amber-500 text-white shadow-amber-200 dark:shadow-none',
    text: 'text-amber-600',
    bar: 'bg-amber-500',
  },
  {
    accent: 'rose',
    card: 'border-rose-200/80 bg-gradient-to-br from-rose-50 via-white to-white dark:border-rose-900/50 dark:from-rose-950/25 dark:via-zinc-950 dark:to-zinc-950',
    icon: 'bg-rose-600 text-white shadow-rose-200 dark:shadow-none',
    text: 'text-rose-600',
    bar: 'bg-rose-600',
  },
] as const

export function getCrmStatTone(index: number) {
  return statTones[index % statTones.length]
}

export function getCompletionPercent(value: number, total: number) {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)))
}
