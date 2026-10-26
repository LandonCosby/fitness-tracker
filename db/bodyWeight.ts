import type { SQLiteDatabase } from 'expo-sqlite';

import { newId, now } from './records';
import type { BodyWeight } from './types';
import { convertWeight, isWeightUnit, type WeightUnit } from './units';

export type WeighIn = {
  id: string;
  date: string;
  /** In the unit requested by the caller. */
  weight: number;
};

function toWeighIn(row: BodyWeight, unit: WeightUnit): WeighIn {
  const from = isWeightUnit(row.unit) ? row.unit : unit;
  return { id: row.id, date: row.date, weight: convertWeight(row.weight, from, unit) };
}

// Oldest first, optionally from a date (YYYY-MM-DD) on.
export async function listWeighIns(
  db: SQLiteDatabase,
  unit: WeightUnit,
  fromDate?: string
): Promise<WeighIn[]> {
  const rows = await db.getAllAsync<BodyWeight>(
    `SELECT * FROM body_weights
     WHERE deleted_at IS NULL AND date >= ?
     ORDER BY date`,
    fromDate ?? ''
  );
  return rows.map((row) => toWeighIn(row, unit));
}

export async function getWeighIn(
  db: SQLiteDatabase,
  date: string,
  unit: WeightUnit
): Promise<WeighIn | null> {
  const row = await db.getFirstAsync<BodyWeight>(
    'SELECT * FROM body_weights WHERE date = ? AND deleted_at IS NULL',
    date
  );
  return row ? toWeighIn(row, unit) : null;
}

// One weigh-in per day: saving again on the same date replaces it.
export async function saveWeighIn(
  db: SQLiteDatabase,
  date: string,
  weight: number,
  unit: WeightUnit
) {
  const timestamp = now();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM body_weights WHERE date = ? AND deleted_at IS NULL',
    date
  );
  if (existing) {
    await db.runAsync(
      'UPDATE body_weights SET weight = ?, unit = ?, updated_at = ? WHERE id = ?',
      weight,
      unit,
      timestamp,
      existing.id
    );
    return;
  }
  await db.runAsync(
    `INSERT INTO body_weights (id, date, weight, unit, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    newId(),
    date,
    weight,
    unit,
    timestamp,
    timestamp
  );
}

export async function deleteWeighIn(db: SQLiteDatabase, id: string) {
  const timestamp = now();
  await db.runAsync(
    'UPDATE body_weights SET deleted_at = ?, updated_at = ? WHERE id = ?',
    timestamp,
    timestamp,
    id
  );
}
