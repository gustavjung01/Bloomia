import Database from '@tauri-apps/plugin-sql';

import type { QueryableDatabase } from './schema';

const DATABASE_URL = 'sqlite:bloomia.db';

let databasePromise: Promise<QueryableDatabase> | null = null;

export async function getDatabase(): Promise<QueryableDatabase> {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_URL) as Promise<QueryableDatabase>;
  }

  return databasePromise;
}

export function resetDatabaseClientForTests() {
  databasePromise = null;
}
