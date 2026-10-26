// Builds db/seed/exercises.json from the free-exercise-db dataset (public domain, the Unlicense):
// https://github.com/yuhonas/free-exercise-db
//
// Usage:
//   1. Download https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
//   2. node scripts/build-exercise-seed.mjs <path to downloaded exercises.json>
//   3. Bump BUILT_IN_SEED_VERSION in db/seedExercises.ts so existing installs pick up the changes.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// These categories don't fit logging sets of reps × weight.
const EXCLUDED_CATEGORIES = new Set(['stretching', 'cardio']);

// Dataset muscle names -> the app's muscle groups (db/exerciseTags.ts).
const MUSCLE_MAP = {
  abdominals: 'abs',
  abductors: 'glutes',
  adductors: 'glutes',
  biceps: 'biceps',
  calves: 'calves',
  chest: 'chest',
  forearms: 'forearms',
  glutes: 'glutes',
  hamstrings: 'hamstrings',
  lats: 'back',
  'lower back': 'back',
  'middle back': 'back',
  neck: 'back',
  quadriceps: 'quads',
  shoulders: 'shoulders',
  traps: 'back',
  triceps: 'triceps',
};

// Dataset equipment names -> the app's equipment keys (db/exerciseTags.ts).
const EQUIPMENT_MAP = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  machine: 'machine',
  cable: 'cable',
  kettlebells: 'kettlebell',
  bands: 'band',
  'body only': 'bodyweight',
  'medicine ball': 'medicine_ball',
  'exercise ball': 'exercise_ball',
  'e-z curl bar': 'ez_bar',
  'foam roll': 'other',
  other: 'other',
};

// Exercises tagged "No equipment": doable at home with nothing, or only household items
// (floor, wall, chair, couch, stairs, towel). Picked by hand from each exercise's
// instructions, because the dataset's equipment field can't tell: some "body only"
// exercises need a pull-up bar or bench. Excludes anything needing gym gear, cones,
// boxes or a partner.
const NO_EQUIPMENT_IDS = new Set([
  // equipment: null
  'Alternate_Leg_Diagonal_Bound',
  'Bodyweight_Walking_Lunge',
  'Carioca_Quick_Step',
  'Decline_Push-Up', // feet on a chair or couch
  'Floor_Glute-Ham_Raise', // feet braced under a couch
  'Kneeling_Arm_Drill',
  'Linear_3-Part_Start_Technique',
  'Linear_Acceleration_Wall_Drill', // wall
  'Mountain_Climbers',
  'Moving_Claw_Series',
  'Side_Standing_Long_Jump',
  // equipment: body only
  '3_4_Sit-Up',
  'Air_Bike',
  'Alternate_Heel_Touchers',
  'Bench_Dips', // chair
  'Bent-Knee_Hip_Raise',
  'Body-Up',
  'Bodyweight_Squat',
  'Bottoms_Up',
  'Butt_Lift_Bridge',
  'Butt-Ups',
  'Clock_Push-Up',
  'Cocoons',
  'Cross-Body_Crunch',
  'Crunch_-_Hands_Overhead',
  'Crunches',
  'Dead_Bug',
  'Double_Leg_Butt_Kick',
  'Elbow_to_Knee',
  'Fast_Skipping',
  'Freehand_Jump_Squat',
  'Frog_Sit-Ups',
  'Glute_Kickback',
  'Handstand_Push-Ups', // wall
  'Incline_Push-Up', // hands on a couch or table
  'Isometric_Chest_Squeezes',
  'Isometric_Neck_Exercise_-_Front_And_Back',
  'Isometric_Neck_Exercise_-_Sides',
  'Isometric_Wipers',
  'Jackknife_Sit-Up',
  'Janda_Sit-Up',
  'Knee_Tuck_Jump',
  'Lateral_Bound',
  'Leg_Lift', // chair for balance
  'Leg_Pull-In',
  'Oblique_Crunches',
  'Oblique_Crunches_-_On_The_Floor',
  'Plank',
  'Plyo_Push-up',
  'Push_Up_to_Side_Plank',
  'Push-Up_Wide',
  'Push-Ups_-_Close_Triceps_Position',
  'Push-Ups_With_Feet_Elevated', // feet on a chair or couch
  'Pushups',
  'Pushups_Close_and_Wide_Hand_Positions',
  'Reverse_Crunch',
  'Rocket_Jump',
  'Russian_Twist', // feet under a couch
  'Scissors_Jump',
  'Side_Bridge',
  'Side_Jackknife',
  'Single_Leg_Butt_Kick',
  'Single_Leg_Glute_Bridge',
  'Single-Arm_Push-Up',
  'Sit-Up', // feet under a couch
  'Spider_Crawl',
  'Split_Jump',
  'Standing_Long_Jump',
  'Star_Jump',
  'Step-up_with_Knee_Raise', // stairs
  'Tuck_Crunch',
  // equipment: other
  'Platform_Hamstring_Slides', // towel on a smooth floor
]);

// Exercises logged in seconds instead of reps: holds and timed efforts. Picked by hand,
// since many lifts say "hold the bar" without being timed.
const TIMED_IDS = new Set([
  'Balance_Board',
  'Battling_Ropes',
  'Farmers_Walk',
  'Isometric_Chest_Squeezes',
  'Isometric_Neck_Exercise_-_Front_And_Back',
  'Isometric_Neck_Exercise_-_Sides',
  'Mountain_Climbers',
  'Plank',
  'Plate_Pinch',
  'Side_Bridge',
]);

function mapMuscle(name) {
  const group = MUSCLE_MAP[name];
  if (!group) throw new Error(`Unmapped muscle: ${name}`);
  return group;
}

function mapEquipment(name) {
  if (name == null) return null;
  const key = EQUIPMENT_MAP[name];
  if (!key) throw new Error(`Unmapped equipment: ${name}`);
  return key;
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/build-exercise-seed.mjs <exercises.json>');
  process.exit(1);
}

const source = JSON.parse(readFileSync(inputPath, 'utf8'));

const sourceIds = new Set(source.map((e) => e.id));
for (const [label, ids] of Object.entries({ NO_EQUIPMENT_IDS, TIMED_IDS })) {
  const unknown = [...ids].filter((id) => !sourceIds.has(id));
  if (unknown.length) throw new Error(`${label} not in dataset: ${unknown.join(', ')}`);
}

const exercises = source
  .filter((e) => !EXCLUDED_CATEGORIES.has(e.category))
  .map((e) => {
    const primary = mapMuscle(e.primaryMuscles[0]);
    const secondary = [
      ...new Set([...e.primaryMuscles.slice(1), ...e.secondaryMuscles].map(mapMuscle)),
    ].filter((m) => m !== primary);

    return {
      id: e.id,
      name: e.name.trim(),
      primary,
      secondary,
      equipment: mapEquipment(e.equipment),
      noEquipment: NO_EQUIPMENT_IDS.has(e.id),
      timed: TIMED_IDS.has(e.id),
      level: e.level ?? null,
      category: e.category ?? null,
      instructions: e.instructions ?? [],
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const outputPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'seed', 'exercises.json');
writeFileSync(outputPath, JSON.stringify(exercises) + '\n');
const noEquipmentCount = exercises.filter((e) => e.noEquipment).length;
const timedCount = exercises.filter((e) => e.timed).length;
console.log(
  `Wrote ${exercises.length} exercises (${noEquipmentCount} no equipment, ${timedCount} timed) to ${outputPath}`
);
