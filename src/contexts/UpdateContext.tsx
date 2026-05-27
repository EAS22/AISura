import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Update } from '@tauri-apps/plugin-updater'
import { toast } from 'sonner'
import { checkForAppUpdate, downloadAndInstallAppUpdate, type DownloadProgressState, type UpdateStatus } from '@/services/updateService'
import pkg from '../../package.json'

interface UpdateContextValue {
  status: UpdateStatus
  currentVersion: string
  availableVersion?: string
  notes?: string
  progress?: DownloadProgressState
  error?: string
  checkUpdate: (silent?: boolean) => Promise<void>
  installUpdate: () => Promise<void>
}

export const APP_VERSION = pkg.version
const UpdateContext = createContext<UpdateContextValue | null>(null)

// Re-check every 30 minutes while app is open. Prevents the situation where
// a user opens the app before a release lands and never sees the update
// notification until they restart manually.
const PERIODIC_CHECK_INTERVAL_MS = 30 * 60 * 1000

export function UpdateProvider({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [update, setUpdate] = useState<Update | null>(null)
  const [availableVersion, setAvailableVersion] = useState<string | undefined>()
  const [notes, setNotes] = useState<string | undefined>()
  const [progress, setProgress] = useState<DownloadProgressState | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [currentVersion, setCurrentVersion] = useState(APP_VERSION)
  /** Track which version we already announced so we don't toast repeatedly. */
  const announcedVersionRef = useRef<string | null>(null)

  const announceUpdateToast = useCallback((version: string) => {
    if (announcedVersionRef.current === version) return
    announcedVersionRef.current = version
    toast.info(`Update tersedia: v${version}`, {
      description: 'Buka Pengaturan > Aplikasi untuk mengunduh dan memasang.',
      duration: 12_000,
    })
  }, [])

  const checkUpdate = useCallback(async (silent = false) => {
    setError(undefined)
    if (!silent) setStatus('checking')
    const result = await checkForAppUpdate()

    if (!result.ok) {
      // Real error (network, parse, signature). Surface to user.
      setUpdate(null)
      setAvailableVersion(undefined)
      setNotes(undefined)
      const message = result.error || 'Gagal mengecek update.'
      setError(message)
      setStatus('error')
      if (!silent) {
        toast.error('Gagal mengecek update', { description: message })
      }
      return
    }

    if (result.update) {
      setUpdate(result.update)
      setAvailableVersion(result.update.version)
      setNotes(result.update.body || undefined)
      setStatus('available')
      announceUpdateToast(result.update.version)
      return
    }

    // ok=true, no update — really up to date.
    setUpdate(null)
    setAvailableVersion(undefined)
    setNotes(undefined)
    setStatus(silent ? 'idle' : 'not_available')
    if (!silent) {
      toast.success('Aplikasi sudah versi terbaru')
    }
  }, [announceUpdateToast])

  const installUpdate = useCallback(async () => {
    if (!update) return
    try {
      setError(undefined)
      setStatus('downloading')
      await downloadAndInstallAppUpdate(update, setProgress)
      setStatus('installing')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[Update] install failed', err)
      setError(message || 'Gagal mengunduh atau memasang update')
      setStatus('error')
      toast.error('Gagal memasang update', { description: message })
    }
  }, [update])

  // Initial silent check at startup.
  useEffect(() => {
    if (!enabled) return
    checkUpdate(true)
  }, [enabled, checkUpdate])

  // Periodic silent re-check so users who keep the app open during a
  // release window still get notified.
  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => {
      // Don't re-check while a download/install is in flight.
      if (status === 'downloading' || status === 'installing') return
      checkUpdate(true)
    }, PERIODIC_CHECK_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [enabled, checkUpdate, status])

  useEffect(() => {
    if (!enabled) return
    import('@tauri-apps/api/app')
      .then(({ getVersion }) => getVersion())
      .then(setCurrentVersion)
      .catch(() => setCurrentVersion(APP_VERSION))
  }, [enabled])

  const value = useMemo(() => ({
    status,
    currentVersion,
    availableVersion,
    notes,
    progress,
    error,
    checkUpdate,
    installUpdate,
  }), [status, currentVersion, availableVersion, notes, progress, error, checkUpdate, installUpdate])

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
}

export function useUpdate() {
  const context = useContext(UpdateContext)
  if (!context) throw new Error('useUpdate must be used within UpdateProvider')
  return context
}
