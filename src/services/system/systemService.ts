import { convertFileSrc, invoke } from '@tauri-apps/api/core';

export interface BloomiaAppStatus {
  app_data_dir: string;
  database_path: string;
  media_dir: string;
  backup_dir: string;
  database_exists: boolean;
  pending_restore_exists: boolean;
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

export async function stageBloomiaDatabaseRestore(backupPath: string) {
  return invoke<string>('stage_bloomia_database_restore', { backupPath });
}

export async function saveBloomiaMedia(ownerType: 'shop' | 'items' | 'recipes' | 'orders' | 'customers', file: File) {
  const optimizedFile = await resizeImageFile(file);
  const buffer = await optimizedFile.arrayBuffer();
  return invoke<MediaSaveResult>('save_bloomia_media', {
    ownerType,
    fileName: optimizedFile.name,
    bytes: Array.from(new Uint8Array(buffer)),
  });
}

export async function resolveMediaUrl(relativePath?: string | null) {
  if (!relativePath) return '';
  const status = await getBloomiaAppStatus();
  const localRelativePath = relativePath.split('/').join('\\');
  const fullPath = `${status.app_data_dir}\\${localRelativePath}`;
  return convertFileSrc(fullPath);
}

async function resizeImageFile(file: File) {
  if (!file.type.startsWith('image/')) return file;
  const image = await createImageBitmap(file);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob) return file;
  const safeName = file.name.replace(/\.[^.]+$/, '') || 'bloomia-image';
  return new File([blob], `${safeName}.webp`, { type: 'image/webp' });
}
