import { getVersion } from '@tauri-apps/api/app';
import { check } from '@tauri-apps/plugin-updater';

export interface UpdateStatus {
  currentVersion: string;
  available: boolean;
  version?: string;
  date?: string;
  body?: string;
}

export async function checkBloomiaUpdate(): Promise<UpdateStatus> {
  const currentVersion = await getVersion();
  const update = await check();
  if (!update) return { currentVersion, available: false };
  return {
    currentVersion,
    available: true,
    version: update.version,
    date: update.date,
    body: update.body,
  };
}

export async function installBloomiaUpdate(onProgress?: (message: string) => void) {
  const update = await check();
  if (!update) return { installed: false, reason: 'no_update' };
  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') onProgress?.('Bắt đầu tải update...');
    if (event.event === 'Progress') onProgress?.('Đang tải update...');
    if (event.event === 'Finished') onProgress?.('Đã tải xong, đang cài update...');
  });
  return { installed: true };
}
