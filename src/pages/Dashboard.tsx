import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Users, Clock, FilePlus, Upload } from 'lucide-react'
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
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button size="sm" onClick={() => navigate('/buat-surat')}>
            <FilePlus className="mr-1 h-4 w-4" /> Buat Surat
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/data-warga')}>
            <Upload className="mr-1 h-4 w-4" /> Import Data Warga
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
