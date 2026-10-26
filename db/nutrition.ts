import type { SQLiteDatabase } from 'expo-sqlite';

import { newId, now } from './records';
import type { Food, FoodEntry, Meal } from './types';

export const MEALS: readonly Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export type Nutrients = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** Per-serving numbers for a food. */
export type FoodValues = Nutrients & {
  name: string;
  servingLabel: string | null;
};

export type SavedFood = FoodValues & { id: string };

export type LoggedFood = FoodValues & {
  id: string;
  date: string;
  meal: Meal;
  foodId: string | null;
  servings: number;
};

export const ZERO_NUTRIENTS: Nutrients = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

// Standard energy per gram: 4 kcal for protein and carbs, 9 for fat.
export function caloriesFromMacros(proteinG: number, carbsG: number, fatG: number): number {
  return Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);
}

// What an entry contributes to the day: per-serving numbers × servings.
export function entryTotals(entry: Nutrients & { servings: number }): Nutrients {
  return {
    calories: entry.calories * entry.servings,
    proteinG: entry.proteinG * entry.servings,
    carbsG: entry.carbsG * entry.servings,
    fatG: entry.fatG * entry.servings,
  };
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  return items.reduce(
    (sum, item) => ({
      calories: sum.calories + item.calories,
      proteinG: sum.proteinG + item.proteinG,
      carbsG: sum.carbsG + item.carbsG,
      fatG: sum.fatG + item.fatG,
    }),
    ZERO_NUTRIENTS
  );
}

// Breakfast until 10:30, lunch until 3 pm, dinner until 9 pm, otherwise a snack.
export function mealForTime(date: Date = new Date()): Meal {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < 10 * 60 + 30) return 'breakfast';
  if (minutes < 15 * 60) return 'lunch';
  if (minutes < 21 * 60) return 'dinner';
  return 'snack';
}

function toSavedFood(row: Food): SavedFood {
  return {
    id: row.id,
    name: row.name,
    servingLabel: row.serving_label,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
  };
}

function toLoggedFood(row: FoodEntry): LoggedFood {
  return {
    id: row.id,
    date: row.date,
    meal: row.meal,
    foodId: row.food_id,
    name: row.name,
    servingLabel: row.serving_label,
    servings: row.servings,
    calories: row.calories,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
  };
}

function cleanLabel(label: string | null): string | null {
  const trimmed = label?.trim();
  return trimmed ? trimmed : null;
}

// --- My foods ---

// Recently used first. Escapes LIKE wildcards so "%" matches literally.
export async function searchFoods(db: SQLiteDatabase, search = '', limit = 50): Promise<SavedFood[]> {
  const pattern = `%${search.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const rows = await db.getAllAsync<Food>(
    `SELECT * FROM foods
     WHERE deleted_at IS NULL AND name LIKE ? ESCAPE '\\'
     ORDER BY last_used_at IS NULL, last_used_at DESC, name COLLATE NOCASE
     LIMIT ?`,
    pattern,
    limit
  );
  return rows.map(toSavedFood);
}

export async function getFood(db: SQLiteDatabase, id: string): Promise<SavedFood | null> {
  const row = await db.getFirstAsync<Food>(
    'SELECT * FROM foods WHERE id = ? AND deleted_at IS NULL',
    id
  );
  return row ? toSavedFood(row) : null;
}

// Saves a food to My foods. A food with the same name and serving (ignoring case) is
// updated instead of duplicated.
export async function saveFood(db: SQLiteDatabase, values: FoodValues): Promise<string> {
  const name = values.name.trim();
  const servingLabel = cleanLabel(values.servingLabel);
  const timestamp = now();

  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM foods
     WHERE deleted_at IS NULL AND name = ? COLLATE NOCASE
       AND COALESCE(serving_label, '') = COALESCE(?, '') COLLATE NOCASE`,
    name,
    servingLabel
  );

  if (existing) {
    await db.runAsync(
      `UPDATE foods SET name = ?, serving_label = ?, calories = ?, protein_g = ?, carbs_g = ?,
         fat_g = ?, last_used_at = ?, updated_at = ?
       WHERE id = ?`,
      name,
      servingLabel,
      values.calories,
      values.proteinG,
      values.carbsG,
      values.fatG,
      timestamp,
      timestamp,
      existing.id
    );
    return existing.id;
  }

  const id = newId();
  await db.runAsync(
    `INSERT INTO foods
       (id, name, serving_label, calories, protein_g, carbs_g, fat_g, last_used_at,
        created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    name,
    servingLabel,
    values.calories,
    values.proteinG,
    values.carbsG,
    values.fatG,
    timestamp,
    timestamp,
    timestamp
  );
  return id;
}

// Removes a food from My foods. Days it was logged on are unaffected.
export async function deleteFood(db: SQLiteDatabase, id: string) {
  const timestamp = now();
  await db.runAsync(
    'UPDATE foods SET deleted_at = ?, updated_at = ? WHERE id = ?',
    timestamp,
    timestamp,
    id
  );
}

// --- Log ---

export async function listEntriesForDate(db: SQLiteDatabase, date: string): Promise<LoggedFood[]> {
  const rows = await db.getAllAsync<FoodEntry>(
    // rowid breaks ties between entries logged in the same millisecond.
    `SELECT * FROM food_entries WHERE date = ? AND deleted_at IS NULL ORDER BY created_at, rowid`,
    date
  );
  return rows.map(toLoggedFood);
}

export async function getEntry(db: SQLiteDatabase, id: string): Promise<LoggedFood | null> {
  const row = await db.getFirstAsync<FoodEntry>(
    'SELECT * FROM food_entries WHERE id = ? AND deleted_at IS NULL',
    id
  );
  return row ? toLoggedFood(row) : null;
}

export type EntryInput = FoodValues & {
  date: string;
  meal: Meal;
  servings: number;
  foodId: string | null;
};

export async function createEntry(db: SQLiteDatabase, input: EntryInput): Promise<string> {
  const id = newId();
  const timestamp = now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO food_entries
         (id, date, meal, food_id, name, serving_label, servings, calories, protein_g, carbs_g,
          fat_g, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      input.date,
      input.meal,
      input.foodId,
      input.name.trim(),
      cleanLabel(input.servingLabel),
      input.servings,
      input.calories,
      input.proteinG,
      input.carbsG,
      input.fatG,
      timestamp,
      timestamp
    );
    if (input.foodId) {
      await db.runAsync(
        'UPDATE foods SET last_used_at = ?, updated_at = ? WHERE id = ?',
        timestamp,
        timestamp,
        input.foodId
      );
    }
  });
  return id;
}

// Logs a saved food with its current numbers.
export async function logFood(
  db: SQLiteDatabase,
  food: SavedFood,
  entry: { date: string; meal: Meal; servings: number }
): Promise<string> {
  return createEntry(db, { ...food, ...entry, foodId: food.id });
}

export async function updateEntry(
  db: SQLiteDatabase,
  id: string,
  input: Omit<EntryInput, 'date' | 'foodId'>
) {
  await db.runAsync(
    `UPDATE food_entries
     SET meal = ?, name = ?, serving_label = ?, servings = ?, calories = ?, protein_g = ?,
         carbs_g = ?, fat_g = ?, updated_at = ?
     WHERE id = ?`,
    input.meal,
    input.name.trim(),
    cleanLabel(input.servingLabel),
    input.servings,
    input.calories,
    input.proteinG,
    input.carbsG,
    input.fatG,
    now(),
    id
  );
}

export async function deleteEntry(db: SQLiteDatabase, id: string) {
  const timestamp = now();
  await db.runAsync(
    'UPDATE food_entries SET deleted_at = ?, updated_at = ? WHERE id = ?',
    timestamp,
    timestamp,
    id
  );
}
