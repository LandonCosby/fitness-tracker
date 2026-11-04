import type { SQLiteDatabase } from 'expo-sqlite';

// Shared columns that keep sync possible later (see PLAN.md, "Sync later").
const RECORD_COLUMNS = `
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER`;

// Each entry upgrades the schema by one version, tracked in PRAGMA user_version.
// Only append new migrations; never edit one that has shipped.
const migrations: string[] = [
  `
  CREATE TABLE exercises (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    secondary_muscles TEXT NOT NULL DEFAULT '[]',
    equipment TEXT,
    is_custom INTEGER NOT NULL DEFAULT 0,${RECORD_COLUMNS}
  );

  CREATE TABLE workouts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    body_part TEXT,
    notes TEXT,${RECORD_COLUMNS}
  );

  CREATE TABLE workout_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    workout_id TEXT NOT NULL REFERENCES workouts (id),
    exercise_id TEXT NOT NULL REFERENCES exercises (id),
    position INTEGER NOT NULL,${RECORD_COLUMNS}
  );
  CREATE INDEX idx_workout_exercises_workout ON workout_exercises (workout_id, position);

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    workout_id TEXT REFERENCES workouts (id),
    started_at INTEGER NOT NULL,
    ended_at INTEGER,${RECORD_COLUMNS}
  );
  CREATE INDEX idx_sessions_started_at ON sessions (started_at);

  CREATE TABLE sets (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions (id),
    exercise_id TEXT NOT NULL REFERENCES exercises (id),
    set_number INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('lb', 'kg')),${RECORD_COLUMNS}
  );
  CREATE INDEX idx_sets_session ON sets (session_id);
  CREATE INDEX idx_sets_exercise ON sets (exercise_id);

  CREATE TABLE food_entries (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    meal TEXT NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
    name TEXT NOT NULL,
    calories REAL NOT NULL,
    protein_g REAL NOT NULL DEFAULT 0,
    carbs_g REAL NOT NULL DEFAULT 0,
    fat_g REAL NOT NULL DEFAULT 0,${RECORD_COLUMNS}
  );
  CREATE INDEX idx_food_entries_date ON food_entries (date);

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  `,
  // 2: details for the built-in exercise library.
  `
  ALTER TABLE exercises ADD COLUMN level TEXT;
  ALTER TABLE exercises ADD COLUMN category TEXT;
  ALTER TABLE exercises ADD COLUMN instructions TEXT NOT NULL DEFAULT '[]';
  CREATE INDEX idx_exercises_primary_muscle ON exercises (primary_muscle);
  `,
  // 3: "No equipment" tag (doable at home with nothing or household items).
  `
  ALTER TABLE exercises ADD COLUMN no_equipment INTEGER NOT NULL DEFAULT 0;
  `,
  // 4: workout logging. No released build ever wrote to the workout tables, so they're
  // rebuilt in their final shape rather than altered.
  `
  ALTER TABLE exercises ADD COLUMN is_timed INTEGER NOT NULL DEFAULT 0;

  DROP TABLE sets;
  DROP TABLE workout_exercises;
  DROP TABLE sessions;
  DROP TABLE workouts;

  CREATE TABLE workouts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    muscle_groups TEXT NOT NULL DEFAULT '[]',
    notes TEXT,${RECORD_COLUMNS}
  );

  CREATE TABLE workout_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    workout_id TEXT NOT NULL REFERENCES workouts (id),
    exercise_id TEXT NOT NULL REFERENCES exercises (id),
    position INTEGER NOT NULL,
    target_sets INTEGER NOT NULL,
    target_reps INTEGER,
    target_seconds INTEGER,${RECORD_COLUMNS}
  );
  CREATE INDEX idx_workout_exercises_workout ON workout_exercises (workout_id, position);

  CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    workout_id TEXT REFERENCES workouts (id),
    name TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,${RECORD_COLUMNS}
  );
  CREATE INDEX idx_sessions_started_at ON sessions (started_at);

  CREATE TABLE session_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions (id),
    exercise_id TEXT NOT NULL REFERENCES exercises (id),
    position INTEGER NOT NULL,${RECORD_COLUMNS}
  );
  CREATE INDEX idx_session_exercises_session ON session_exercises (session_id, position);
  CREATE INDEX idx_session_exercises_exercise ON session_exercises (exercise_id);

  CREATE TABLE sets (
    id TEXT PRIMARY KEY NOT NULL,
    session_exercise_id TEXT NOT NULL REFERENCES session_exercises (id),
    exercise_id TEXT NOT NULL REFERENCES exercises (id),
    set_number INTEGER NOT NULL,
    reps INTEGER,
    duration_s INTEGER,
    weight REAL,
    unit TEXT NOT NULL CHECK (unit IN ('lb', 'kg')),
    completed_at INTEGER,${RECORD_COLUMNS}
  );
  CREATE INDEX idx_sets_session_exercise ON sets (session_exercise_id, set_number);
  CREATE INDEX idx_sets_exercise ON sets (exercise_id);
  `,
  // 5: nutrition. Adds the saved-foods library and rebuilds food_entries (never written by
  // a released build). Entries copy per-serving numbers so editing a food doesn't rewrite
  // past days.
  `
  DROP TABLE food_entries;

  CREATE TABLE foods (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    serving_label TEXT,
    calories REAL NOT NULL,
    protein_g REAL NOT NULL DEFAULT 0,
    carbs_g REAL NOT NULL DEFAULT 0,
    fat_g REAL NOT NULL DEFAULT 0,
    last_used_at INTEGER,${RECORD_COLUMNS}
  );
  CREATE INDEX idx_foods_last_used_at ON foods (last_used_at);

  CREATE TABLE food_entries (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    meal TEXT NOT NULL CHECK (meal IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_id TEXT REFERENCES foods (id),
    name TEXT NOT NULL,
    serving_label TEXT,
    servings REAL NOT NULL DEFAULT 1,
    calories REAL NOT NULL,
    protein_g REAL NOT NULL DEFAULT 0,
    carbs_g REAL NOT NULL DEFAULT 0,
    fat_g REAL NOT NULL DEFAULT 0,${RECORD_COLUMNS}
  );
  CREATE INDEX idx_food_entries_date ON food_entries (date);
  `,
  // 6: body weight weigh-ins, at most one per day.
  `
  CREATE TABLE body_weights (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    weight REAL NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('lb', 'kg')),${RECORD_COLUMNS}
  );
  CREATE UNIQUE INDEX idx_body_weights_date ON body_weights (date) WHERE deleted_at IS NULL;
  `,
  // 7: food tabs and logging by weight. category: ingredient | fast_food | meal | custom.
  // brand: restaurant for fast food. serving_grams: weight of one serving, when known, so
  // a food can be logged in grams/ounces; entries copy it for display.
  `
  ALTER TABLE foods ADD COLUMN category TEXT NOT NULL DEFAULT 'custom';
  ALTER TABLE foods ADD COLUMN brand TEXT;
  ALTER TABLE foods ADD COLUMN serving_grams REAL;
  UPDATE foods SET category = 'ingredient' WHERE id LIKE 'builtin-food:%';
  CREATE INDEX idx_foods_category ON foods (category);
  ALTER TABLE food_entries ADD COLUMN serving_grams REAL;
  `,
  // 8: custom meals as recipes. A recipe is a custom food (is_recipe = 1) whose per-serving
  // numbers are worked out from its ingredients; recipe_servings is how many servings the
  // whole recipe makes. Ingredients point at other foods with an amount in their servings.
  `
  ALTER TABLE foods ADD COLUMN is_recipe INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE foods ADD COLUMN recipe_servings REAL;

  CREATE TABLE recipe_items (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL REFERENCES foods (id),
    food_id TEXT NOT NULL REFERENCES foods (id),
    position INTEGER NOT NULL,
    servings REAL NOT NULL,${RECORD_COLUMNS}
  );
  CREATE INDEX idx_recipe_items_recipe ON recipe_items (recipe_id, position);
  `,
];

export const DATABASE_VERSION = migrations.length;

// Passed to <SQLiteProvider onInit>, so it runs before any screen renders.
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  for (let version = currentVersion; version < DATABASE_VERSION; version++) {
    const sql = `${migrations[version]}\nPRAGMA user_version = ${version + 1};`;
    await db.withTransactionAsync(() => db.execAsync(sql));
  }
}
