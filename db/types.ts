import type { Equipment, MuscleGroup } from './exerciseTags';
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
  primary_muscle: MuscleGroup;
  /** JSON array of muscle groups. */
  secondary_muscles: string;
  equipment: Equipment | null;
  is_custom: 0 | 1;
  /** 1 if doable at home with nothing or only household items. */
  no_equipment: 0 | 1;
  /** 1 if sets are logged in seconds instead of reps. */
  is_timed: 0 | 1;
  level: string | null;
  category: string | null;
  /** JSON array of instruction steps. */
  instructions: string;
};

/** A workout template. */
export type Workout = RecordColumns & {
  id: string;
  name: string;
  /** JSON array of muscle groups the workout targets. */
  muscle_groups: string;
  notes: string | null;
};

export type WorkoutExercise = RecordColumns & {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  /** Set for rep-based exercises. */
  target_reps: number | null;
  /** Set for timed exercises. */
  target_seconds: number | null;
};

/** A workout actually performed. Active while ended_at is null. */
export type Session = RecordColumns & {
  id: string;
  workout_id: string | null;
  /** Copied from the template (or "Workout"), so history survives template edits. */
  name: string;
  started_at: number;
  ended_at: number | null;
};

export type SessionExercise = RecordColumns & {
  id: string;
  session_id: string;
  exercise_id: string;
  position: number;
};

export type WorkoutSet = RecordColumns & {
  id: string;
  session_exercise_id: string;
  exercise_id: string;
  set_number: number;
  /** Null for timed sets. */
  reps: number | null;
  /** Seconds; null for rep-based sets. */
  duration_s: number | null;
  /** Null for bodyweight sets with no added weight. */
  weight: number | null;
  unit: WeightUnit;
  /** Null until the set is checked off. */
  completed_at: number | null;
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
