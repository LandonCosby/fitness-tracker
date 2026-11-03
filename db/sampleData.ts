import type { SQLiteDatabase } from 'expo-sqlite';

import { findPreset } from './workoutPresets';
import { getSetting, setSetting } from './settings';

// TEST DATA: ~13 weeks of finished Push / Pull / Legs workouts with steadily rising
// weights, plus weigh-ins and three weeks of food logs, so Home, Progress, records and
// history have something to show.
// Inserted once (tracked by SAMPLE_VERSION_KEY). Every row's ID starts with SAMPLE_PREFIX,
// so removeSampleData() can take it all out again. Delete this file and its call in
// db/init.ts before shipping.
// 1: workouts. 2: weigh-ins and food logs.
const SAMPLE_VERSION = 2;
const SAMPLE_VERSION_KEY = 'sample_data_version';
export const SAMPLE_PREFIX = 'sample:';

const DAY = 86400000;
const WEEKS = 13;

// Starting weight (lb) and weekly gain per exercise. null = bodyweight (reps grow instead).
const PROGRESSION: Record<string, { start: number | null; perWeek: number; step: number }> = {
  'builtin:Barbell_Bench_Press_-_Medium_Grip': { start: 135, perWeek: 2.5, step: 5 },
  'builtin:Incline_Dumbbell_Press': { start: 45, perWeek: 1, step: 5 },
  'builtin:Standing_Military_Press': { start: 75, perWeek: 1.5, step: 5 },
  'builtin:Side_Lateral_Raise': { start: 15, perWeek: 0.5, step: 2.5 },
  'builtin:Triceps_Pushdown_-_Rope_Attachment': { start: 40, perWeek: 1, step: 5 },
  'builtin:Dips_-_Triceps_Version': { start: null, perWeek: 0, step: 0 },
  'builtin:Barbell_Deadlift': { start: 185, perWeek: 5, step: 5 },
  'builtin:Pullups': { start: null, perWeek: 0, step: 0 },
  'builtin:Bent_Over_Barbell_Row': { start: 115, perWeek: 2.5, step: 5 },
  'builtin:Seated_Cable_Rows': { start: 100, perWeek: 2, step: 5 },
  'builtin:Face_Pull': { start: 30, perWeek: 1, step: 5 },
  'builtin:Barbell_Curl': { start: 55, perWeek: 1, step: 5 },
  'builtin:Hammer_Curls': { start: 25, perWeek: 0.6, step: 5 },
  'builtin:Barbell_Squat': { start: 155, perWeek: 5, step: 5 },
  'builtin:Romanian_Deadlift': { start: 135, perWeek: 3, step: 5 },
  'builtin:Leg_Press': { start: 230, perWeek: 7, step: 10 },
  'builtin:Lying_Leg_Curls': { start: 70, perWeek: 1.5, step: 5 },
  'builtin:Leg_Extensions': { start: 80, perWeek: 1.5, step: 5 },
  'builtin:Standing_Calf_Raises': { start: 120, perWeek: 3, step: 10 },
};

// Sessions per week, oldest first: varied so the weekly bars aren't flat. Week 7 is a deload.
const SESSIONS_PER_WEEK = [3, 4, 3, 5, 4, 4, 1, 3, 5, 4, 4, 5, 3];
// Training days (0 = Monday) to use for each count.
const DAYS_FOR_COUNT: Record<number, number[]> = {
  1: [2],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
};
const ROTATION = ['push', 'pull', 'legs'];

// Small deterministic PRNG so the sample data is the same on every install.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mondayOf(time: number): Date {
  const d = new Date(time);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export async function seedSampleData(db: SQLiteDatabase) {
  const stored = Number(await getSetting(db, SAMPLE_VERSION_KEY)) || 0;
  if (stored < 1) await seedSampleWorkouts(db);
  if (stored < 2) await seedSampleBodyAndFood(db);
  if (stored < SAMPLE_VERSION) await setSetting(db, SAMPLE_VERSION_KEY, String(SAMPLE_VERSION));
}

// v2: a weigh-in every few days (so strength ranks have a body weight) and food logged on
// most of the last three weeks, with a gap 12 days ago (so the Home food streak is 11).
async function seedSampleBodyAndFood(db: SQLiteDatabase) {
  const random = mulberry32(7);
  const timestamp = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateKey = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const foods = await db.getAllAsync<{
    id: string;
    name: string;
    serving_label: string | null;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }>(`SELECT id, name, serving_label, calories, protein_g, carbs_g, fat_g FROM foods WHERE id LIKE 'builtin-food:%'`);
  const byName = new Map(foods.map((f) => [f.name, f]));
  const MEALS: [string, string[]][] = [
    ['breakfast', ['Oatmeal, dry oats', 'Banana', 'Egg, large', 'Coffee, black']],
    ['lunch', ['Chicken breast, cooked', 'White rice, cooked', 'Broccoli, cooked']],
    ['dinner', ['Salmon, cooked', 'Sweet potato, baked', 'Mixed salad greens', 'Olive oil']],
    ['snack', ['Greek yogurt, plain nonfat', 'Whey protein powder', 'Almonds']],
  ];

  await db.withTransactionAsync(async () => {
    // Weigh-ins: 184 → ~179 lb over 13 weeks, with day-to-day noise.
    for (let daysAgo = WEEKS * 7; daysAgo >= 1; daysAgo -= 3 + Math.floor(random() * 2)) {
      const weight = Math.round((179 + (daysAgo / (WEEKS * 7)) * 5 + (random() - 0.5) * 1.6) * 10) / 10;
      await db.runAsync(
        `INSERT INTO body_weights (id, date, weight, unit, created_at, updated_at)
         VALUES (?, ?, ?, 'lb', ?, ?)
         ON CONFLICT DO NOTHING`,
        `${SAMPLE_PREFIX}weight-${daysAgo}`,
        dateKey(daysAgo),
        weight,
        timestamp,
        timestamp
      );
    }

    // Food: the last 21 days except 12 days ago. Today is left for you to log.
    for (let daysAgo = 21; daysAgo >= 1; daysAgo--) {
      if (daysAgo === 12) continue;
      for (const [meal, names] of MEALS) {
        for (const name of names) {
          const food = byName.get(name);
          if (!food) continue;
          const servings = name.startsWith('Chicken') || name.startsWith('White rice') ? 1.5 : 1;
          await db.runAsync(
            `INSERT INTO food_entries
               (id, date, meal, food_id, name, serving_label, servings, calories, protein_g,
                carbs_g, fat_g, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            `${SAMPLE_PREFIX}food-${daysAgo}-${meal}-${food.id}`,
            dateKey(daysAgo),
            meal,
            food.id,
            food.name,
            food.serving_label,
            servings,
            food.calories,
            food.protein_g,
            food.carbs_g,
            food.fat_g,
            timestamp,
            timestamp
          );
        }
      }
    }
  });
}

async function seedSampleWorkouts(db: SQLiteDatabase) {

  const random = mulberry32(42);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const firstMonday = mondayOf(todayStart.getTime() - (WEEKS - 1) * 7 * DAY);

  let rotation = 0;
  let sessionNumber = 0;
  let rowNumber = 0;
  const id = (kind: string) => `${SAMPLE_PREFIX}${kind}-${rowNumber++}`;

  await db.withTransactionAsync(async () => {
    const insertSession = await db.prepareAsync(
      `INSERT INTO sessions (id, workout_id, name, started_at, ended_at, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?)`
    );
    const insertExercise = await db.prepareAsync(
      `INSERT INTO session_exercises (id, session_id, exercise_id, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const insertSet = await db.prepareAsync(
      `INSERT INTO sets (id, session_exercise_id, exercise_id, set_number, reps, duration_s,
         weight, unit, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, 'lb', ?, ?, ?)`
    );

    try {
      for (let week = 0; week < WEEKS; week++) {
        const days = DAYS_FOR_COUNT[SESSIONS_PER_WEEK[week]];
        const deload = SESSIONS_PER_WEEK[week] === 1;

        for (const dayOffset of days) {
          const day = new Date(firstMonday);
          day.setDate(day.getDate() + week * 7 + dayOffset);
          if (day.getTime() >= todayStart.getTime()) continue; // nothing today or later

          const preset = findPreset(ROTATION[rotation++ % ROTATION.length]);
          if (!preset) continue;

          // Evening start between 5:00 and 7:30 pm; 50–80 minutes long.
          const start = day.getTime() + (17 * 60 + Math.floor(random() * 150)) * 60000;
          const end = start + (50 + Math.floor(random() * 30)) * 60000;
          const sessionId = id('session');
          await insertSession.executeAsync(sessionId, preset.name, start, end, start, end);

          let clock = start + 5 * 60000;
          for (const [position, exercise] of preset.exercises.entries()) {
            const sessionExerciseId = id('exercise');
            await insertExercise.executeAsync(
              sessionExerciseId,
              sessionId,
              exercise.id,
              position,
              start,
              end
            );

            const plan = PROGRESSION[exercise.id];
            const weeksIn = week + random() * 0.6;
            const weight =
              plan?.start != null
                ? Math.round((plan.start + plan.perWeek * weeksIn) / plan.step) * plan.step *
                  (deload ? 0.8 : 1)
                : null;

            for (let setNumber = 1; setNumber <= exercise.sets; setNumber++) {
              // Bodyweight lifts gain about a rep every 3 weeks; later sets lose a rep or two.
              const base = weight == null ? exercise.target - 2 + Math.floor(week / 3) : exercise.target;
              const fatigue = setNumber === exercise.sets && random() < 0.4 ? 1 + Math.floor(random() * 2) : 0;
              const reps = Math.max(1, base - fatigue);
              clock += (2 + Math.floor(random() * 2)) * 60000;
              await insertSet.executeAsync(
                id('set'),
                sessionExerciseId,
                exercise.id,
                setNumber,
                reps,
                weight == null ? null : Math.round(weight / 2.5) * 2.5,
                Math.min(clock, end),
                start,
                end
              );
            }
          }
          sessionNumber++;
        }
      }
    } finally {
      await insertSession.finalizeAsync();
      await insertExercise.finalizeAsync();
      await insertSet.finalizeAsync();
    }

  });

  return sessionNumber;
}

// Deletes every sample row (hard delete: it's test data, there's nothing to sync).
// The version setting stays, so the sample data isn't inserted again on next launch.
export async function removeSampleData(db: SQLiteDatabase) {
  const pattern = `${SAMPLE_PREFIX}%`;
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM sets WHERE id LIKE ?', pattern);
    await db.runAsync('DELETE FROM session_exercises WHERE id LIKE ?', pattern);
    await db.runAsync('DELETE FROM sessions WHERE id LIKE ?', pattern);
    await db.runAsync('DELETE FROM body_weights WHERE id LIKE ?', pattern);
    await db.runAsync('DELETE FROM food_entries WHERE id LIKE ?', pattern);
  });
}
