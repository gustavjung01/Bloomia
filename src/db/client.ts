import Database from '@tauri-apps/plugin-sql';

import type { QueryableDatabase } from './schema';

const DATABASE_URL = 'sqlite:bloomia.db';

let databasePromise: Promise<QueryableDatabase> | null = null;

export async function getDatabase(): Promise<QueryableDatabase> {
  if (!databasePromise) {
    databasePromise = (Database.load(DATABASE_URL) as Promise<QueryableDatabase>).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

export function resetDatabaseClient() {
  databasePromise = null;
}

export function resetDatabaseClientForTests() {
  resetDatabaseClient();
}
