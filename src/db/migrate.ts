import { migrations } from './migrations';
import { recipeMigrations } from './recipeMigrations';
import { photoMigrations } from './photoMigrations';
import { checkoutMigrations } from './checkoutMigrations';
import type { QueryableDatabase } from './schema';

const allMigrations = migrations.concat(recipeMigrations).concat(photoMigrations).concat(checkoutMigrations);

export async function runMigrations(db: QueryableDatabase) {
  await db.execute('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, description TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  const rows = await db.select<{ id: string }>('SELECT id FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.id));

  for (const migration of allMigrations) {
    if (applied.has(migration.id)) continue;

    try {
      for (const statement of migration.statements) {
        try {
          await db.execute(statement);
        } catch (error) {
          if (!isRecoverableMigrationError(error, statement)) throw error;
          console.warn(`Bloomia migration ${migration.id} recovered from an already-applied schema change.`, error);
        }
      }

      await db.execute('INSERT OR IGNORE INTO schema_migrations (id, description) VALUES (?, ?)', [migration.id, migration.description]);
      applied.add(migration.id);
    } catch (error) {
      throw new Error(`Migration ${migration.id} failed: ${errorMessage(error)}`);
    }
  }
}

function isRecoverableMigrationError(error: unknown, statement: string) {
  const message = errorMessage(error).toLowerCase();
  const isAddColumn = /^\s*alter\s+table\s+.+\s+add\s+column\s+/i.test(statement);
  return isAddColumn && message.includes('duplicate column name');
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown SQLite error';
  }
}
