import type { SQLiteDatabase } from 'expo-sqlite';

import { now } from './records';
import { DEFAULT_WEIGHT_UNIT, isWeightUnit, type WeightUnit } from './units';

// A missing row means the user hasn't changed that setting, so the default applies.
export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    value,
    now()
  );
}

export async function getWeightUnit(db: SQLiteDatabase): Promise<WeightUnit> {
  const value = await getSetting(db, 'weight_unit');
  return isWeightUnit(value) ? value : DEFAULT_WEIGHT_UNIT;
}

export async function setWeightUnit(db: SQLiteDatabase, unit: WeightUnit) {
  await setSetting(db, 'weight_unit', unit);
}
