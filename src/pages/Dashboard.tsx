import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Users, Clock, FilePlus, Upload, ArrowRight } from 'lucide-react'
import { useNavigationContext } from '@/lib/router'

export function Dashboard() {
  const { navigate } = useNavigationContext()
  const [templateCount, setTemplateCount] = useState(0)
  const [wargaCount, setWargaCount] = useState(0)
  const [riwayatCount, setRiwayatCount] = useState(0)

  useEffect(() => {
    loadCounts()
  }, [])

  const loadCounts = async () => {
    try {
      const { getTemplateCount } = await import('@/services/templateService')
      const { getWargaCount } = await import('@/services/wargaService')
      const { getRiwayatCount } = await import('@/services/riwayatService')
      setTemplateCount(await getTemplateCount())
      setWargaCount(await getWargaCount())
      setRiwayatCount(await getRiwayatCount())
    } catch { /* ignore in dev */ }
  }

  const stats = [
    { title: 'Template Surat', value: templateCount, icon: FileText, color: 'text-blue-500' },
    { title: 'Data Warga', value: wargaCount, icon: Users, color: 'text-green-500' },
    { title: 'Surat Dibuat', value: riwayatCount, icon: Clock, color: 'text-yellow-500' },
  ]

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-blue-200/60 bg-gradient-to-br from-blue-50 via-background to-background shadow-sm dark:border-blue-900/40 dark:from-blue-950/25">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Selamat bekerja</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Dashboard AISura</h1>
            <p className="mt-1 text-sm text-muted-foreground">Pantau data utama dan mulai buat surat dari satu tempat.</p>
          </div>
          <Button onClick={() => navigate('/buat-surat')}>
            Buat Surat <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className="rounded-xl bg-muted p-2"><stat.icon className={`h-4 w-4 ${stat.color}`} /></div>
            </CardHeader>
            <CardContent>
              <div className="font-data-number text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => navigate('/buat-surat')} className="group rounded-xl border bg-background p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-900 dark:hover:bg-blue-950/20">
            <FilePlus className="mb-3 h-5 w-5 text-blue-600" />
            <p className="font-semibold">Buat Surat Baru</p>
            <p className="mt-1 text-xs text-muted-foreground">Pilih template, isi data warga, preview, lalu download.</p>
          </button>
          <button onClick={() => navigate('/data-warga')} className="group rounded-xl border bg-background p-4 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20">
            <Upload className="mb-3 h-5 w-5 text-emerald-600" />
            <p className="font-semibold">Import Data Warga</p>
            <p className="mt-1 text-xs text-muted-foreground">Masukkan data CSV/XLSX agar placeholder warga terisi otomatis.</p>
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
