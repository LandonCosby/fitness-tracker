import type { SQLiteDatabase } from 'expo-sqlite';

import { newId, now } from './records';
import { convertWeight, isWeightUnit, type WeightUnit } from './units';
import { getWorkout } from './workouts';

export type SetValues = {
  reps: number | null;
  durationS: number | null;
  weight: number | null;
  unit: WeightUnit;
};

export type LoggedSet = SetValues & {
  id: string;
  setNumber: number;
  completed: boolean;
};

export type SessionExerciseDetail = {
  id: string;
  exerciseId: string;
  name: string;
  isTimed: boolean;
  sets: LoggedSet[];
  /** Completed sets from the last finished session with this exercise, in order. */
  previous: SetValues[];
};

export type SessionDetail = {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number | null;
  exercises: SessionExerciseDetail[];
};

export type SessionSummary = {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number;
  setCount: number;
  exerciseNames: string[];
};

export type ExerciseHistoryEntry = {
  sessionId: string;
  startedAt: number;
  sets: SetValues[];
};

type SetRow = {
  id: string;
  set_number: number;
  reps: number | null;
  duration_s: number | null;
  weight: number | null;
  unit: string;
  completed_at: number | null;
};

function toSetValues(row: Pick<SetRow, 'reps' | 'duration_s' | 'weight' | 'unit'>): SetValues {
  return {
    reps: row.reps,
    durationS: row.duration_s,
    weight: row.weight,
    unit: isWeightUnit(row.unit) ? row.unit : 'lb',
  };
}

// Converts a remembered set into the current unit for pre-filling, rounded to 0.1.
function prefill(values: SetValues, unit: WeightUnit): SetValues {
  const weight =
    values.weight == null
      ? null
      : Math.round(convertWeight(values.weight, values.unit, unit) * 10) / 10;
  return { ...values, weight, unit };
}

// Joins that skip anything soft-deleted along the set -> session chain.
const LIVE_SET_JOINS = `
  JOIN session_exercises se ON se.id = st.session_exercise_id AND se.deleted_at IS NULL
  JOIN sessions s ON s.id = se.session_id AND s.deleted_at IS NULL`;

export async function getActiveSession(
  db: SQLiteDatabase
): Promise<{ id: string; name: string; startedAt: number } | null> {
  const row = await db.getFirstAsync<{ id: string; name: string; started_at: number }>(
    `SELECT id, name, started_at FROM sessions
     WHERE ended_at IS NULL AND deleted_at IS NULL
     ORDER BY started_at DESC LIMIT 1`
  );
  return row ? { id: row.id, name: row.name, startedAt: row.started_at } : null;
}

// Completed sets from the most recent finished session that included this exercise.
export async function getPreviousSets(
  db: SQLiteDatabase,
  exerciseId: string,
  excludeSessionId = ''
): Promise<SetValues[]> {
  const last = await db.getFirstAsync<{ id: string }>(
    `SELECT se.id FROM session_exercises se
     JOIN sessions s ON s.id = se.session_id
     WHERE se.exercise_id = ? AND se.deleted_at IS NULL
       AND s.deleted_at IS NULL AND s.ended_at IS NOT NULL AND s.id != ?
       AND EXISTS (
         SELECT 1 FROM sets st
         WHERE st.session_exercise_id = se.id AND st.completed_at IS NOT NULL
           AND st.deleted_at IS NULL
       )
     ORDER BY s.started_at DESC LIMIT 1`,
    exerciseId,
    excludeSessionId
  );
  if (!last) return [];

  const rows = await db.getAllAsync<SetRow>(
    `SELECT * FROM sets
     WHERE session_exercise_id = ? AND completed_at IS NOT NULL AND deleted_at IS NULL
     ORDER BY set_number`,
    last.id
  );
  return rows.map(toSetValues);
}

async function insertSet(
  db: SQLiteDatabase,
  sessionExerciseId: string,
  exerciseId: string,
  setNumber: number,
  values: SetValues
) {
  const timestamp = now();
  await db.runAsync(
    `INSERT INTO sets
       (id, session_exercise_id, exercise_id, set_number, reps, duration_s, weight, unit,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    sessionExerciseId,
    exerciseId,
    setNumber,
    values.reps,
    values.durationS,
    values.weight,
    values.unit,
    timestamp,
    timestamp
  );
}

async function insertSessionExercise(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string,
  position: number
): Promise<string> {
  const id = newId();
  const timestamp = now();
  await db.runAsync(
    `INSERT INTO session_exercises (id, session_id, exercise_id, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    sessionId,
    exerciseId,
    position,
    timestamp,
    timestamp
  );
  return id;
}

// Starts a session, empty or from a template. Template exercises get their target number
// of sets, pre-filled with last time's numbers (or the template's targets if none).
export async function startSession(
  db: SQLiteDatabase,
  workoutId: string | null,
  unit: WeightUnit
): Promise<string> {
  const template = workoutId ? await getWorkout(db, workoutId) : null;
  const sessionId = newId();
  const timestamp = now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO sessions (id, workout_id, name, started_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      sessionId,
      template?.id ?? null,
      template?.name ?? 'Workout',
      timestamp,
      timestamp,
      timestamp
    );

    for (const [position, exercise] of (template?.exercises ?? []).entries()) {
      const sessionExerciseId = await insertSessionExercise(
        db,
        sessionId,
        exercise.exerciseId,
        position
      );
      const previous = await getPreviousSets(db, exercise.exerciseId);
      const target: SetValues = {
        reps: exercise.isTimed ? null : exercise.targetReps,
        durationS: exercise.isTimed ? exercise.targetSeconds : null,
        weight: null,
        unit,
      };
      for (let i = 0; i < exercise.targetSets; i++) {
        const remembered = previous[i] ?? previous.at(-1);
        await insertSet(
          db,
          sessionExerciseId,
          exercise.exerciseId,
          i + 1,
          remembered ? prefill(remembered, unit) : target
        );
      }
    }
  });

  return sessionId;
}

// Adds exercises to the end of a session, each with as many sets as last time (at least one).
export async function addExercisesToSession(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseIds: string[],
  unit: WeightUnit
) {
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ next: number }>(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next FROM session_exercises
       WHERE session_id = ? AND deleted_at IS NULL`,
      sessionId
    );
    let position = row?.next ?? 0;

    for (const exerciseId of exerciseIds) {
      const sessionExerciseId = await insertSessionExercise(db, sessionId, exerciseId, position++);
      const previous = await getPreviousSets(db, exerciseId, sessionId);
      const sets = previous.length
        ? previous.map((p) => prefill(p, unit))
        : [{ reps: null, durationS: null, weight: null, unit }];
      for (const [i, values] of sets.entries()) {
        await insertSet(db, sessionExerciseId, exerciseId, i + 1, values);
      }
    }
  });
}

// Adds a set copying the exercise's last set, so the next set is usually one tap.
export async function addSet(db: SQLiteDatabase, sessionExerciseId: string, unit: WeightUnit) {
  const exercise = await db.getFirstAsync<{ exercise_id: string }>(
    'SELECT exercise_id FROM session_exercises WHERE id = ?',
    sessionExerciseId
  );
  if (!exercise) return;

  const last = await db.getFirstAsync<SetRow>(
    `SELECT * FROM sets WHERE session_exercise_id = ? AND deleted_at IS NULL
     ORDER BY set_number DESC LIMIT 1`,
    sessionExerciseId
  );
  const values = last
    ? prefill(toSetValues(last), unit)
    : { reps: null, durationS: null, weight: null, unit };
  await insertSet(
    db,
    sessionExerciseId,
    exercise.exercise_id,
    (last?.set_number ?? 0) + 1,
    values
  );
}

export async function updateSet(db: SQLiteDatabase, setId: string, values: SetValues) {
  await db.runAsync(
    `UPDATE sets SET reps = ?, duration_s = ?, weight = ?, unit = ?, updated_at = ? WHERE id = ?`,
    values.reps,
    values.durationS,
    values.weight,
    values.unit,
    now(),
    setId
  );
}

export async function setSetCompleted(db: SQLiteDatabase, setId: string, completed: boolean) {
  const timestamp = now();
  await db.runAsync(
    'UPDATE sets SET completed_at = ?, updated_at = ? WHERE id = ?',
    completed ? timestamp : null,
    timestamp,
    setId
  );
}

export async function deleteSet(db: SQLiteDatabase, setId: string) {
  const timestamp = now();
  await db.runAsync(
    'UPDATE sets SET deleted_at = ?, updated_at = ? WHERE id = ?',
    timestamp,
    timestamp,
    setId
  );
}

export async function removeSessionExercise(db: SQLiteDatabase, sessionExerciseId: string) {
  const timestamp = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE sets SET deleted_at = ?, updated_at = ?
       WHERE session_exercise_id = ? AND deleted_at IS NULL`,
      timestamp,
      timestamp,
      sessionExerciseId
    );
    await db.runAsync(
      'UPDATE session_exercises SET deleted_at = ?, updated_at = ? WHERE id = ?',
      timestamp,
      timestamp,
      sessionExerciseId
    );
  });
}

export async function countUnfinishedSets(db: SQLiteDatabase, sessionId: string) {
  const row = await db.getFirstAsync<{ unfinished: number; finished: number }>(
    `SELECT
       COALESCE(SUM(st.completed_at IS NULL), 0) AS unfinished,
       COALESCE(SUM(st.completed_at IS NOT NULL), 0) AS finished
     FROM sets st ${LIVE_SET_JOINS}
     WHERE s.id = ? AND st.deleted_at IS NULL`,
    sessionId
  );
  return { unfinished: row?.unfinished ?? 0, finished: row?.finished ?? 0 };
}

// Ends the session. Sets that weren't checked off are removed, along with any exercise
// left without sets.
export async function finishSession(db: SQLiteDatabase, sessionId: string) {
  const timestamp = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE sets SET deleted_at = ?, updated_at = ?
       WHERE completed_at IS NULL AND deleted_at IS NULL
         AND session_exercise_id IN (SELECT id FROM session_exercises WHERE session_id = ?)`,
      timestamp,
      timestamp,
      sessionId
    );
    await db.runAsync(
      `UPDATE session_exercises SET deleted_at = ?, updated_at = ?
       WHERE session_id = ? AND deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM sets st WHERE st.session_exercise_id = session_exercises.id
             AND st.deleted_at IS NULL
         )`,
      timestamp,
      timestamp,
      sessionId
    );
    await db.runAsync(
      'UPDATE sessions SET ended_at = ?, updated_at = ? WHERE id = ?',
      timestamp,
      timestamp,
      sessionId
    );
  });
}

// Discards an active session, or deletes a finished one from history.
export async function deleteSession(db: SQLiteDatabase, sessionId: string) {
  const timestamp = now();
  await db.runAsync(
    'UPDATE sessions SET deleted_at = ?, updated_at = ? WHERE id = ?',
    timestamp,
    timestamp,
    sessionId
  );
}

export async function getSession(db: SQLiteDatabase, id: string): Promise<SessionDetail | null> {
  const session = await db.getFirstAsync<{
    id: string;
    name: string;
    started_at: number;
    ended_at: number | null;
  }>(
    'SELECT id, name, started_at, ended_at FROM sessions WHERE id = ? AND deleted_at IS NULL',
    id
  );
  if (!session) return null;

  const exercises = await db.getAllAsync<{
    id: string;
    exercise_id: string;
    name: string;
    is_timed: 0 | 1;
  }>(
    `SELECT se.id, se.exercise_id, e.name, e.is_timed
     FROM session_exercises se
     JOIN exercises e ON e.id = se.exercise_id
     WHERE se.session_id = ? AND se.deleted_at IS NULL
     ORDER BY se.position`,
    id
  );

  const sets = await db.getAllAsync<SetRow & { session_exercise_id: string }>(
    `SELECT st.* FROM sets st
     JOIN session_exercises se ON se.id = st.session_exercise_id
     WHERE se.session_id = ? AND st.deleted_at IS NULL
     ORDER BY st.set_number`,
    id
  );

  // "Last time" only matters while logging.
  const active = session.ended_at == null;

  return {
    id: session.id,
    name: session.name,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    exercises: await Promise.all(
      exercises.map(async (row) => ({
        id: row.id,
        exerciseId: row.exercise_id,
        name: row.name,
        isTimed: row.is_timed === 1,
        sets: sets
          .filter((s) => s.session_exercise_id === row.id)
          .map((s) => ({
            ...toSetValues(s),
            id: s.id,
            setNumber: s.set_number,
            completed: s.completed_at != null,
          })),
        previous: active ? await getPreviousSets(db, row.exercise_id, id) : [],
      }))
    ),
  };
}

export async function listSessionHistory(
  db: SQLiteDatabase,
  limit = 30
): Promise<SessionSummary[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    started_at: number;
    ended_at: number;
    set_count: number;
    exercise_names: string | null;
  }>(
    `SELECT s.id, s.name, s.started_at, s.ended_at,
       (SELECT COUNT(*) FROM sets st
          JOIN session_exercises se ON se.id = st.session_exercise_id AND se.deleted_at IS NULL
          WHERE se.session_id = s.id AND st.deleted_at IS NULL AND st.completed_at IS NOT NULL
       ) AS set_count,
       (SELECT json_group_array(name) FROM (
          SELECT e.name FROM session_exercises se
          JOIN exercises e ON e.id = se.exercise_id
          WHERE se.session_id = s.id AND se.deleted_at IS NULL
          ORDER BY se.position)
       ) AS exercise_names
     FROM sessions s
     WHERE s.deleted_at IS NULL AND s.ended_at IS NOT NULL
     ORDER BY s.started_at DESC
     LIMIT ?`,
    limit
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    setCount: row.set_count,
    exerciseNames: row.exercise_names ? (JSON.parse(row.exercise_names) as string[]) : [],
  }));
}

// Recent finished sessions that included this exercise, newest first.
export async function getExerciseHistory(
  db: SQLiteDatabase,
  exerciseId: string,
  limit = 5
): Promise<ExerciseHistoryEntry[]> {
  const rows = await db.getAllAsync<SetRow & { session_id: string; started_at: number }>(
    `SELECT st.*, s.id AS session_id, s.started_at
     FROM sets st ${LIVE_SET_JOINS}
     WHERE st.exercise_id = ? AND st.deleted_at IS NULL AND st.completed_at IS NOT NULL
       AND s.ended_at IS NOT NULL
       AND s.id IN (
         SELECT s2.id FROM sessions s2
         JOIN session_exercises se2 ON se2.session_id = s2.id AND se2.deleted_at IS NULL
         WHERE se2.exercise_id = ? AND s2.deleted_at IS NULL AND s2.ended_at IS NOT NULL
         GROUP BY s2.id
         ORDER BY s2.started_at DESC
         LIMIT ?
       )
     ORDER BY s.started_at DESC, st.set_number`,
    exerciseId,
    exerciseId,
    limit
  );

  const entries: ExerciseHistoryEntry[] = [];
  for (const row of rows) {
    let entry = entries.at(-1);
    if (entry?.sessionId !== row.session_id) {
      entry = { sessionId: row.session_id, startedAt: row.started_at, sets: [] };
      entries.push(entry);
    }
    entry.sets.push(toSetValues(row));
  }
  return entries;
}
