import { randomUUID } from 'expo-crypto';

// UUIDs rather than auto-increment IDs, so records made on different devices can't collide.
export function newId(): string {
  return randomUUID();
}

// Timestamps are stored as milliseconds since the epoch.
export function now(): number {
  return Date.now();
}

// Reads a JSON array column, treating anything malformed as empty.
export function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Local calendar date as YYYY-MM-DD, used to group food entries by day.
export function toDateKey(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
