import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Tags,
  Users,
  Clock,
  Settings,
  Building2,
  Hash,
  Monitor,
  Sparkles,
  Archive,
} from 'lucide-react'

export const sidebarData = {
  user: {
    name: 'Admin',
    email: 'dev@eas.biz.id',
    avatar: '',
  },
  teams: [],
  navGroups: [
    {
      title: 'Menu',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
        { title: 'Buat Surat', url: '/buat-surat', icon: FilePlus },
        {
          title: 'Template',
          icon: FileText,
          items: [
            { title: 'Template Surat', url: '/template-surat', icon: FileText },
            { title: 'Placeholder', url: '/placeholder', icon: Tags },
            { title: 'Manajemen', url: '/template/backup-restore', icon: Archive },
          ],
        },
        { title: 'Data Warga', url: '/data-warga', icon: Users },
        { title: 'Riwayat Surat', url: '/riwayat-surat', icon: Clock },
      ],
    },
    {
      title: 'Pengaturan',
      items: [
        { title: 'Data Desa', url: '/pengaturan/data-desa', icon: Building2 },
        { title: 'Nomor Surat', url: '/pengaturan/nomor-surat', icon: Hash },
        { title: 'AI', url: '/pengaturan/ai', icon: Sparkles },
        { title: 'Aplikasi', url: '/pengaturan/aplikasi', icon: Monitor },
      ],
    },
  ],
}
