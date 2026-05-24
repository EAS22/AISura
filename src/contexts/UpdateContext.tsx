import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Update } from '@tauri-apps/plugin-updater'
import { checkForAppUpdate, downloadAndInstallAppUpdate, type DownloadProgressState, type UpdateStatus } from '@/services/updateService'

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

const CURRENT_VERSION = '1.0.0'
const UpdateContext = createContext<UpdateContextValue | null>(null)

export function UpdateProvider({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [update, setUpdate] = useState<Update | null>(null)
  const [availableVersion, setAvailableVersion] = useState<string | undefined>()
  const [notes, setNotes] = useState<string | undefined>()
  const [progress, setProgress] = useState<DownloadProgressState | undefined>()
  const [error, setError] = useState<string | undefined>()

  const checkUpdate = useCallback(async (silent = false) => {
    setError(undefined)
    if (!silent) setStatus('checking')
    const result = await checkForAppUpdate()
    if (result) {
      setUpdate(result)
      setAvailableVersion(result.version)
      setNotes(result.body || undefined)
      setStatus('available')
      return
    }
    setUpdate(null)
    setAvailableVersion(undefined)
    setNotes(undefined)
    setStatus(silent ? 'idle' : 'not_available')
  }, [])

  const installUpdate = useCallback(async () => {
    if (!update) return
    try {
      setError(undefined)
      setStatus('downloading')
      await downloadAndInstallAppUpdate(update, setProgress)
      setStatus('installing')
    } catch (err) {
      console.error(err)
      setError('Gagal mengunduh atau memasang update')
      setStatus('error')
    }
  }, [update])

  useEffect(() => {
    if (!enabled) return
    checkUpdate(true)
  }, [enabled, checkUpdate])

  const value = useMemo(() => ({
    status,
    currentVersion: CURRENT_VERSION,
    availableVersion,
    notes,
    progress,
    error,
    checkUpdate,
    installUpdate,
  }), [status, availableVersion, notes, progress, error, checkUpdate, installUpdate])

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
}

export function useUpdate() {
  const context = useContext(UpdateContext)
  if (!context) throw new Error('useUpdate must be used within UpdateProvider')
  return context
}
