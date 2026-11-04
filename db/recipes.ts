import type { SQLiteDatabase } from 'expo-sqlite';

import { getFood, sumNutrients, type Nutrients, type SavedFood } from './nutrition';
import { newId, now } from './records';

// Custom meals built from ingredients. The recipe is saved as an ordinary custom food
// (category 'custom', is_recipe = 1) holding per-serving numbers, so it logs like any
// other food; its ingredients are kept in recipe_items so it can be edited later.
// Editing a recipe doesn't change days it was already logged on (entries copy numbers).

export type RecipeIngredient = { food: SavedFood; servings: number };

export type Recipe = {
  id: string;
  name: string;
  /** How many servings the whole recipe makes. */
  servingsMade: number;
  ingredients: RecipeIngredient[];
};

export type RecipeTotals = Nutrients & {
  /** Total weight, when every ingredient's serving weight is known. */
  grams: number | null;
};

export function recipeTotals(ingredients: RecipeIngredient[]): RecipeTotals {
  const nutrients = sumNutrients(
    ingredients.map(({ food, servings }) => ({
      calories: food.calories * servings,
      proteinG: food.proteinG * servings,
      carbsG: food.carbsG * servings,
      fatG: food.fatG * servings,
    }))
  );
  const weights = ingredients.map(({ food, servings }) =>
    food.servingGrams != null ? food.servingGrams * servings : null
  );
  const grams =
    weights.length > 0 && weights.every((w) => w != null)
      ? weights.reduce<number>((sum, w) => sum + (w ?? 0), 0)
      : null;
  return { ...nutrients, grams };
}

export function servingLabelFor(servingsMade: number): string {
  return servingsMade === 1 ? 'Whole recipe' : `1 of ${servingsMade} servings`;
}

export async function getRecipe(db: SQLiteDatabase, id: string): Promise<Recipe | null> {
  const row = await db.getFirstAsync<{ id: string; name: string; recipe_servings: number | null }>(
    'SELECT id, name, recipe_servings FROM foods WHERE id = ? AND is_recipe = 1 AND deleted_at IS NULL',
    id
  );
  if (!row) return null;
  const items = await db.getAllAsync<{ food_id: string; servings: number }>(
    `SELECT food_id, servings FROM recipe_items
     WHERE recipe_id = ? AND deleted_at IS NULL
     ORDER BY position`,
    id
  );
  const foods = await Promise.all(items.map((item) => getFood(db, item.food_id)));
  return {
    id: row.id,
    name: row.name,
    servingsMade: row.recipe_servings ?? 1,
    // Ingredients removed from the food list since are left out.
    ingredients: items.flatMap((item, index) => {
      const food = foods[index];
      return food ? [{ food, servings: item.servings }] : [];
    }),
  };
}

// Creates a recipe, or replaces an existing one's details and ingredients. Returns its ID.
export async function saveRecipe(
  db: SQLiteDatabase,
  input: { name: string; servingsMade: number; ingredients: RecipeIngredient[] },
  id?: string
): Promise<string> {
  const recipeId = id ?? newId();
  const timestamp = now();
  const totals = recipeTotals(input.ingredients);
  const per = (value: number) => Math.round((value / input.servingsMade) * 10) / 10;
  const values = [
    input.name.trim(),
    servingLabelFor(input.servingsMade),
    totals.grams != null ? Math.round(totals.grams / input.servingsMade) : null,
    Math.round(totals.calories / input.servingsMade),
    per(totals.proteinG),
    per(totals.carbsG),
    per(totals.fatG),
    input.servingsMade,
  ];

  await db.withTransactionAsync(async () => {
    if (id) {
      await db.runAsync(
        `UPDATE foods SET name = ?, serving_label = ?, serving_grams = ?, calories = ?,
           protein_g = ?, carbs_g = ?, fat_g = ?, recipe_servings = ?, updated_at = ?
         WHERE id = ?`,
        [...values, timestamp, id]
      );
      await db.runAsync(
        `UPDATE recipe_items SET deleted_at = ?, updated_at = ?
         WHERE recipe_id = ? AND deleted_at IS NULL`,
        timestamp,
        timestamp,
        id
      );
    } else {
      await db.runAsync(
        `INSERT INTO foods
           (id, name, serving_label, serving_grams, calories, protein_g, carbs_g, fat_g,
            recipe_servings, category, is_recipe, last_used_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom', 1, ?, ?, ?)`,
        [recipeId, ...values, timestamp, timestamp, timestamp]
      );
    }
    for (const [position, item] of input.ingredients.entries()) {
      await db.runAsync(
        `INSERT INTO recipe_items
           (id, recipe_id, food_id, position, servings, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        recipeId,
        item.food.id,
        position,
        item.servings,
        timestamp,
        timestamp
      );
    }
  });

  return recipeId;
}
