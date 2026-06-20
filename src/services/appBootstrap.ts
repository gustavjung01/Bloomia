import { getDatabase, runMigrations, seedDevelopmentData } from '../db';

export async function bootstrapLocalDatabase() {
  const db = await getDatabase();
  await runMigrations(db);
  await seedDevelopmentData(db);
  return db;
}
