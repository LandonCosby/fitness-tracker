import type { SQLiteDatabase } from 'expo-sqlite';

import { migrateDbIfNeeded } from './migrations';
import { seedSampleData } from './sampleData';
import { seedBuiltInExercises } from './seedExercises';
import { seedBuiltInFoods } from './seedFoods';

// Passed to <SQLiteProvider onInit>, so it finishes before any screen renders.
export async function initDatabase(db: SQLiteDatabase) {
  await migrateDbIfNeeded(db);
  await seedBuiltInExercises(db);
  await seedBuiltInFoods(db);
  // TEST DATA: 3 months of sample workouts. Remove before shipping (see db/sampleData.ts).
  await seedSampleData(db);
}
