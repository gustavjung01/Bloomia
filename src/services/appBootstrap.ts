import { getDatabase, runMigrations, seedProductionDefaults } from '../db';

export async function bootstrapLocalDatabase() {
  const db = await getDatabase();
  await runMigrations(db);
  await seedProductionDefaults(db);
  return db;
}
