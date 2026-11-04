import { router } from 'expo-router';

// Hands a picked ingredient back to the recipe form (same pattern as lib/exercisePicker.ts).
let pending: ((foodId: string) => void) | null = null;

export function openIngredientPicker(onPick: (foodId: string) => void) {
  pending = onPick;
  router.push('/ingredient-picker');
}

export function deliverPickedFood(foodId: string) {
  const callback = pending;
  pending = null;
  callback?.(foodId);
}
