import { router } from 'expo-router';

import type { MuscleGroup } from '@/db/exerciseTags';

// Hands the picker's selection back to the screen that opened it. Screens share one
// JS runtime, so a pending callback is simpler than routing the IDs through params.
let pending: ((exerciseIds: string[]) => void) | null = null;

export function openExercisePicker(
  onPick: (exerciseIds: string[]) => void,
  options: { muscles?: MuscleGroup[] } = {}
) {
  pending = onPick;
  router.push({
    pathname: '/exercise-picker',
    params: options.muscles?.length ? { muscles: options.muscles.join(',') } : {},
  });
}

export function deliverPickedExercises(exerciseIds: string[]) {
  const callback = pending;
  pending = null;
  callback?.(exerciseIds);
}
