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
