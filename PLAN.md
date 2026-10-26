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
| 4b | Settings screen with the lb/kg switch | Done |
| 5 | Exercises tab | Done |
| 6 | Workouts tab | Done |
| 7 | Nutrition tab | Done |
| 8 | Progress tab | Done |
| 9 | Remove template leftovers | Done |
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
| `workouts` (templates) | `id`, `name`, `muscle_groups` (JSON), `notes` |
| `workout_exercises` | `id`, `workout_id`, `exercise_id`, `position`, `target_sets`, `target_reps`, `target_seconds` |
| `sessions` (a workout performed) | `id`, `workout_id` (nullable), `name`, `started_at`, `ended_at` |
| `session_exercises` | `id`, `session_id`, `exercise_id`, `position` |
| `sets` | `id`, `session_exercise_id`, `exercise_id`, `set_number`, `reps`, `duration_s`, `weight`, `unit`, `completed_at` |
| `foods` (My foods) | `id`, `name`, `serving_label`, `calories`, `protein_g`, `carbs_g`, `fat_g`, `last_used_at` |
| `food_entries` | `id`, `date`, `meal`, `food_id`, `name`, `serving_label`, `servings`, `calories`, `protein_g`, `carbs_g`, `fat_g` (per serving) |
| `body_weights` | `id`, `date`, `weight`, `unit` |
| `settings` | `key`, `value` (calorie and macro targets, weight unit) |

Every table except `settings` also gets `created_at`, `updated_at` and `deleted_at`. `settings` only has `updated_at`. Personal records are calculated from `sets`, so they don't need their own table.

## 4b. Settings screen

- `app/settings.tsx` (formerly the template's `modal.tsx`) opens as a modal from the gear icon in every tab header.
- The lb/kg switch saves with `setWeightUnit()`. A missing setting means lb.
- `hooks/useWeightUnit.tsx` loads the unit once and shares it through `WeightUnitProvider` in `app/_layout.tsx`. Screens call `useWeightUnit()` to read or change it, and every screen updates when it changes.
- Nutrition targets (step 7) will be added to this screen later.

### Sync later

These conventions cost little now and avoid a migration if sync is added:

- IDs are UUID strings, not auto-increment integers, so records made on two devices can't collide.
- Every write sets `updated_at`, so a sync can find what changed since the last run.
- Deletes set `deleted_at` instead of removing the row, so a delete can sync to other devices.

## 5. Exercises

- **Library:** 739 built-in exercises from [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain). Its stretching and cardio entries are left out, and there are no photos, so everything works offline.
  - `scripts/build-exercise-seed.mjs` converts the dataset into `db/seed/exercises.json`. Usage is in the script header.
  - `db/seedExercises.ts` imports the library at startup. After regenerating the JSON, bump `BUILT_IN_SEED_VERSION` so existing installs update.
  - Built-in IDs are `builtin:<dataset id>`, so they're the same on every device. Built-in exercises are read-only.
  - Dataset muscles are mapped to 11 groups (`db/exerciseTags.ts`). Lats, middle back, lower back, traps and neck count as Back. Abductors and adductors count as Glutes.
- **List** (`app/(tabs)/exercises.tsx`): search by name. An **Advanced** button next to the search box opens Muscle group and Equipment filters. You can pick several options in each: options in the same category match any of them, and the two categories must both match. The muscle filter checks the primary muscle only. The button shows how many filters are on, and the list shows the result count.
- **"No equipment" tag:** marks exercises you can do at home with nothing, or only household items (floor, wall, chair, couch, stairs, towel). Pull-up bars, benches, boxes, cones, a partner and small gear (dumbbells, bands) don't count.
  - 72 built-in exercises were picked by hand from their instructions and listed in `NO_EQUIPMENT_IDS` in the seed script. The dataset's equipment field can't decide this: some "body only" exercises need a pull-up bar.
  - It appears as a green badge in the list and on the detail screen, and as the first option in the Equipment filter (OR'd with the other equipment options). Custom exercises get it with a switch in the form.
  - Stored in `exercises.no_equipment` (migration 3). The seed version was bumped to 2 so existing installs get the tags.
- **Detail** (`app/exercise/[id].tsx`): muscles, equipment, level and instructions. Steps 6 and 8 will add history and personal records here.
- **Custom exercises** (`app/exercise-form.tsx`): add with the + in the header, and edit or delete from the detail screen. Names must be unique (ignoring case). Deleting is a soft delete.
- Migration 2 adds `level`, `category` and `instructions` columns to `exercises`. Queries are in `db/exercises.ts`.

## 6. Workouts

- **Tab** (`app/(tabs)/index.tsx`): an in-progress card (or "Start empty workout"), **My workouts** with a Start button on each, and **History**.
- **Templates** (`app/workout-form.tsx`, queries in `db/workouts.ts`): a name, body parts and an ordered exercise list. Each exercise has a target of sets × reps, or sets × seconds for timed exercises. "Add exercises" opens the picker with the template's body parts already selected. Deleting a template keeps its history, because sessions copy the template's name.
- **Picker** (`app/exercise-picker.tsx`): the same search and Advanced filters as the Exercises tab (`components/ExerciseBrowser.tsx`), in multi-select mode. It returns the chosen exercises through `lib/exercisePicker.ts`.
- **Logging** (`app/session/[id].tsx`, queries in `db/sessions.ts`):
  - Only one workout can be active at a time.
  - Starting from a template creates the target number of sets for each exercise, pre-filled with last time's weight and reps (converted to the current unit), or the template's targets if there's no history.
  - Each row shows **Last time**. Values save as you type, and ✓ marks a set done. ✓ needs reps or seconds; weight is optional, for bodyweight exercises.
  - "+ Add set" copies the last set. Long-press a set number to delete the set. Exercises can be added or removed mid-workout.
  - **Finish** removes unchecked sets. With nothing checked off, it offers to discard the workout.
- **Finished workouts** open as a read-only summary with "Delete from history". The exercise detail screen shows the 5 most recent sessions for that exercise.
- **Timed exercises** are logged in seconds. 10 built-ins are tagged by hand (`TIMED_IDS` in the seed script): Plank, Side Bridge, isometric holds, Farmers Walk and others. Custom exercises have a "Timed" switch. Seed version 3.
- Migration 4 adds `exercises.is_timed` and rebuilds the workout tables, which no earlier build had written to: `workouts.muscle_groups`, `workout_exercises` targets, `sessions.name`, a new `session_exercises` table, and `sets` with nullable reps and weight, `duration_s` and `completed_at`.

## 7. Nutrition

- **Tab** (`app/(tabs)/nutrition.tsx`): a day switcher (‹ Today ›; tap the date to jump back to today; no future days), a summary card (calories eaten / target with "left" or "over", plus protein, carbs and fat bars), and Breakfast, Lunch, Dinner and Snacks sections, each with "+ Add". Tap an entry to edit or delete it.
- **Add food** (`app/food-add.tsx`): search **My foods**, most recently used first. Tap a food, pick servings (− / + in steps of 0.5, or the 0.5, 1, 1.5 and 2 shortcuts, or type a number) and add it. Long-press removes a food from My foods. "+ New food" opens the entry form, carrying over the search text.
- **Entry form** (`app/food-entry.tsx`): name, serving size (optional), calories, protein, carbs and fat per serving, servings eaten, and meal. Blank calories are worked out from the macros (4/4/9 kcal per gram); the field shows the suggestion. "Save to My foods" is on by default. A food with the same name and serving (ignoring case) is updated instead of duplicated.
- **Entries copy the food's numbers when logged**, so editing or removing a saved food never changes past days. Day totals are per-serving numbers × servings.
- **Targets** for calories, protein, carbs and fat are in Settings. Each is optional, and the screen shows what the macro targets add up to in kcal.
- The default meal comes from the time of day: breakfast until 10:30, lunch until 3 pm, dinner until 9 pm, then snack.
- Migration 5 adds the `foods` table and rebuilds `food_entries`, which no earlier build had written to, with `food_id`, `serving_label` and `servings`. Queries are in `db/nutrition.ts`.

## 8. Progress

- **Tab** (`app/(tabs)/progress.tsx`): one range filter (1M / 3M / 6M / 1Y / All, default 3M) above everything it scopes:
  - **Exercise progress:** pick an exercise (single-pick mode of the picker; defaults to the most recently trained one). The chart shows one point per workout: best estimated 1RM if the exercise has ever been done with weight, otherwise most reps, or longest hold for timed exercises. Record tiles sit under the chart.
  - **Weekly training:** columns of workouts or sets per week (Monday start), empty weeks included. "All" shows at most the last 52 weeks.
  - **Nutrition:** daily calories or protein, with the target as a reference line. Days with nothing logged are skipped rather than drawn as zero.
  - **Body weight:** a line of weigh-ins with the change over the range. "+ Log weight" opens `app/weigh-in.tsx`, which allows one weigh-in per day (saving again replaces it) and has a recent list with delete.
  - **Personal records:** the 10 most recently trained exercises with their headline record. Tap one to open the exercise.
- **Records** (`db/progress.ts`): heaviest weight, best estimated 1RM (Epley, `weight × (1 + reps/30)`, only from sets of 12 reps or fewer), most reps in a set, and longest hold for timed exercises. Weights are converted to the current unit. Ties keep the earliest date. They're shown on the exercise detail screen too (`components/RecordTiles.tsx`).
- **New records on finish:** after Finish, an alert lists any records the workout beat. An exercise's first workout sets the baseline and doesn't count.
- **Charts** (`components/charts/`): hand-drawn with `react-native-svg`, which is included in Expo Go. They follow the dataviz skill: one series in the validated blue (`chartSeries` in `constants/Colors.ts`, checked against the app's white and black backgrounds), a 2px line, an end dot with a surface ring, a labelled endpoint, hairline gridlines, clean y-ticks (1K / 2K), and columns at most 24px wide with a 4px rounded top and square base. A readout above each chart shows the latest value, or the touched point while you tap or drag; there's a crosshair on lines and selected-column highlighting on bars. **Show data** under each chart lists every value, so nothing depends on touch.
- Migration 6 adds `body_weights`, with a unique date among rows that aren't deleted.

## 9. Cleanup

Done: `EditScreenInfo`, `ExternalLink`, `StyledText` and `PlaceholderScreen` have been removed.

## 10. Builds

Only needed if a library with native code is added. Use `eas build --profile development` or `npx expo run:android|ios`.

## Open questions

- **Sync:** revisit if backup or use on more than one device is needed. A file export/import is a cheap step before full sync.
- **Food lookup:** foods are entered by hand and reused from My foods. Searching an online database (Open Food Facts, USDA) or scanning barcodes could be added later.
