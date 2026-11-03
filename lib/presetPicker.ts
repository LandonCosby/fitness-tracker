import { router } from 'expo-router';

// Hands the chosen preset key back to the workout form (same pattern as lib/exercisePicker.ts).
let pending: ((presetKey: string) => void) | null = null;

export function openPresetPicker(onPick: (presetKey: string) => void) {
  pending = onPick;
  router.push('/workout-presets');
}

export function deliverPickedPreset(presetKey: string) {
  const callback = pending;
  pending = null;
  callback?.(presetKey);
}
