import { getDatabase } from '../client';

const KEY = 'runtime_ai_settings';

export type RuntimeMode = 'local' | 'cloud' | 'off';

export interface RuntimeSettings {
  mode: RuntimeMode;
  serviceUrl: string;
  eventDispatchEnabled: boolean;
}

const defaults: RuntimeSettings = {
  mode: 'local',
  serviceUrl: '',
  eventDispatchEnabled: false,
};

export async function getRuntimeSettings() {
  const db = await getDatabase();
  const rows = await db.select<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ? LIMIT 1', [KEY]);
  if (!rows[0]?.value_json) return defaults;
  try {
    return { ...defaults, ...JSON.parse(rows[0].value_json) } as RuntimeSettings;
  } catch {
    return defaults;
  }
}

export async function saveRuntimeSettings(settings: RuntimeSettings) {
  const db = await getDatabase();
  await db.execute('INSERT OR REPLACE INTO settings (key, value_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [KEY, JSON.stringify(settings)]);
}
