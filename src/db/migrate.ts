import { migrations } from './migrations';
import type { QueryableDatabase } from './schema';

export async function runMigrations(db: QueryableDatabase) {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  const appliedRows = await db.select<{ id: string }>('SELECT id FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => row.id));

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    for (const statement of migration.statements) {
      await db.execute(statement);
    }

    await db.execute('INSERT INTO schema_migrations (id, description) VALUES (?, ?)', [migration.id, migration.description]);
  }
}
