import type { SQLiteDatabase } from 'expo-sqlite';

import { MUSCLE_GROUPS, isMuscleGroup, type MuscleGroup } from './exerciseTags';
import { parseJsonArray } from './records';

export type ExerciseMuscles = { primary: MuscleGroup; secondary: MuscleGroup[] };

// Primary and secondary muscles for each exercise ID.
export async function getExerciseMuscles(
  db: SQLiteDatabase,
  exerciseIds: string[]
): Promise<Map<string, ExerciseMuscles>> {
  const ids = [...new Set(exerciseIds)];
  if (ids.length === 0) return new Map();
  const rows = await db.getAllAsync<{ id: string; primary_muscle: string; secondary_muscles: string }>(
    `SELECT id, primary_muscle, secondary_muscles FROM exercises
     WHERE id IN (${ids.map(() => '?').join(', ')})`,
    ids
  );
  const result = new Map<string, ExerciseMuscles>();
  for (const row of rows) {
    if (!isMuscleGroup(row.primary_muscle)) continue;
    result.set(row.id, {
      primary: row.primary_muscle,
      secondary: parseJsonArray(row.secondary_muscles).filter(isMuscleGroup),
    });
  }
  return result;
}

// How hard each muscle is hit by a list of exercises: 'primary' beats 'secondary'.
export function musclesWorked(
  exercises: (ExerciseMuscles | undefined)[]
): Partial<Record<MuscleGroup, 'primary' | 'secondary'>> {
  const worked: Partial<Record<MuscleGroup, 'primary' | 'secondary'>> = {};
  for (const exercise of exercises) {
    if (!exercise) continue;
    for (const muscle of exercise.secondary) worked[muscle] ??= 'secondary';
    worked[exercise.primary] = 'primary';
  }
  return worked;
}

export type MuscleRecovery = {
  muscle: MuscleGroup;
  /** Last completed set that trained it (primary or secondary), or null if not in the window. */
  lastTrainedAt: number | null;
  /** Completed sets in the window where it was the primary muscle. */
  primarySets: number;
};

// When each muscle was last trained, looking back `days` days (completed sets only).
export async function getMuscleRecovery(
  db: SQLiteDatabase,
  days = 7,
  now: number = Date.now()
): Promise<Record<MuscleGroup, MuscleRecovery>> {
  const since = now - days * 86400000;
  const rows = await db.getAllAsync<{
    primary_muscle: string;
    secondary_muscles: string;
    last_at: number;
    set_count: number;
  }>(
    `SELECT e.primary_muscle, e.secondary_muscles,
       MAX(st.completed_at) AS last_at, COUNT(*) AS set_count
     FROM sets st
     JOIN session_exercises se ON se.id = st.session_exercise_id AND se.deleted_at IS NULL
     JOIN sessions s ON s.id = se.session_id AND s.deleted_at IS NULL
     JOIN exercises e ON e.id = st.exercise_id
     WHERE st.deleted_at IS NULL AND st.completed_at IS NOT NULL AND st.completed_at >= ?
     GROUP BY e.id`,
    since
  );

  const result = Object.fromEntries(
    MUSCLE_GROUPS.map((muscle) => [muscle, { muscle, lastTrainedAt: null, primarySets: 0 }])
  ) as Record<MuscleGroup, MuscleRecovery>;

  const touch = (muscle: MuscleGroup, at: number) => {
    const entry = result[muscle];
    if (entry.lastTrainedAt == null || at > entry.lastTrainedAt) entry.lastTrainedAt = at;
  };
  for (const row of rows) {
    if (isMuscleGroup(row.primary_muscle)) {
      touch(row.primary_muscle, row.last_at);
      result[row.primary_muscle].primarySets += row.set_count;
    }
    for (const muscle of parseJsonArray(row.secondary_muscles).filter(isMuscleGroup)) {
      touch(muscle, row.last_at);
    }
  }
  return result;
}
