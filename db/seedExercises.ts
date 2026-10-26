import type { SQLiteDatabase } from 'expo-sqlite';

import { now } from './records';
import { getSetting, setSetting } from './settings';
import seed from './seed/exercises.json';

// Bump when db/seed/exercises.json changes so existing installs re-import it.
const BUILT_IN_SEED_VERSION = 1;
const SEED_VERSION_KEY = 'exercise_seed_version';

// Built-in IDs are stable across devices, so the same exercise always has the same ID.
export const BUILT_IN_ID_PREFIX = 'builtin:';

// 10 columns per row keeps each statement well under SQLite's parameter limit.
const ROWS_PER_STATEMENT = 100;

// Inserts the built-in library, or updates it after a seed version bump.
// Custom exercises are never touched.
export async function seedBuiltInExercises(db: SQLiteDatabase) {
  const stored = Number(await getSetting(db, SEED_VERSION_KEY)) || 0;
  if (stored >= BUILT_IN_SEED_VERSION) return;

  const timestamp = now();

  await db.withTransactionAsync(async () => {
    for (let start = 0; start < seed.length; start += ROWS_PER_STATEMENT) {
      const chunk = seed.slice(start, start + ROWS_PER_STATEMENT);
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)').join(', ');
      const params = chunk.flatMap((e) => [
        BUILT_IN_ID_PREFIX + e.id,
        e.name,
        e.primary,
        JSON.stringify(e.secondary),
        e.equipment,
        e.level,
        e.category,
        JSON.stringify(e.instructions),
        timestamp,
        timestamp,
      ]);

      await db.runAsync(
        `INSERT INTO exercises
           (id, name, primary_muscle, secondary_muscles, equipment, is_custom,
            level, category, instructions, created_at, updated_at)
         VALUES ${placeholders}
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name,
           primary_muscle = excluded.primary_muscle,
           secondary_muscles = excluded.secondary_muscles,
           equipment = excluded.equipment,
           level = excluded.level,
           category = excluded.category,
           instructions = excluded.instructions,
           updated_at = excluded.updated_at`,
        params
      );
    }

    await setSetting(db, SEED_VERSION_KEY, String(BUILT_IN_SEED_VERSION));
  });
}
