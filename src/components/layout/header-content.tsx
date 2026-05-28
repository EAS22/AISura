import { useState, useEffect, useRef } from 'react'
import { Sun, Moon, User, LogOut, Search, Sparkles } from 'lucide-react'
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
import { getDisplayName } from '@/services/authService'
import { getDisplayNameInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useAI } from '@/contexts/AIContext'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/buat-surat': 'Buat Surat',
  '/template-surat': 'Template Surat',
  '/placeholder': 'Placeholder',
  '/template/backup-restore': 'Manajemen Template',
  '/data-warga': 'Data Warga',
  '/riwayat-surat': 'Riwayat Surat',
  '/pengaturan/data-desa': 'Data Desa',
  '/pengaturan/nomor-surat': 'Nomor Surat',
  '/pengaturan/aplikasi': 'Aplikasi',
  '/pengaturan/ai': 'AI',
  '/profil': 'Profil',
}

// Extra search keywords per page so the header search bar finds a page
// even when the user types a synonym instead of the exact title.
// For example, the "Manajemen Template" page covers backup, restore,
// import, export, and delete-all-template flows — searching any of those
// terms should surface it.
const PAGE_KEYWORDS: Record<string, string[]> = {
  '/template/backup-restore': [
    'backup',
    'restore',
    'import',
    'export',
    'hapus semua template',
    'reset template',
    'manajemen template',
  ],
  '/pengaturan/aplikasi': ['update', 'backup aplikasi', 'restore aplikasi', 'gambar login'],
  '/pengaturan/ai': ['ai', 'asisten', 'provider', 'api key'],
  '/pengaturan/nomor-surat': ['nomor', 'counter'],
}

const BREADCRUMBS: Record<string, string[]> = {
  '/template-surat': ['Template', 'Template Surat'],
  '/placeholder': ['Template', 'Placeholder'],
  '/template/backup-restore': ['Template', 'Manajemen'],
  '/pengaturan/data-desa': ['Pengaturan', 'Data Desa'],
  '/pengaturan/nomor-surat': ['Pengaturan', 'Nomor Surat'],
  '/pengaturan/aplikasi': ['Pengaturan', 'Aplikasi'],
  '/pengaturan/ai': ['Pengaturan', 'AI'],
}

interface HeaderContentProps {
  onLogout: () => void
}

export function HeaderContent({ onLogout }: HeaderContentProps) {
  const { theme, setTheme } = useTheme()
  const { currentPath, navigate } = useNavigationContext()
  const ai = useAI()
  const [clock, setClock] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [displayName, setDisplayName] = useState('Admin')
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getDisplayName().then(setDisplayName).catch(() => {})
  }, [currentPath]) // reload when navigating (e.g. after profile update)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setClock(now.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }))
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const allPages = Object.entries(PAGE_TITLES).map(([path, title]) => ({
    path,
    title,
    keywords: PAGE_KEYWORDS[path] ?? [],
  }))
  const filteredPages = searchQuery.length > 0
    ? allPages.filter((p) => {
        const q = searchQuery.toLowerCase()
        if (p.title.toLowerCase().includes(q)) return true
        return p.keywords.some((k) => k.toLowerCase().includes(q))
      })
    : []

  const handleSearchSelect = (path: string) => {
    navigate(path)
    setSearchQuery('')
    setSearchOpen(false)
  }

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
      <div className="relative hidden md:block w-56" ref={searchRef}>
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari halaman..."
          className="pl-8 h-9"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
          onFocus={() => { if (searchQuery) setSearchOpen(true) }}
        />
        {searchOpen && filteredPages.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 overflow-hidden">
            {filteredPages.map(p => (
              <button
                key={p.path}
                onClick={() => handleSearchSelect(p.path)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${p.path === currentPath ? 'bg-accent/50 font-medium' : ''}`}
              >
                {p.title}
              </button>
            ))}
          </div>
        )}
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

      {/* AI assistant trigger */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300',
          ai.credentials && 'ai-shine-button',
        )}
        onClick={() => ai.openDrawer({ mode: 'chat' })}
        title={ai.credentials ? 'Asisten AI' : 'AI belum aktif — buka Pengaturan AI'}
      >
        <Sparkles className={cn('h-4 w-4', ai.credentials && 'ai-shine-icon')} />
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
              <AvatarFallback className="text-xs">{getDisplayNameInitials(displayName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuLabel className="text-xs">{displayName}</DropdownMenuLabel>
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
