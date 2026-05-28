import { useState, useEffect } from 'react'
import { initDatabase } from './services/db'
import { hasPassword, getDisplayName } from './services/authService'
import { ThemeProvider } from '@/context/theme-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { UpdateProvider } from '@/contexts/UpdateContext'
import { AIProvider, useAI } from '@/contexts/AIContext'
import { AIDrawer } from '@/components/ai/AIDrawer'
import { LetterPreviewBridge } from '@/components/ai/LetterPreviewBridge'
import { Toaster } from '@/components/ui/sonner'
import { NavigationContext } from '@/lib/router'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { Header } from '@/components/layout/header'
import { HeaderContent } from '@/components/layout/header-content'
import { Main } from '@/components/layout/main'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { BuatSurat } from '@/pages/BuatSurat'
import { TemplateSuratPage } from '@/pages/TemplateSurat'
import { PlaceholderPage } from '@/pages/Placeholder'
import { TemplateBackupRestorePage } from '@/pages/template/BackupRestore'
import { DataWarga } from '@/pages/DataWarga'
import { RiwayatSuratPage } from '@/pages/RiwayatSurat'
import { DataDesaPage } from '@/pages/pengaturan/DataDesa'
import { NomorSuratPage } from '@/pages/pengaturan/NomorSurat'
import { AplikasiPage } from '@/pages/pengaturan/Aplikasi'
import { AIPage } from '@/pages/pengaturan/AI'
import { Profil } from '@/pages/Profil'
import { sidebarData } from '@/config/sidebar-data'
import type { SidebarData } from '@/components/layout/types'

type AuthStatus = 'checking' | 'setup' | 'login' | 'authenticated'

function App() {
  const [isReady, setIsReady] = useState(false)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [currentPath, setCurrentPath] = useState('/')

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDatabase()
        const passwordExists = await hasPassword()
        setAuthStatus(passwordExists ? 'login' : 'setup')
        setIsReady(true)
      } catch (error) {
        console.error('Failed to initialize:', error)
        setAuthStatus('setup')
        setIsReady(true)
      }
    }
    bootstrap()
  }, [])

  const handleLoginSuccess = () => {
    setAuthStatus('authenticated')
  }

  const handleLogout = () => {
    setAuthStatus('login')
    setCurrentPath('/')
  }

  if (!isReady || authStatus === 'checking') {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="text-center">
          <span className="text-2xl font-bold" style={{ fontFamily: "'Unica One', cursive" }}>
            <span className="text-primary">AI</span>
            <span className="text-foreground">Sura</span>
          </span>
          <p className="text-xs text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (authStatus === 'setup' || authStatus === 'login') {
    return (
      <ThemeProvider>
        <Login isSetup={authStatus === 'setup'} onSuccess={handleLoginSuccess} />
      </ThemeProvider>
    )
  }

  const renderPage = () => {
    const page = (() => {
      switch (currentPath) {
        case '/': return <Dashboard />
        case '/buat-surat': return <BuatSurat />
        case '/template-surat': return <TemplateSuratPage />
        case '/placeholder': return <PlaceholderPage />
        case '/template/backup-restore': return <TemplateBackupRestorePage />
        case '/data-warga': return <DataWarga />
        case '/riwayat-surat': return <RiwayatSuratPage />
        case '/pengaturan/data-desa': return <DataDesaPage />
        case '/pengaturan/nomor-surat': return <NomorSuratPage />
        case '/pengaturan/aplikasi': return <AplikasiPage />
        case '/pengaturan/ai': return <AIPage />
        case '/profil': return <Profil />
        default: return <Dashboard />
      }
    })()

    // Pages that manage their own scroll internally
    if (currentPath === '/buat-surat' || currentPath === '/data-warga' || currentPath === '/riwayat-surat') return page

    // All other pages get a default scroll wrapper
    return <div className="flex-1 overflow-y-auto">{page}</div>
  }

  return (
    <ThemeProvider>
      <LayoutProvider>
        <NavigationContext.Provider value={{ currentPath, navigate: setCurrentPath }}>
          <UpdateProvider enabled={authStatus === 'authenticated'}>
            <AIProvider enabled={authStatus === 'authenticated'}>
              <SidebarProvider>
                <AppSidebar sidebarData={sidebarData as SidebarData} />
                <div className="flex min-h-0 flex-1 flex-col w-full overflow-hidden">
                  <Header fixed>
                    <HeaderContent onLogout={handleLogout} />
                  </Header>
                  <Main>
                    {renderPage()}
                  </Main>
                </div>
                <AIDrawerHost />
              </SidebarProvider>
            </AIProvider>
          </UpdateProvider>
          <Toaster />
        </NavigationContext.Provider>
      </LayoutProvider>
    </ThemeProvider>
  )
}

export default App

function AIDrawerHost() {
  const ai = useAI()
  return (
    <>
      <AIDrawer
        open={ai.drawerOpen}
        onOpenChange={(open) => (open ? ai.openDrawer() : ai.closeDrawer())}
        defaultMode={ai.drawerMode}
      />
      {/* Render preview dialog at root level (sibling of Sheet, not child)
          to prevent Radix nested-portal cleanup race that leaves the body
          pointer-events disabled and freezes UI rendering. */}
      <LetterPreviewBridge bridge={ai.previewBridge} />
    </>
  )
}
