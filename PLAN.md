# Fitness Tracker Plan

Expo SDK 58 app using Expo Router. Four tabs: Workouts, Exercises, Nutrition and Progress.

## Decisions

- **Platforms:** iOS and Android only. There are no plans for web, so the expo-sqlite web setup (wasm and COOP/COEP headers) is skipped.
- **Storage:** `expo-sqlite`. Data stays on the phone, following the "Sync later" conventions below.
- **Weight units:** lb and kg are both supported, and lb is the default.

## Status

| # | Step | Status |
|---|------|--------|
| 1 | Lint setup (`eslint.config.js`, `npm run lint`) | Done |
| 2 | Lint and typecheck pass | Done |
| 3 | Commit the four-tab layout | Done |
| 4 | Data layer (`expo-sqlite`) | Done |
| 4b | Settings screen with the lb/kg switch | Next |
| 5 | Exercises tab | Not started |
| 6 | Workouts tab | Not started |
| 7 | Nutrition tab | Not started |
| 8 | Progress tab | Not started |
| 9 | Remove template leftovers | Not started |
| 10 | Development or EAS build, if needed | Not started |

Run `npm run lint` and `npx tsc --noEmit` before marking any step done (see `AGENTS.md`).

## 4. Data layer

- Uses `expo-sqlite` and `expo-crypto` (for UUIDs). Both are included in Expo Go, so no development build is needed. SDK 58 docs: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/
- `app/_layout.tsx` wraps the app in `<SQLiteProvider databaseName="fitness.db">`. Screens get the database with `useSQLiteContext()`.
- Code lives in `db/`, never in `app/`:
  - `migrations.ts`: the schema. Each array entry is one version, tracked in `PRAGMA user_version`. Only append new entries; never edit one that has shipped.
  - `types.ts`: row types.
  - `records.ts`: `newId()`, `now()` and `toDateKey()`.
  - `units.ts`: lb/kg conversion and formatting.
  - `settings.ts`: key-value settings, including `getWeightUnit()` and `setWeightUnit()`.
- Each feature step adds its own query file in `db/`, and hooks in `hooks/` if needed.
- Each set stores the unit it was logged in. Weights are converted to the user's chosen unit only for display, and when comparing for personal records.

### Tables

| Table | Columns |
|-------|---------|
| `exercises` | `id`, `name`, `primary_muscle`, `secondary_muscles` (JSON), `equipment`, `is_custom` |
| `workouts` (templates) | `id`, `name`, `body_part`, `notes` |
| `workout_exercises` | `id`, `workout_id`, `exercise_id`, `position` |
| `sessions` (a workout performed) | `id`, `workout_id` (nullable), `started_at`, `ended_at` |
| `sets` | `id`, `session_id`, `exercise_id`, `set_number`, `reps`, `weight`, `unit` |
| `food_entries` | `id`, `date`, `meal`, `name`, `calories`, `protein_g`, `carbs_g`, `fat_g` |
| `settings` | `key`, `value` (calorie and macro targets, weight unit) |

Every table except `settings` also gets `created_at`, `updated_at` and `deleted_at`. `settings` only has `updated_at`. Personal records are calculated from `sets`, so they don't need their own table.

## 4b. Settings screen

- Turn the template `app/modal.tsx` into a Settings screen, opened from a gear icon in the tab header.
- Add an lb/kg switch that saves with `setWeightUnit()`. A missing setting means lb.
- Nutrition targets (step 7) will be added to this screen later.

### Sync later

These conventions cost little now and avoid a migration if sync is added:

- IDs are UUID strings, not auto-increment integers, so records made on two devices can't collide.
- Every write sets `updated_at`, so a sync can find what changed since the last run.
- Deletes set `deleted_at` instead of removing the row, so a delete can sync to other devices.

## 5. Exercises

- Seed a built-in library of common exercises on first launch.
- Browse and filter by muscle group, and search by name.
- Let the user add custom exercises.

## 6. Workouts

- Create a workout template by body part, choosing exercises from the library.
- Start a session from a template, or start an empty one.
- Log sets (reps and weight) during the session, then finish it.
- Show a history of past sessions.

## 7. Nutrition

- Add food entries by meal with calories and macros.
- Show daily totals against the targets in `settings`.
- Move between days.

## 8. Progress

- Personal records per exercise: heaviest weight, and best estimated 1-rep max.
- Charts of weight or volume over time for a chosen exercise.
- Calories and macros over time.

## 9. Cleanup

Remove `components/EditScreenInfo.tsx` and (once every tab is built) `components/PlaceholderScreen.tsx`. `app/modal.tsx` stays, because it becomes the Settings screen in step 4b.

## 10. Builds

Only needed if a library with native code is added. Use `eas build --profile development` or `npx expo run:android|ios`.

## Open questions

- **Sync:** revisit if backup or use on more than one device is needed. A file export/import is a cheap step before full sync.
- **Exercise library:** where does the seed list come from: written by hand, or an open dataset?
- **Food entry:** manual only, or look foods up in a nutrition database (which needs the network and an API key)?
- **Charts:** choose a chart library when starting step 8.
