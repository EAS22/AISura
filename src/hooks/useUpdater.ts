import { useState, useEffect } from 'react';

interface UpdateInfo {
  available: boolean;
  version?: string;
  body?: string;
}

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ available: false });
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);

  const checkForUpdate = async () => {
    setChecking(true);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update) {
        setUpdateInfo({
          available: true,
          version: update.version,
          body: update.body || undefined,
        });
      } else {
        setUpdateInfo({ available: false });
      }
    } catch (err) {
      console.error('Update check failed:', err);
    } finally {
      setChecking(false);
    }
  };

  const installUpdate = async () => {
    setInstalling(true);
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const { relaunch } = await import('@tauri-apps/plugin-process');
      const update = await check();
      if (update) {
        await update.downloadAndInstall();
        await relaunch();
      }
    } catch (err) {
      console.error('Update install failed:', err);
      setInstalling(false);
    }
  };

  useEffect(() => {
    checkForUpdate();
  }, []);

  return { updateInfo, checking, installing, checkForUpdate, installUpdate };
}
