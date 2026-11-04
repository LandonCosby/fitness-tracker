import type { SQLiteDatabase } from 'expo-sqlite';

import type { MuscleGroup } from './exerciseTags';
import type { WorkoutTemplateExercise } from './workouts';

// Prebuilt workouts offered when creating a workout. Choosing one only fills in the
// "New workout" form: the user can change anything, and saving makes an ordinary
// workout of their own, so presets never need editing in place or a table of their own.
//
// Exercise IDs are built-in library IDs (`builtin:<dataset id>`, see db/seedExercises.ts).
// Any that are missing from the library are skipped when the preset is applied.
// `target` is reps, or seconds for timed exercises such as Plank.

export type PresetExercise = { id: string; sets: number; target: number };

export type WorkoutPreset = {
  key: string;
  name: string;
  description: string;
  muscleGroups: MuscleGroup[];
  exercises: PresetExercise[];
  /** A swap-in version hitting the same muscles with different exercises/equipment. */
  alternate?: { description: string; exercises: PresetExercise[] };
};

// Alternates are addressed as "<key>:alt".
export const ALT_SUFFIX = ':alt';

export type PresetGroup = { title: string; presets: WorkoutPreset[] };

const ex = (datasetId: string, sets: number, target: number): PresetExercise => ({
  id: `builtin:${datasetId}`,
  sets,
  target,
});

export const PRESET_GROUPS: PresetGroup[] = [
  {
    title: 'Push / Pull / Legs',
    presets: [
      {
        key: 'push',
        name: 'Push',
        description: 'Chest, shoulders and triceps.',
        muscleGroups: ['chest', 'shoulders', 'triceps'],
        exercises: [
          ex('Barbell_Bench_Press_-_Medium_Grip', 4, 8),
          ex('Incline_Dumbbell_Press', 3, 10),
          ex('Standing_Military_Press', 3, 8),
          ex('Side_Lateral_Raise', 3, 15),
          ex('Triceps_Pushdown_-_Rope_Attachment', 3, 12),
          ex('Dips_-_Triceps_Version', 3, 10),
        ],
        alternate: {
          description: 'Dumbbells and cables instead of barbells.',
          exercises: [
            ex('Dumbbell_Bench_Press', 4, 10),
            ex('Cable_Crossover', 3, 12),
            ex('Dumbbell_Shoulder_Press', 3, 10),
            ex('Cable_Seated_Lateral_Raise', 3, 15),
            ex('EZ-Bar_Skullcrusher', 3, 10),
            ex('Triceps_Pushdown', 3, 12),
          ],
        },
      },
      {
        key: 'pull',
        name: 'Pull',
        description: 'Back, rear delts and biceps.',
        muscleGroups: ['back', 'biceps'],
        exercises: [
          ex('Barbell_Deadlift', 3, 5),
          ex('Pullups', 3, 8),
          ex('Bent_Over_Barbell_Row', 3, 8),
          ex('Seated_Cable_Rows', 3, 10),
          ex('Face_Pull', 3, 15),
          ex('Barbell_Curl', 3, 10),
          ex('Hammer_Curls', 3, 12),
        ],
        alternate: {
          description: 'Pulldowns and dumbbell rows; easier on the lower back.',
          exercises: [
            ex('Wide-Grip_Lat_Pulldown', 4, 10),
            ex('One-Arm_Dumbbell_Row', 3, 10),
            ex('Close-Grip_Front_Lat_Pulldown', 3, 10),
            ex('Reverse_Flyes', 3, 15),
            ex('EZ-Bar_Curl', 3, 10),
            ex('Incline_Dumbbell_Curl', 3, 12),
          ],
        },
      },
      {
        key: 'legs',
        name: 'Legs',
        description: 'Quads, hamstrings, glutes and calves.',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        exercises: [
          ex('Barbell_Squat', 4, 6),
          ex('Romanian_Deadlift', 3, 8),
          ex('Leg_Press', 3, 10),
          ex('Lying_Leg_Curls', 3, 12),
          ex('Leg_Extensions', 3, 12),
          ex('Standing_Calf_Raises', 4, 15),
        ],
        alternate: {
          description: 'Front squats, split squats and hip thrusts.',
          exercises: [
            ex('Front_Squat_Clean_Grip', 4, 6),
            ex('Split_Squat_with_Dumbbells', 3, 10),
            ex('Barbell_Hip_Thrust', 3, 10),
            ex('Glute_Ham_Raise', 3, 8),
            ex('Leg_Extensions', 3, 12),
            ex('Seated_Calf_Raise', 4, 15),
          ],
        },
      },
    ],
  },
  {
    title: 'Upper / Lower',
    presets: [
      {
        key: 'upper',
        name: 'Upper Body',
        description: 'Presses, rows and arms.',
        muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
        exercises: [
          ex('Barbell_Bench_Press_-_Medium_Grip', 4, 6),
          ex('Bent_Over_Barbell_Row', 4, 8),
          ex('Dumbbell_Shoulder_Press', 3, 10),
          ex('Wide-Grip_Lat_Pulldown', 3, 10),
          ex('Dumbbell_Bicep_Curl', 3, 12),
          ex('Triceps_Pushdown', 3, 12),
        ],
        alternate: {
          description: 'Incline press, pull-ups and dumbbell work.',
          exercises: [
            ex('Incline_Dumbbell_Press', 4, 8),
            ex('Pullups', 4, 8),
            ex('Standing_Military_Press', 3, 8),
            ex('One-Arm_Dumbbell_Row', 3, 10),
            ex('Hammer_Curls', 3, 12),
            ex('Dips_-_Triceps_Version', 3, 10),
          ],
        },
      },
      {
        key: 'lower',
        name: 'Lower Body',
        description: 'Squat, hinge, lunge and core.',
        muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
        exercises: [
          ex('Barbell_Squat', 4, 6),
          ex('Romanian_Deadlift', 3, 8),
          ex('Dumbbell_Lunges', 3, 10),
          ex('Barbell_Hip_Thrust', 3, 10),
          ex('Seated_Calf_Raise', 4, 15),
          ex('Hanging_Leg_Raise', 3, 12),
        ],
        alternate: {
          description: 'Deadlift-led, with step-ups and cable crunches.',
          exercises: [
            ex('Barbell_Deadlift', 4, 5),
            ex('Front_Squat_Clean_Grip', 3, 8),
            ex('Dumbbell_Step_Ups', 3, 10),
            ex('Lying_Leg_Curls', 3, 12),
            ex('Standing_Calf_Raises', 4, 15),
            ex('Cable_Crunch', 3, 15),
          ],
        },
      },
    ],
  },
  {
    title: 'Full body',
    presets: [
      {
        key: 'full-a',
        name: 'Full Body A',
        description: 'Squat, bench and row. Alternate with B.',
        muscleGroups: ['quads', 'chest', 'back', 'shoulders', 'abs'],
        exercises: [
          ex('Barbell_Squat', 3, 8),
          ex('Barbell_Bench_Press_-_Medium_Grip', 3, 8),
          ex('Bent_Over_Barbell_Row', 3, 8),
          ex('Dumbbell_Shoulder_Press', 3, 10),
          ex('Plank', 3, 45),
        ],
        alternate: {
          description: 'All dumbbells: good for a busy gym or a home setup.',
          exercises: [
            ex('Goblet_Squat', 3, 12),
            ex('Dumbbell_Bench_Press', 3, 10),
            ex('One-Arm_Dumbbell_Row', 3, 10),
            ex('Dumbbell_Shoulder_Press', 3, 10),
            ex('Plank', 3, 45),
          ],
        },
      },
      {
        key: 'full-b',
        name: 'Full Body B',
        description: 'Deadlift, incline press and pull-ups. Alternate with A.',
        muscleGroups: ['hamstrings', 'quads', 'chest', 'back', 'abs'],
        exercises: [
          ex('Barbell_Deadlift', 3, 5),
          ex('Incline_Dumbbell_Press', 3, 10),
          ex('Pullups', 3, 8),
          ex('Goblet_Squat', 3, 12),
          ex('Hanging_Leg_Raise', 3, 12),
        ],
        alternate: {
          description: 'Romanian deadlifts, push-ups and pulldowns.',
          exercises: [
            ex('Romanian_Deadlift', 3, 8),
            ex('Pushups', 3, 15),
            ex('Wide-Grip_Lat_Pulldown', 3, 10),
            ex('Dumbbell_Lunges', 3, 10),
            ex('Hanging_Leg_Raise', 3, 12),
          ],
        },
      },
      {
        key: 'strength-5x5',
        name: 'Strength 5×5',
        description: 'Three heavy barbell lifts, five sets of five.',
        muscleGroups: ['quads', 'chest', 'back'],
        exercises: [
          ex('Barbell_Squat', 5, 5),
          ex('Barbell_Bench_Press_-_Medium_Grip', 5, 5),
          ex('Bent_Over_Barbell_Row', 5, 5),
        ],
        alternate: {
          description: 'Squat, overhead press and one heavy set of deadlifts.',
          exercises: [
            ex('Barbell_Squat', 5, 5),
            ex('Standing_Military_Press', 5, 5),
            ex('Barbell_Deadlift', 1, 5),
          ],
        },
      },
    ],
  },
  {
    title: 'No equipment',
    presets: [
      {
        key: 'home-full',
        name: 'Home Full Body',
        description: 'Bodyweight only, no gym needed.',
        muscleGroups: ['chest', 'quads', 'glutes', 'abs'],
        exercises: [
          ex('Pushups', 3, 15),
          ex('Bodyweight_Squat', 3, 20),
          ex('Bodyweight_Walking_Lunge', 3, 12),
          ex('Glute_Kickback', 3, 15),
          ex('Mountain_Climbers', 3, 30),
          ex('Plank', 3, 45),
        ],
        alternate: {
          description: 'Bodyweight circuit with step-ups and chair dips.',
          exercises: [
            ex('Pushups_Close_and_Wide_Hand_Positions', 3, 12),
            ex('Step-up_with_Knee_Raise', 3, 12),
            ex('Glute_Kickback', 3, 15),
            ex('Dips_-_Triceps_Version', 3, 10),
            ex('Air_Bike', 3, 20),
            ex('Plank', 3, 60),
          ],
        },
      },
      {
        key: 'core',
        name: 'Core Circuit',
        description: 'Abs and core, about 15 minutes.',
        muscleGroups: ['abs'],
        exercises: [
          ex('Crunches', 3, 20),
          ex('Reverse_Crunch', 3, 15),
          ex('Air_Bike', 3, 20),
          ex('Mountain_Climbers', 3, 30),
          ex('Plank', 3, 60),
        ],
        alternate: {
          description: 'Leg raises, cable crunches and side bends.',
          exercises: [
            ex('Hanging_Leg_Raise', 3, 12),
            ex('Cable_Crunch', 3, 15),
            ex('Dumbbell_Side_Bend', 3, 12),
            ex('Crunch_-_Hands_Overhead', 3, 15),
            ex('Plank', 3, 60),
          ],
        },
      },
    ],
  },
];

// A preset by key; "<key>:alt" returns its alternate as a preset of its own.
export function findPreset(key: string): WorkoutPreset | undefined {
  const alt = key.endsWith(ALT_SUFFIX);
  const baseKey = alt ? key.slice(0, -ALT_SUFFIX.length) : key;
  for (const group of PRESET_GROUPS) {
    const preset = group.presets.find((p) => p.key === baseKey);
    if (!preset) continue;
    if (!alt) return preset;
    return preset.alternate ? alternateOf(preset) : undefined;
  }
  return undefined;
}

export function alternateOf(preset: WorkoutPreset): WorkoutPreset {
  return {
    key: preset.key + ALT_SUFFIX,
    name: `${preset.name} (Alt)`,
    description: preset.alternate!.description,
    muscleGroups: preset.muscleGroups,
    exercises: preset.alternate!.exercises,
  };
}

// The preset's exercises with names from the library, in order. Missing ones are dropped.
export async function getPresetExercises(
  db: SQLiteDatabase,
  preset: WorkoutPreset
): Promise<WorkoutTemplateExercise[]> {
  const ids = [...new Set(preset.exercises.map((e) => e.id))];
  const rows = await db.getAllAsync<{ id: string; name: string; is_timed: 0 | 1 }>(
    `SELECT id, name, is_timed FROM exercises
     WHERE deleted_at IS NULL AND id IN (${ids.map(() => '?').join(', ')})`,
    ...ids
  );
  const byId = new Map(rows.map((row) => [row.id, row]));

  return preset.exercises.flatMap((e) => {
    const row = byId.get(e.id);
    if (!row) return [];
    const isTimed = row.is_timed === 1;
    return [
      {
        exerciseId: row.id,
        name: row.name,
        isTimed,
        targetSets: e.sets,
        targetReps: isTimed ? null : e.target,
        targetSeconds: isTimed ? e.target : null,
      },
    ];
  });
}
