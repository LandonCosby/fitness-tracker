import type { WeightUnit } from './units';

// Row shapes as stored in SQLite. Booleans are 0/1 and timestamps are epoch milliseconds.

export type RecordColumns = {
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type Exercise = RecordColumns & {
  id: string;
  name: string;
  primary_muscle: string;
  /** JSON array of muscle names. */
  secondary_muscles: string;
  equipment: string | null;
  is_custom: 0 | 1;
};

export type Workout = RecordColumns & {
  id: string;
  name: string;
  body_part: string | null;
  notes: string | null;
};

export type WorkoutExercise = RecordColumns & {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
};

export type Session = RecordColumns & {
  id: string;
  workout_id: string | null;
  started_at: number;
  ended_at: number | null;
};

export type WorkoutSet = RecordColumns & {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
  unit: WeightUnit;
};

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodEntry = RecordColumns & {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  meal: Meal;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};
