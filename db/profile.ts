import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting } from './settings';

// The lifter's profile, used for strength ranks (db/strength.ts) and the weekly goal streak.
// Body weight isn't stored here: ranks use the latest weigh-in.

export type Sex = 'male' | 'female';

export type Profile = {
  sex: Sex | null;
  heightCm: number | null;
  /** Workouts per week the user aims for (Home streak). */
  weeklyWorkoutGoal: number;
};

export const DEFAULT_WEEKLY_WORKOUT_GOAL = 3;
export const MAX_WEEKLY_WORKOUT_GOAL = 7;

const KEYS = {
  sex: 'profile_sex',
  heightCm: 'profile_height_cm',
  weeklyWorkoutGoal: 'weekly_workout_goal',
} as const;

export async function getProfile(db: SQLiteDatabase): Promise<Profile> {
  const [sex, height, goal] = await Promise.all([
    getSetting(db, KEYS.sex),
    getSetting(db, KEYS.heightCm),
    getSetting(db, KEYS.weeklyWorkoutGoal),
  ]);
  const heightCm = Number(height);
  const weeklyGoal = Number(goal);
  return {
    sex: sex === 'male' || sex === 'female' ? sex : null,
    heightCm: Number.isFinite(heightCm) && heightCm > 0 ? heightCm : null,
    weeklyWorkoutGoal:
      Number.isInteger(weeklyGoal) && weeklyGoal >= 1 && weeklyGoal <= MAX_WEEKLY_WORKOUT_GOAL
        ? weeklyGoal
        : DEFAULT_WEEKLY_WORKOUT_GOAL,
  };
}

export async function setSex(db: SQLiteDatabase, sex: Sex) {
  await setSetting(db, KEYS.sex, sex);
}

export async function setHeightCm(db: SQLiteDatabase, heightCm: number | null) {
  await setSetting(db, KEYS.heightCm, heightCm != null && heightCm > 0 ? String(heightCm) : '');
}

export async function setWeeklyWorkoutGoal(db: SQLiteDatabase, goal: number) {
  await setSetting(db, KEYS.weeklyWorkoutGoal, String(goal));
}

const CM_PER_INCH = 2.54;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_INCH * 10) / 10;
}

export function formatHeight(cm: number, imperial: boolean): string {
  if (!imperial) return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}′${inches}″`;
}
