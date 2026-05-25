import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Users, Clock, FilePlus, Upload, ArrowRight, Activity, CheckCircle2, Layers3 } from 'lucide-react'
import { useNavigationContext } from '@/lib/router'
import { cn } from '@/lib/utils'
import { crmShell, getCompletionPercent, getCrmStatTone } from '@/lib/aisura-crm-ui'
import type { RiwayatSurat } from '@/types'

export function Dashboard() {
  const { navigate } = useNavigationContext()
  const [templateCount, setTemplateCount] = useState(0)
  const [wargaCount, setWargaCount] = useState(0)
  const [riwayatCount, setRiwayatCount] = useState(0)
  const [recentRiwayat, setRecentRiwayat] = useState<RiwayatSurat[]>([])

  useEffect(() => {
    loadCounts()
  }, [])

  const loadCounts = async () => {
    try {
      const { getTemplateCount } = await import('@/services/templateService')
      const { getWargaCount } = await import('@/services/wargaService')
      const { getRiwayatCount } = await import('@/services/riwayatService')
      const { getAllRiwayat } = await import('@/services/riwayatService')
      setTemplateCount(await getTemplateCount())
      setWargaCount(await getWargaCount())
      setRiwayatCount(await getRiwayatCount())
      setRecentRiwayat((await getAllRiwayat()).slice(0, 5))
    } catch { /* ignore in dev */ }
  }

  const stats = [
    { title: 'Template Surat', value: templateCount, icon: FileText, caption: 'DOCX aktif di sistem' },
    { title: 'Data Warga', value: wargaCount, icon: Users, caption: 'Penduduk siap pakai' },
    { title: 'Surat Dibuat', value: riwayatCount, icon: Clock, caption: 'Riwayat tersimpan' },
  ]
  const dataReadiness = getCompletionPercent([templateCount, wargaCount].filter(Boolean).length, 2)

  return (
    <div className={crmShell.page}>
      <div className={crmShell.pageHeader}>
        <div>
          <p className={crmShell.eyebrow}>AISura workspace</p>
          <h1 className={crmShell.title}>Dashboard Administrasi</h1>
          <p className={crmShell.subtitle}>Ringkasan data real dan alur cepat pembuatan surat desa.</p>
        </div>
        <Button onClick={() => navigate('/buat-surat')} className="rounded-xl bg-blue-600 shadow-sm shadow-blue-200 hover:bg-blue-700 dark:shadow-none">
          Buat Surat <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card className={cn(crmShell.panel, 'overflow-hidden')}>
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_260px]">
            <div className="space-y-4">
              <Badge className="rounded-full bg-blue-600/10 text-blue-700 hover:bg-blue-600/10 dark:text-blue-300">+{riwayatCount} surat tersimpan</Badge>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Operasional surat lebih rapi</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Gunakan template DOCX, data warga, nomor surat otomatis, dan riwayat dalam satu workspace desktop.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate('/template-surat')} variant="outline" className="rounded-xl bg-white/80 dark:bg-zinc-950/60">Kelola Template</Button>
                <Button size="sm" onClick={() => navigate('/data-warga')} variant="outline" className="rounded-xl bg-white/80 dark:bg-zinc-950/60">Import Warga</Button>
              </div>
            </div>
            <div className="rounded-2xl border border-blue-200/70 bg-white/75 p-4 dark:border-blue-900/50 dark:bg-zinc-950/55">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kesiapan Data</p>
                  <p className="mt-1 font-data-number text-3xl font-semibold">{dataReadiness}%</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-blue-600" />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${dataReadiness}%` }} />
              </div>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Template tersedia</span><span>{templateCount > 0 ? 'Siap' : 'Belum'}</span></div>
                <div className="flex justify-between"><span>Data warga tersedia</span><span>{wargaCount > 0 ? 'Siap' : 'Belum'}</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={crmShell.card}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-blue-600" /> Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentRiwayat.length > 0 ? recentRiwayat.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border bg-slate-50/70 px-3 py-2 dark:bg-zinc-900/60">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.template_nama || 'Surat'}</p>
                  <p className="truncate font-data-number text-xs text-muted-foreground">{item.nomor_surat || '-'}</p>
                </div>
                <Badge variant="secondary" className="rounded-full">Baru</Badge>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Belum ada aktivitas surat.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => {
          const tone = getCrmStatTone(index)
          return (
            <Card key={stat.title} className={cn('overflow-hidden rounded-2xl shadow-sm', tone.card)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="mt-2 font-data-number text-3xl font-semibold tracking-tight">{stat.value}</p>
                  </div>
                  <div className={cn('rounded-2xl p-2 shadow-sm', tone.icon)}><stat.icon className="h-4 w-4" /></div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/80 dark:bg-zinc-900">
                  <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.min(100, Math.max(14, stat.value * 8))}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{stat.caption}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className={crmShell.card}>
          <CardHeader><CardTitle className="text-sm">Aksi Cepat</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <QuickAction icon={FilePlus} title="Buat Surat Baru" desc="Pilih template, isi data, preview, download." onClick={() => navigate('/buat-surat')} />
            <QuickAction icon={Upload} title="Import Data Warga" desc="Masukkan CSV/XLSX agar placeholder otomatis." onClick={() => navigate('/data-warga')} />
          </CardContent>
        </Card>
        <Card className={crmShell.card}>
          <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Layers3 className="h-4 w-4 text-blue-600" /> Pipeline Administrasi</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {['Template', 'Data Warga', 'Generate Surat'].map((step, index) => (
              <div key={step} className="rounded-2xl border bg-slate-50/70 p-4 dark:bg-zinc-900/60">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white">{index + 1}</div>
                <p className="font-medium">{step}</p>
                <p className="mt-1 text-xs text-muted-foreground">{index === 0 ? `${templateCount} template` : index === 1 ? `${wargaCount} warga` : `${riwayatCount} surat`}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, title, desc, onClick }: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex items-center gap-3 rounded-2xl border bg-slate-50/70 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50 dark:bg-zinc-900/60 dark:hover:border-blue-900/60 dark:hover:bg-blue-950/20">
      <div className="rounded-xl bg-blue-600/10 p-2 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white"><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  )
}
