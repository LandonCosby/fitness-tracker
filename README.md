# Fitness Tracker

A mobile app for logging workouts, nutrition and body weight, built with Expo and React Native. Everything is stored on the phone with SQLite, so it works offline and needs no account.

## Features

- **Workouts:** build workout templates, start a session, and log sets with weight and reps (or seconds for timed exercises like planks). Each set is pre-filled with last time's numbers.
- **Exercises:** a library of 739 built-in exercises from [free-exercise-db](https://github.com/yuhonas/free-exercise-db), searchable and filterable by muscle group and equipment, plus your own custom exercises.
- **Nutrition:** log meals by day, save foods to reuse, and track calories, protein, carbs and fat against optional daily targets.
- **Progress:** charts for exercise strength (estimated 1RM), weekly training volume, daily calories or protein, and body weight, plus personal records. You get an alert when a workout sets a new record.
- **Units:** pounds or kilograms, switchable in Settings.

## Tech

- [Expo](https://expo.dev) SDK 58 with Expo Router (file-based navigation)
- React Native, TypeScript
- `expo-sqlite` for local storage, with versioned migrations in `db/migrations.ts`
- Charts drawn by hand with `react-native-svg`

## Run it

You need [Node.js](https://nodejs.org) and the Expo Go app on your phone.

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

## Checks

```bash
npm run lint
npx tsc --noEmit
```

## Project layout

```
app/          screens (Expo Router): the four tabs, plus forms and detail screens
components/   shared UI and charts
db/           SQLite schema, migrations and queries
hooks/        shared React hooks (such as the weight-unit setting)
scripts/      builds the exercise seed data
```

See [PLAN.md](PLAN.md) for design decisions and the roadmap.
