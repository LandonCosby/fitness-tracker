import type { SQLiteDatabase } from 'expo-sqlite';

import { isEquipment, isMuscleGroup, type Equipment, type MuscleGroup } from './exerciseTags';
import { newId, now } from './records';
import type { Exercise } from './types';

export type ExerciseListItem = Pick<
  Exercise,
  'id' | 'name' | 'primary_muscle' | 'equipment' | 'is_custom'
>;

export type ExerciseDetail = {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment | null;
  isCustom: boolean;
  level: string | null;
  instructions: string[];
};

export type ExerciseInput = {
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment | null;
};

function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toDetail(row: Exercise): ExerciseDetail {
  return {
    id: row.id,
    name: row.name,
    primaryMuscle: row.primary_muscle,
    secondaryMuscles: parseJsonArray(row.secondary_muscles).filter(isMuscleGroup),
    equipment: isEquipment(row.equipment) ? row.equipment : null,
    isCustom: row.is_custom === 1,
    level: row.level,
    instructions: parseJsonArray(row.instructions).filter(
      (step): step is string => typeof step === 'string'
    ),
  };
}

// Escapes LIKE wildcards so a search for "%" or "_" matches literally.
function likePattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export async function listExercises(
  db: SQLiteDatabase,
  filters: { search?: string; muscle?: MuscleGroup | null } = {}
): Promise<ExerciseListItem[]> {
  const conditions = ['deleted_at IS NULL'];
  const params: string[] = [];

  const search = filters.search?.trim();
  if (search) {
    conditions.push("name LIKE ? ESCAPE '\\'");
    params.push(likePattern(search));
  }
  if (filters.muscle) {
    conditions.push('primary_muscle = ?');
    params.push(filters.muscle);
  }

  return db.getAllAsync<ExerciseListItem>(
    `SELECT id, name, primary_muscle, equipment, is_custom
     FROM exercises
     WHERE ${conditions.join(' AND ')}
     ORDER BY name COLLATE NOCASE`,
    params
  );
}

export async function getExercise(db: SQLiteDatabase, id: string): Promise<ExerciseDetail | null> {
  const row = await db.getFirstAsync<Exercise>(
    'SELECT * FROM exercises WHERE id = ? AND deleted_at IS NULL',
    id
  );
  return row ? toDetail(row) : null;
}

// Case-insensitive, ignoring the exercise being edited.
export async function exerciseNameExists(
  db: SQLiteDatabase,
  name: string,
  excludeId?: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM exercises
     WHERE deleted_at IS NULL AND name = ? COLLATE NOCASE AND id != ?`,
    name.trim(),
    excludeId ?? ''
  );
  return row != null;
}

export async function createExercise(db: SQLiteDatabase, input: ExerciseInput): Promise<string> {
  const id = newId();
  const timestamp = now();
  await db.runAsync(
    `INSERT INTO exercises
       (id, name, primary_muscle, secondary_muscles, equipment, is_custom, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    id,
    input.name.trim(),
    input.primaryMuscle,
    JSON.stringify(input.secondaryMuscles),
    input.equipment,
    timestamp,
    timestamp
  );
  return id;
}

// Built-in exercises are read-only, so these only affect custom ones.

export async function updateExercise(db: SQLiteDatabase, id: string, input: ExerciseInput) {
  await db.runAsync(
    `UPDATE exercises
     SET name = ?, primary_muscle = ?, secondary_muscles = ?, equipment = ?, updated_at = ?
     WHERE id = ? AND is_custom = 1`,
    input.name.trim(),
    input.primaryMuscle,
    JSON.stringify(input.secondaryMuscles),
    input.equipment,
    now(),
    id
  );
}

export async function deleteExercise(db: SQLiteDatabase, id: string) {
  const timestamp = now();
  await db.runAsync(
    'UPDATE exercises SET deleted_at = ?, updated_at = ? WHERE id = ? AND is_custom = 1',
    timestamp,
    timestamp,
    id
  );
}
