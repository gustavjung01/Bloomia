import { migrations } from './migrations';
import { recipeMigrations } from './recipeMigrations';
import { photoMigrations } from './photoMigrations';
import type { QueryableDatabase } from './schema';

const allMigrations = migrations.concat(recipeMigrations).concat(photoMigrations);

export async function runMigrations(db: QueryableDatabase) {
  await db.execute('CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, description TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  const rows = await db.select<{ id: string }>('SELECT id FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.id));
  for (const migration of allMigrations) {
    if (applied.has(migration.id)) continue;
    for (const statement of migration.statements) await db.execute(statement);
    await db.execute('INSERT INTO schema_migrations (id, description) VALUES (?, ?)', [migration.id, migration.description]);
  }
}
