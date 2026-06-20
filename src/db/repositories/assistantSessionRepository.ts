import { getDatabase } from '../client';
import type { AssistantSession } from '../../features/ai/types';

const SETTINGS_KEY = 'tab_assistant_sessions';
const MAX_SESSIONS = 80;

export async function listAssistantSessions() {
  const db = await getDatabase();
  const rows = await db.select<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ? LIMIT 1', [SETTINGS_KEY]);
  if (!rows[0]?.value_json) return [];
  try {
    return JSON.parse(rows[0].value_json) as AssistantSession[];
  } catch {
    return [];
  }
}

export async function saveAssistantSession(session: AssistantSession) {
  const db = await getDatabase();
  const current = await listAssistantSessions();
  const next = [session, ...current.filter((item) => item.id !== session.id)].slice(0, MAX_SESSIONS);
  await db.execute(
    'INSERT OR REPLACE INTO settings (key, value_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [SETTINGS_KEY, JSON.stringify(next)],
  );
  return next;
}

export async function clearAssistantSessions() {
  const db = await getDatabase();
  await db.execute('DELETE FROM settings WHERE key = ?', [SETTINGS_KEY]);
}
