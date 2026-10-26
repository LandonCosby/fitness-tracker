import type { SetValues } from '@/db/sessions';
import { convertWeight, formatWeight, type WeightUnit } from '@/db/units';

// "45 s", "1:30" or "1:02:03".
export function formatSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
}

// Elapsed time as a clock: "4:05", "1:02:03".
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const ss = String(totalSeconds % 60).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
}

// Workout length in words: "45 min", "1 h 10 min".
export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

// "Today", "Yesterday", "Mon, Oct 20" (with the year if it isn't this year).
export function formatDay(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(today) - startOfDay(date)) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  });
}

// "Oct 20", or "Oct 20, 2025" outside this year. For chart axes and readouts.
export function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }),
  });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// Up to one decimal, without a trailing ".0": 12, 12.5.
export function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

// "1,240" — calories are always shown as whole numbers.
export function formatCalories(value: number): string {
  return Math.round(value).toLocaleString();
}

// "1.5 × 1 cup", "2 servings", "1 serving".
export function formatServings(servings: number, servingLabel: string | null): string {
  if (servingLabel) return `${formatNumber(servings)} × ${servingLabel}`;
  return `${formatNumber(servings)} ${servings === 1 ? 'serving' : 'servings'}`;
}

// One set in the display unit: "135 lb × 8", "8 reps", "45 s", "20 lb · 45 s".
export function formatSet(set: SetValues, unit: WeightUnit): string {
  const weight =
    set.weight != null ? formatWeight(convertWeight(set.weight, set.unit, unit), unit) : null;
  const effort =
    set.durationS != null ? formatSeconds(set.durationS) : set.reps != null ? set.reps : null;

  if (set.durationS != null) return [weight, effort].filter(Boolean).join(' · ') || '—';
  if (weight && effort != null) return `${weight} × ${effort}`;
  if (effort != null) return `${effort} ${effort === 1 ? 'rep' : 'reps'}`;
  return weight ?? '—';
}
