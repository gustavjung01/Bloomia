import { getDatabase } from '../client';

const KEY = 'item_photo_map';

export async function loadPhotoMap() {
  const db = await getDatabase();
  const rows = await db.select<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ? LIMIT 1', [KEY]);
  if (!rows[0]?.value_json) return {};
  try { return JSON.parse(rows[0].value_json) as { [key: string]: string }; } catch { return {}; }
}

export async function savePhotoMap(map: { [key: string]: string }) {
  const db = await getDatabase();
  const sql = ['INSERT OR REPLACE INTO settings', '(key, value_json, updated_at)', 'VALUES (?, ?, CURRENT_TIMESTAMP)'].join(' ');
  await db.execute(sql, [KEY, JSON.stringify(map)]);
}
