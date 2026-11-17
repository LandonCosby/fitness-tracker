import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from './migrations';
import { seedBuiltInExercises } from './seedExercises';
import { seedBuiltInFoods } from './seedFoods';

// Passed to <SQLiteProvider onInit>, so it finishes before any screen renders.
export async function initDatabase(db: SQLiteDatabase) {
  await migrateDbIfNeeded(db);
  await seedBuiltInExercises(db);
  await seedBuiltInFoods(db);
}
