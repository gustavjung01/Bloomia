import { getDatabase } from '../client';

const KEY = 'p0_acceptance_checklist';

export type P0AcceptanceState = Record<string, boolean>;

export async function getP0AcceptanceState() {
  const db = await getDatabase();
  const rows = await db.select<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ? LIMIT 1', [KEY]);
  if (!rows[0]?.value_json) return {} as P0AcceptanceState;
  try {
    return JSON.parse(rows[0].value_json) as P0AcceptanceState;
  } catch {
    return {} as P0AcceptanceState;
  }
}

export async function saveP0AcceptanceState(state: P0AcceptanceState) {
  const db = await getDatabase();
  await db.execute(
    'INSERT OR REPLACE INTO settings (key, value_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [KEY, JSON.stringify(state)],
  );
  return state;
}
