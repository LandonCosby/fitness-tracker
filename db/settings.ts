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

/** Daily nutrition goals. null means no goal for that number. */
export type NutritionTargets = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

const TARGET_KEYS: Record<keyof NutritionTargets, string> = {
  calories: 'target_calories',
  proteinG: 'target_protein_g',
  carbsG: 'target_carbs_g',
  fatG: 'target_fat_g',
};

export async function getNutritionTargets(db: SQLiteDatabase): Promise<NutritionTargets> {
  const entries = await Promise.all(
    (Object.keys(TARGET_KEYS) as (keyof NutritionTargets)[]).map(async (name) => {
      const value = Number(await getSetting(db, TARGET_KEYS[name]));
      return [name, Number.isFinite(value) && value > 0 ? value : null] as const;
    })
  );
  return Object.fromEntries(entries) as NutritionTargets;
}

// An empty value clears that goal.
export async function setNutritionTarget(
  db: SQLiteDatabase,
  name: keyof NutritionTargets,
  value: number | null
) {
  await setSetting(db, TARGET_KEYS[name], value != null && value > 0 ? String(value) : '');
}
