// Builds db/seed/exercises.json from the free-exercise-db dataset (public domain, the Unlicense):
// https://github.com/yuhonas/free-exercise-db
//
// Usage:
//   1. Download https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
//   2. node scripts/build-exercise-seed.mjs <path to downloaded exercises.json>
//   3. Bump BUILT_IN_SEED_VERSION in db/seedExercises.ts so existing installs pick up the changes.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// These categories don't fit logging sets of reps × weight.
const EXCLUDED_CATEGORIES = new Set(['stretching', 'cardio']);

// Dataset muscle names -> the app's muscle groups (db/exerciseTags.ts).
const MUSCLE_MAP = {
  abdominals: 'abs',
  abductors: 'glutes',
  adductors: 'glutes',
  biceps: 'biceps',
  calves: 'calves',
  chest: 'chest',
  forearms: 'forearms',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  lats: 'back',
  'lower back': 'back',
  'middle back': 'back',
  neck: 'back',
  quadriceps: 'quads',
  shoulders: 'shoulders',
  traps: 'back',
  triceps: 'triceps',
};

// Dataset equipment names -> the app's equipment keys (db/exerciseTags.ts).
const EQUIPMENT_MAP = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  machine: 'machine',
  cable: 'cable',
  kettlebells: 'kettlebell',
  bands: 'band',
  'body only': 'bodyweight',
  'medicine ball': 'medicine_ball',
  'exercise ball': 'exercise_ball',
  'e-z curl bar': 'ez_bar',
  'foam roll': 'other',
  other: 'other',
};

function mapMuscle(name) {
  const group = MUSCLE_MAP[name];
  if (!group) throw new Error(`Unmapped muscle: ${name}`);
  return group;
}

function mapEquipment(name) {
  if (name == null) return null;
  const key = EQUIPMENT_MAP[name];
  if (!key) throw new Error(`Unmapped equipment: ${name}`);
  return key;
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/build-exercise-seed.mjs <exercises.json>');
  process.exit(1);
}

const source = JSON.parse(readFileSync(inputPath, 'utf8'));

const exercises = source
  .filter((e) => !EXCLUDED_CATEGORIES.has(e.category))
  .map((e) => {
    const primary = mapMuscle(e.primaryMuscles[0]);
    const secondary = [
      ...new Set([...e.primaryMuscles.slice(1), ...e.secondaryMuscles].map(mapMuscle)),
    ].filter((m) => m !== primary);

    return {
      id: e.id,
      name: e.name.trim(),
      primary,
      secondary,
      equipment: mapEquipment(e.equipment),
      level: e.level ?? null,
      category: e.category ?? null,
      instructions: e.instructions ?? [],
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const outputPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'seed', 'exercises.json');
writeFileSync(outputPath, JSON.stringify(exercises) + '\n');
console.log(`Wrote ${exercises.length} exercises to ${outputPath}`);
