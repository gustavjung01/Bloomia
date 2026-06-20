import { invoke } from '@tauri-apps/api/core';

export interface BloomiaAppStatus {
  app_data_dir: string;
  database_path: string;
  media_dir: string;
  backup_dir: string;
  database_exists: boolean;
}

export interface MediaSaveResult {
  stored_name: string;
  relative_path: string;
  full_path: string;
  size_bytes: number;
}

export async function getBloomiaAppStatus() {
  return invoke<BloomiaAppStatus>('get_bloomia_app_status');
}

export async function backupBloomiaDatabase() {
  return invoke<string>('backup_bloomia_database');
}

export async function listBloomiaBackups() {
  return invoke<string[]>('list_bloomia_backups');
}

export async function saveBloomiaMedia(ownerType: 'shop' | 'items' | 'recipes' | 'orders' | 'customers', file: File) {
  const buffer = await file.arrayBuffer();
  return invoke<MediaSaveResult>('save_bloomia_media', {
    ownerType,
    fileName: file.name,
    bytes: Array.from(new Uint8Array(buffer)),
  });
}
