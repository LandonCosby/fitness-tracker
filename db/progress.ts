import type { SQLiteDatabase } from 'expo-sqlite';

import { fromDateKey } from './records';
import { convertWeight, isWeightUnit, type WeightUnit } from './units';

// Estimated 1-rep max uses the Epley formula, only trusted up to this many reps.
export const ONE_REP_MAX_MAX_REPS = 12;

export function estimateOneRepMax(weight: number, reps: number): number | null {
  if (weight <= 0 || reps < 1 || reps > ONE_REP_MAX_MAX_REPS) return null;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

type CompletedSet = {
  sessionId: string;
  startedAt: number;
  exerciseId: string;
  reps: number | null;
  durationS: number | null;
  /** Converted to the requested unit; null for bodyweight sets. */
  weight: number | null;
};

export type ExerciseRecords = {
  heaviest: { weight: number; reps: number | null; at: number } | null;
  bestOneRepMax: { value: number; weight: number; reps: number; at: number } | null;
  mostReps: { reps: number; weight: number | null; at: number } | null;
  longestHold: { seconds: number; at: number } | null;
};

const EMPTY_RECORDS: ExerciseRecords = {
  heaviest: null,
  bestOneRepMax: null,
  mostReps: null,
  longestHold: null,
};

// Completed sets from finished sessions, oldest first. `sessionId` limits to one session
// (finished or not); `before` limits to sessions that started earlier.
async function completedSets(
  db: SQLiteDatabase,
  unit: WeightUnit,
  filters: { exerciseId?: string; sessionId?: string; before?: number; since?: number } = {}
): Promise<CompletedSet[]> {
  const conditions = [
    'st.deleted_at IS NULL',
    'st.completed_at IS NOT NULL',
    'se.deleted_at IS NULL',
    's.deleted_at IS NULL',
  ];
  const params: (string | number)[] = [];
  if (filters.sessionId) {
    conditions.push('s.id = ?');
    params.push(filters.sessionId);
  } else {
    conditions.push('s.ended_at IS NOT NULL');
  }
  if (filters.exerciseId) {
    conditions.push('st.exercise_id = ?');
    params.push(filters.exerciseId);
  }
  if (filters.before != null) {
    conditions.push('s.started_at < ?');
    params.push(filters.before);
  }
  if (filters.since != null) {
    conditions.push('s.started_at >= ?');
    params.push(filters.since);
  }

  const rows = await db.getAllAsync<{
    session_id: string;
    started_at: number;
    exercise_id: string;
    reps: number | null;
    duration_s: number | null;
    weight: number | null;
    unit: string;
  }>(
    `SELECT s.id AS session_id, s.started_at, st.exercise_id, st.reps, st.duration_s,
       st.weight, st.unit
     FROM sets st
     JOIN session_exercises se ON se.id = st.session_exercise_id
     JOIN sessions s ON s.id = se.session_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.started_at, st.set_number`,
    params
  );

  return rows.map((row) => ({
    sessionId: row.session_id,
    startedAt: row.started_at,
    exerciseId: row.exercise_id,
    reps: row.reps,
    durationS: row.duration_s,
    weight:
      row.weight != null && row.weight > 0
        ? convertWeight(row.weight, isWeightUnit(row.unit) ? row.unit : unit, unit)
        : null,
  }));
}

// Best of each record type. Ties keep the earliest, so a record dates from when it was set.
export function computeRecords(sets: CompletedSet[]): ExerciseRecords {
  const records: ExerciseRecords = { ...EMPTY_RECORDS };
  for (const set of sets) {
    if (set.weight != null && (!records.heaviest || set.weight > records.heaviest.weight)) {
      records.heaviest = { weight: set.weight, reps: set.reps, at: set.startedAt };
    }
    if (set.weight != null && set.reps != null) {
      const value = estimateOneRepMax(set.weight, set.reps);
      if (value != null && (!records.bestOneRepMax || value > records.bestOneRepMax.value)) {
        records.bestOneRepMax = { value, weight: set.weight, reps: set.reps, at: set.startedAt };
      }
    }
    if (set.reps != null && set.reps > 0 && (!records.mostReps || set.reps > records.mostReps.reps)) {
      records.mostReps = { reps: set.reps, weight: set.weight, at: set.startedAt };
    }
    if (
      set.durationS != null &&
      set.durationS > 0 &&
      (!records.longestHold || set.durationS > records.longestHold.seconds)
    ) {
      records.longestHold = { seconds: set.durationS, at: set.startedAt };
    }
  }
  return records;
}

export async function getExerciseRecords(
  db: SQLiteDatabase,
  exerciseId: string,
  unit: WeightUnit
): Promise<ExerciseRecords> {
  return computeRecords(await completedSets(db, unit, { exerciseId }));
}

export type RecordsListItem = {
  exerciseId: string;
  name: string;
  isTimed: boolean;
  lastPerformedAt: number;
  records: ExerciseRecords;
};

// Every exercise with logged sets, most recently trained first.
export async function listRecords(
  db: SQLiteDatabase,
  unit: WeightUnit,
  limit = 20
): Promise<RecordsListItem[]> {
  const sets = await completedSets(db, unit);
  const byExercise = new Map<string, CompletedSet[]>();
  for (const set of sets) {
    const list = byExercise.get(set.exerciseId) ?? [];
    list.push(set);
    byExercise.set(set.exerciseId, list);
  }
  if (byExercise.size === 0) return [];

  const ids = [...byExercise.keys()];
  const exercises = await db.getAllAsync<{ id: string; name: string; is_timed: 0 | 1 }>(
    `SELECT id, name, is_timed FROM exercises
     WHERE deleted_at IS NULL AND id IN (${ids.map(() => '?').join(', ')})`,
    ids
  );

  return exercises
    .map((exercise) => {
      const exerciseSets = byExercise.get(exercise.id)!;
      return {
        exerciseId: exercise.id,
        name: exercise.name,
        isTimed: exercise.is_timed === 1,
        lastPerformedAt: exerciseSets[exerciseSets.length - 1].startedAt,
        records: computeRecords(exerciseSets),
      };
    })
    .sort((a, b) => b.lastPerformedAt - a.lastPerformedAt)
    .slice(0, limit);
}

export type ProgressMetric = 'oneRepMax' | 'reps' | 'seconds';

export type ProgressSeries = {
  metric: ProgressMetric;
  /** One point per session: x = session start, y = that session's best. */
  points: { x: number; y: number }[];
};

// What the progress chart plots for an exercise: seconds for timed exercises, estimated
// 1-rep max if it has ever been done with weight, otherwise reps.
export async function getExerciseProgress(
  db: SQLiteDatabase,
  exerciseId: string,
  isTimed: boolean,
  unit: WeightUnit,
  since?: number
): Promise<ProgressSeries> {
  const all = await completedSets(db, unit, { exerciseId });
  const metric: ProgressMetric = isTimed
    ? 'seconds'
    : all.some((s) => s.weight != null)
      ? 'oneRepMax'
      : 'reps';

  const bySession = new Map<string, { x: number; y: number }>();
  for (const set of all) {
    if (since != null && set.startedAt < since) continue;
    const value =
      metric === 'seconds'
        ? set.durationS
        : metric === 'reps'
          ? set.reps
          : set.weight != null && set.reps != null
            ? estimateOneRepMax(set.weight, set.reps)
            : null;
    if (value == null || value <= 0) continue;
    const point = bySession.get(set.sessionId);
    if (!point || value > point.y) bySession.set(set.sessionId, { x: set.startedAt, y: value });
  }

  return { metric, points: [...bySession.values()].sort((a, b) => a.x - b.x) };
}

// The exercise trained most recently, to open the progress chart on.
export async function getMostRecentExerciseId(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ exercise_id: string }>(
    `SELECT st.exercise_id FROM sets st
     JOIN session_exercises se ON se.id = st.session_exercise_id AND se.deleted_at IS NULL
     JOIN sessions s ON s.id = se.session_id AND s.deleted_at IS NULL
     JOIN exercises e ON e.id = st.exercise_id AND e.deleted_at IS NULL
     WHERE st.deleted_at IS NULL AND st.completed_at IS NOT NULL AND s.ended_at IS NOT NULL
     ORDER BY s.started_at DESC LIMIT 1`
  );
  return row?.exercise_id ?? null;
}

export type RecordKind = 'heaviest' | 'bestOneRepMax' | 'mostReps' | 'longestHold';

export type NewRecord = {
  exerciseName: string;
  kind: RecordKind;
  records: ExerciseRecords;
};

// Records a session beat, compared with every earlier session. An exercise's first
// session sets its baseline without counting as a new record.
export async function getNewRecords(
  db: SQLiteDatabase,
  sessionId: string,
  unit: WeightUnit
): Promise<NewRecord[]> {
  const session = await db.getFirstAsync<{ started_at: number }>(
    'SELECT started_at FROM sessions WHERE id = ?',
    sessionId
  );
  if (!session) return [];

  const current = await completedSets(db, unit, { sessionId });
  const exerciseIds = [...new Set(current.map((s) => s.exerciseId))];
  const results: NewRecord[] = [];
  const EPSILON = 1e-6;

  for (const exerciseId of exerciseIds) {
    const before = computeRecords(
      await completedSets(db, unit, { exerciseId, before: session.started_at })
    );
    const now = computeRecords(current.filter((s) => s.exerciseId === exerciseId));
    const beat = (kind: RecordKind, value: (r: ExerciseRecords) => number | undefined) => {
      const old = value(before);
      const fresh = value(now);
      return old != null && fresh != null && fresh > old + EPSILON ? kind : null;
    };
    const kinds = [
      beat('heaviest', (r) => r.heaviest?.weight),
      beat('bestOneRepMax', (r) => r.bestOneRepMax?.value),
      beat('mostReps', (r) => r.mostReps?.reps),
      beat('longestHold', (r) => r.longestHold?.seconds),
    ].filter((k): k is RecordKind => k != null);
    if (kinds.length === 0) continue;

    const exercise = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM exercises WHERE id = ?',
      exerciseId
    );
    for (const kind of kinds) {
      results.push({ exerciseName: exercise?.name ?? 'Exercise', kind, records: now });
    }
  }
  return results;
}

export type WeekTraining = { weekStart: number; workouts: number; sets: number };

// Monday 00:00 local of the week containing `time`.
export function startOfWeek(time: number): number {
  const date = new Date(time);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day).getTime();
}

// Workouts and completed sets per week from `since` to this week, including empty weeks.
export async function getWeeklyTraining(
  db: SQLiteDatabase,
  since: number,
  today: number = Date.now()
): Promise<WeekTraining[]> {
  const rows = await db.getAllAsync<{ started_at: number; set_count: number }>(
    `SELECT s.started_at,
       (SELECT COUNT(*) FROM sets st
          JOIN session_exercises se ON se.id = st.session_exercise_id AND se.deleted_at IS NULL
          WHERE se.session_id = s.id AND st.deleted_at IS NULL AND st.completed_at IS NOT NULL
       ) AS set_count
     FROM sessions s
     WHERE s.deleted_at IS NULL AND s.ended_at IS NOT NULL AND s.started_at >= ?`,
    startOfWeek(since)
  );

  const weeks = new Map<number, WeekTraining>();
  for (
    let week = startOfWeek(since);
    week <= startOfWeek(today);
    week = startOfWeek(week + 8 * 86400000) // +8 days then snap: safe across DST changes
  ) {
    weeks.set(week, { weekStart: week, workouts: 0, sets: 0 });
  }
  for (const row of rows) {
    const week = weeks.get(startOfWeek(row.started_at));
    if (!week) continue;
    week.workouts += 1;
    week.sets += row.set_count;
  }
  return [...weeks.values()];
}

// Time of the first finished workout, for the "All" range.
export async function getFirstSessionTime(db: SQLiteDatabase): Promise<number | null> {
  const row = await db.getFirstAsync<{ first: number | null }>(
    'SELECT MIN(started_at) AS first FROM sessions WHERE deleted_at IS NULL AND ended_at IS NOT NULL'
  );
  return row?.first ?? null;
}

export type DayNutrition = { date: string; x: number; calories: number; proteinG: number };

// Totals for each day that has entries; days with nothing logged are left out (not zero).
export async function getDailyNutrition(
  db: SQLiteDatabase,
  fromDate: string
): Promise<DayNutrition[]> {
  const rows = await db.getAllAsync<{ date: string; calories: number; protein_g: number }>(
    `SELECT date, SUM(calories * servings) AS calories, SUM(protein_g * servings) AS protein_g
     FROM food_entries
     WHERE deleted_at IS NULL AND date >= ?
     GROUP BY date
     ORDER BY date`,
    fromDate
  );
  return rows.map((row) => ({
    date: row.date,
    x: fromDateKey(row.date).getTime(),
    calories: row.calories,
    proteinG: row.protein_g,
  }));
}
