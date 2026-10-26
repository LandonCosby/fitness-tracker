import type { SQLiteDatabase } from 'expo-sqlite';

import { isMuscleGroup, type MuscleGroup } from './exerciseTags';
import { newId, now, parseJsonArray } from './records';

export const DEFAULT_TARGET_SETS = 3;
export const DEFAULT_TARGET_REPS = 10;
export const DEFAULT_TARGET_SECONDS = 30;

export type WorkoutListItem = {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  exerciseCount: number;
  /** Start time of the most recent finished session from this template. */
  lastPerformedAt: number | null;
};

export type WorkoutTemplateExercise = {
  exerciseId: string;
  name: string;
  isTimed: boolean;
  targetSets: number;
  targetReps: number | null;
  targetSeconds: number | null;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  exercises: WorkoutTemplateExercise[];
};

export type WorkoutTemplateInput = Omit<WorkoutTemplate, 'id' | 'exercises'> & {
  exercises: Pick<
    WorkoutTemplateExercise,
    'exerciseId' | 'targetSets' | 'targetReps' | 'targetSeconds'
  >[];
};

function parseMuscleGroups(value: string): MuscleGroup[] {
  return parseJsonArray(value).filter(isMuscleGroup);
}

export async function listWorkouts(db: SQLiteDatabase): Promise<WorkoutListItem[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    muscle_groups: string;
    exercise_count: number;
    last_performed_at: number | null;
  }>(
    `SELECT w.id, w.name, w.muscle_groups,
       (SELECT COUNT(*) FROM workout_exercises we
          JOIN exercises e ON e.id = we.exercise_id
          WHERE we.workout_id = w.id AND we.deleted_at IS NULL AND e.deleted_at IS NULL
       ) AS exercise_count,
       (SELECT MAX(s.started_at) FROM sessions s
          WHERE s.workout_id = w.id AND s.deleted_at IS NULL AND s.ended_at IS NOT NULL
       ) AS last_performed_at
     FROM workouts w
     WHERE w.deleted_at IS NULL
     ORDER BY w.name COLLATE NOCASE`
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    muscleGroups: parseMuscleGroups(row.muscle_groups),
    exerciseCount: row.exercise_count,
    lastPerformedAt: row.last_performed_at,
  }));
}

export async function getWorkout(db: SQLiteDatabase, id: string): Promise<WorkoutTemplate | null> {
  const workout = await db.getFirstAsync<{ id: string; name: string; muscle_groups: string }>(
    'SELECT id, name, muscle_groups FROM workouts WHERE id = ? AND deleted_at IS NULL',
    id
  );
  if (!workout) return null;

  // Exercises deleted from the library drop out of the template.
  const exercises = await db.getAllAsync<{
    exercise_id: string;
    name: string;
    is_timed: 0 | 1;
    target_sets: number;
    target_reps: number | null;
    target_seconds: number | null;
  }>(
    `SELECT we.exercise_id, e.name, e.is_timed, we.target_sets, we.target_reps, we.target_seconds
     FROM workout_exercises we
     JOIN exercises e ON e.id = we.exercise_id
     WHERE we.workout_id = ? AND we.deleted_at IS NULL AND e.deleted_at IS NULL
     ORDER BY we.position`,
    id
  );

  return {
    id: workout.id,
    name: workout.name,
    muscleGroups: parseMuscleGroups(workout.muscle_groups),
    exercises: exercises.map((row) => ({
      exerciseId: row.exercise_id,
      name: row.name,
      isTimed: row.is_timed === 1,
      targetSets: row.target_sets,
      targetReps: row.target_reps,
      targetSeconds: row.target_seconds,
    })),
  };
}

// Creates a template, or replaces an existing one's details and exercise list.
export async function saveWorkout(
  db: SQLiteDatabase,
  input: WorkoutTemplateInput,
  id?: string
): Promise<string> {
  const workoutId = id ?? newId();
  const timestamp = now();

  await db.withTransactionAsync(async () => {
    if (id) {
      await db.runAsync(
        'UPDATE workouts SET name = ?, muscle_groups = ?, updated_at = ? WHERE id = ?',
        input.name.trim(),
        JSON.stringify(input.muscleGroups),
        timestamp,
        id
      );
      // Soft-delete the old list; the new one is inserted below.
      await db.runAsync(
        `UPDATE workout_exercises SET deleted_at = ?, updated_at = ?
         WHERE workout_id = ? AND deleted_at IS NULL`,
        timestamp,
        timestamp,
        id
      );
    } else {
      await db.runAsync(
        `INSERT INTO workouts (id, name, muscle_groups, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        workoutId,
        input.name.trim(),
        JSON.stringify(input.muscleGroups),
        timestamp,
        timestamp
      );
    }

    for (const [position, exercise] of input.exercises.entries()) {
      await db.runAsync(
        `INSERT INTO workout_exercises
           (id, workout_id, exercise_id, position, target_sets, target_reps, target_seconds,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        workoutId,
        exercise.exerciseId,
        position,
        exercise.targetSets,
        exercise.targetReps,
        exercise.targetSeconds,
        timestamp,
        timestamp
      );
    }
  });

  return workoutId;
}

// Past sessions keep their copied name, so history is unaffected.
export async function deleteWorkout(db: SQLiteDatabase, id: string) {
  const timestamp = now();
  await db.runAsync(
    'UPDATE workouts SET deleted_at = ?, updated_at = ? WHERE id = ?',
    timestamp,
    timestamp,
    id
  );
}
