import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { AIConfig, AIResolvedCredentials } from '@/services/ai'
import { getAIConfig, resolveCredentials } from '@/services/ai'

interface DrawerOpenOptions {
  mode?: 'chat' | 'template'
}

interface AIContextValue {
  ready: boolean
  config: AIConfig | null
  credentials: AIResolvedCredentials | null
  drawerOpen: boolean
  drawerMode: 'chat' | 'template'
  openDrawer: (opts?: DrawerOpenOptions) => void
  closeDrawer: () => void
  reload: () => Promise<void>
}

const AIContext = createContext<AIContextValue | null>(null)

export function AIProvider({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const [ready, setReady] = useState(false)
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'chat' | 'template'>('chat')

  const reload = useCallback(async () => {
    try {
      const cfg = await getAIConfig()
      setConfig(cfg)
    } catch (err) {
      console.warn('Failed to load AI config', err)
      setConfig(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    reload()
  }, [enabled, reload])

  const credentials = useMemo(() => resolveCredentials(config), [config])

  const openDrawer = useCallback((opts?: DrawerOpenOptions) => {
    setDrawerMode(opts?.mode ?? 'chat')
    setDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const value = useMemo<AIContextValue>(
    () => ({
      ready,
      config,
      credentials,
      drawerOpen,
      drawerMode,
      openDrawer,
      closeDrawer,
      reload,
    }),
    [ready, config, credentials, drawerOpen, drawerMode, openDrawer, closeDrawer, reload],
  )

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>
}

export function useAI() {
  const ctx = useContext(AIContext)
  if (!ctx) throw new Error('useAI must be used within AIProvider')
  return ctx
}
