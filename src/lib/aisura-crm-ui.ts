export const crmShell = {
  page: 'space-y-5',
  pageHeader: 'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
  eyebrow: 'text-xs font-semibold uppercase tracking-[0.22em] text-blue-600',
  title: 'text-2xl font-semibold tracking-tight text-slate-950 dark:text-white',
  subtitle: 'text-sm text-muted-foreground',
  card: 'rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-200/60 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/78 dark:shadow-none',
  panel: 'rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50 via-white to-white shadow-sm shadow-blue-100/50 dark:border-blue-900/50 dark:from-blue-950/35 dark:via-zinc-950 dark:to-zinc-950',
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
