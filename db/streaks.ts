import type { SQLiteDatabase } from 'expo-sqlite';

import { startOfWeek } from './progress';
import { shiftDateKey, toDateKey } from './records';

// Consecutive days with at least one food logged. Today counts once something is logged;
// until then the streak still stands on yesterday, so it doesn't reset each morning.
export async function getFoodStreak(db: SQLiteDatabase, today: string = toDateKey()) {
  const rows = await db.getAllAsync<{ date: string }>(
    `SELECT DISTINCT date FROM food_entries
     WHERE deleted_at IS NULL AND date <= ?
     ORDER BY date DESC
     LIMIT 400`,
    today
  );
  const dates = new Set(rows.map((r) => r.date));
  const loggedToday = dates.has(today);
  let day = loggedToday ? today : shiftDateKey(today, -1);
  let days = 0;
  while (dates.has(day)) {
    days += 1;
    day = shiftDateKey(day, -1);
  }
  return { days, loggedToday };
}

export type WorkoutGoalStreak = {
  /** Consecutive weeks (Monday to Sunday) that met the goal. Includes this week once met. */
  weeks: number;
  thisWeek: number;
  goal: number;
};

export async function getWorkoutGoalStreak(
  db: SQLiteDatabase,
  goal: number,
  now: number = Date.now()
): Promise<WorkoutGoalStreak> {
  const rows = await db.getAllAsync<{ started_at: number }>(
    `SELECT started_at FROM sessions
     WHERE deleted_at IS NULL AND ended_at IS NOT NULL AND started_at <= ?
     ORDER BY started_at DESC
     LIMIT 2000`,
    now
  );
  const perWeek = new Map<number, number>();
  for (const row of rows) {
    const week = startOfWeek(row.started_at);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }

  const currentWeek = startOfWeek(now);
  const thisWeek = perWeek.get(currentWeek) ?? 0;
  let weeks = thisWeek >= goal ? 1 : 0;
  // Step back a week at a time (−3 days then snap to Monday: safe across DST changes).
  let week = startOfWeek(currentWeek - 3 * 86400000);
  while ((perWeek.get(week) ?? 0) >= goal) {
    weeks += 1;
    week = startOfWeek(week - 3 * 86400000);
  }
  return { weeks, thisWeek, goal };
}
