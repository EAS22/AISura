import { useState, useEffect } from 'react'
import { Sun, Moon, User, LogOut, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTheme } from '@/context/theme-provider'
import { useNavigationContext } from '@/lib/router'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/buat-surat': 'Buat Surat',
  '/template-surat': 'Template Surat',
  '/placeholder': 'Placeholder',
  '/data-warga': 'Data Warga',
  '/riwayat-surat': 'Riwayat Surat',
  '/pengaturan/data-desa': 'Data Desa',
  '/pengaturan/nomor-surat': 'Nomor Surat',
  '/pengaturan/aplikasi': 'Aplikasi',
  '/profil': 'Profil',
}

const BREADCRUMBS: Record<string, string[]> = {
  '/template-surat': ['Template', 'Template Surat'],
  '/placeholder': ['Template', 'Placeholder'],
  '/pengaturan/data-desa': ['Pengaturan', 'Data Desa'],
  '/pengaturan/nomor-surat': ['Pengaturan', 'Nomor Surat'],
  '/pengaturan/aplikasi': ['Pengaturan', 'Aplikasi'],
}

interface HeaderContentProps {
  onLogout: () => void
}

export function HeaderContent({ onLogout }: HeaderContentProps) {
  const { theme, setTheme } = useTheme()
  const { currentPath, navigate } = useNavigationContext()
  const [clock, setClock] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setClock(now.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  const breadcrumb = BREADCRUMBS[currentPath]
  const pageTitle = PAGE_TITLES[currentPath] || 'Dashboard'

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        {breadcrumb ? (
          breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground">/</span>}
              <span className={i === breadcrumb.length - 1 ? 'font-medium' : 'text-muted-foreground'}>
                {crumb}
              </span>
            </span>
          ))
        ) : (
          <span className="font-medium">{pageTitle}</span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:block w-56">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari halaman..." className="pl-8 h-9" />
      </div>

      {/* Dark mode toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {/* Clock */}
      <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
        {clock}
      </span>

      {/* Avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">AD</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel className="text-xs">Admin</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/profil')}>
            <User className="mr-2 h-3.5 w-3.5" /> Profil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout} className="text-destructive">
            <LogOut className="mr-2 h-3.5 w-3.5" /> Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
