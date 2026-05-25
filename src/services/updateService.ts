import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'not_available' | 'downloading' | 'installing' | 'error'

export interface DownloadProgressState {
  downloaded: number
  contentLength: number
  chunkLength: number
  percent: number
}

export function getUpdateBadgeLabel(status: UpdateStatus, availableVersion?: string, currentVersion = '1.0.0') {
  if (status === 'available') return 'Update'
  return `v${currentVersion}`
}

export function createProgressState(input: { downloaded: number; contentLength: number; chunkLength: number }): DownloadProgressState {
  const downloaded = input.downloaded + input.chunkLength
  const percent = input.contentLength > 0 ? Math.min(100, Math.round((downloaded / input.contentLength) * 100)) : 0
  return { ...input, downloaded, percent }
}

export async function checkForAppUpdate(): Promise<Update | null> {
  try {
    return await check()
  } catch (err) {
    console.warn('Update check failed', err)
    return null
  }
}

export async function downloadAndInstallAppUpdate(update: Update, onProgress: (progress: DownloadProgressState) => void) {
  let downloaded = 0
  let contentLength = 0

  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      contentLength = event.data.contentLength || 0
      downloaded = 0
      onProgress({ downloaded, contentLength, chunkLength: 0, percent: 0 })
    }

    if (event.event === 'Progress') {
      const progress = createProgressState({ downloaded, contentLength, chunkLength: event.data.chunkLength })
      downloaded = progress.downloaded
      onProgress(progress)
    }

    if (event.event === 'Finished') {
      onProgress({ downloaded: contentLength, contentLength, chunkLength: 0, percent: 100 })
    }
  })

  await relaunch()
}
