import type { SQLiteDatabase } from 'expo-sqlite';

import { listWeighIns } from './bodyWeight';
import type { MuscleGroup } from './exerciseTags';
import type { Profile, Sex } from './profile';
import { getExerciseRecords } from './progress';
import type { WeightUnit } from './units';

// Strength ranks: how strong a muscle group is, from Bronze III up to Olympian.
//
// For each muscle, a few barbell "benchmark" lifts with well-known strength standards are
// checked. A lift's best estimated 1-rep max is divided by body weight (latest weigh-in),
// adjusted for height, and placed on that lift's standard. The muscle's rank is its best
// benchmark. The standards are approximate (typical published bodyweight-ratio tables);
// they're a motivating guide, not a precise measurement.

type StandardKey =
  | 'bench'
  | 'squat'
  | 'deadlift'
  | 'ohp'
  | 'row'
  | 'curl'
  | 'hipThrust'
  | 'calfRaise'
  | 'cableCrunch'
  | 'wristCurl';

// 1RM ÷ body weight at: beginner, novice, intermediate, advanced, elite.
type Standard = [number, number, number, number, number];

const STANDARDS: Record<Sex, Record<StandardKey, Standard>> = {
  male: {
    bench: [0.5, 0.75, 1.0, 1.5, 2.0],
    squat: [0.75, 1.25, 1.5, 2.25, 2.75],
    deadlift: [1.0, 1.5, 2.0, 2.5, 3.0],
    ohp: [0.35, 0.55, 0.75, 1.0, 1.35],
    row: [0.5, 0.75, 1.0, 1.5, 1.75],
    curl: [0.2, 0.4, 0.6, 0.85, 1.15],
    hipThrust: [0.75, 1.25, 1.75, 2.5, 3.25],
    // Isolation lifts: standing machine calf raise, kneeling cable crunch, barbell wrist curl.
    calfRaise: [0.75, 1.25, 1.75, 2.5, 3.25],
    cableCrunch: [0.4, 0.6, 0.85, 1.15, 1.5],
    wristCurl: [0.25, 0.45, 0.65, 0.9, 1.2],
  },
  female: {
    bench: [0.25, 0.5, 0.75, 1.0, 1.3],
    squat: [0.5, 0.75, 1.25, 1.5, 1.9],
    deadlift: [0.5, 1.0, 1.25, 1.75, 2.25],
    ohp: [0.2, 0.35, 0.5, 0.75, 0.95],
    row: [0.25, 0.4, 0.65, 0.9, 1.2],
    curl: [0.1, 0.2, 0.4, 0.6, 0.85],
    hipThrust: [0.5, 1.0, 1.5, 2.0, 2.6],
    calfRaise: [0.5, 0.9, 1.4, 2.0, 2.7],
    cableCrunch: [0.25, 0.4, 0.6, 0.85, 1.1],
    wristCurl: [0.15, 0.25, 0.4, 0.6, 0.8],
  },
};

// Isolation lifts are usually trained for higher reps, so their estimated 1RM also counts
// sets of up to 20 (other lifts: up to 12, as everywhere else in the app).
const HIGH_REP_STANDARDS = new Set<StandardKey>(['calfRaise', 'cableCrunch', 'wristCurl']);
const HIGH_REP_MAX = 20;

// Taller lifters at the same body weight carry less muscle per unit of height, so their
// ratio is scaled up a little (and shorter lifters' down): ratio × (height / reference)^0.5.
const REFERENCE_HEIGHT_CM: Record<Sex, number> = { male: 177, female: 163 };
const HEIGHT_EXPONENT = 0.5;

// `factor`: this lift's 1RM relative to the standard lift (incline bench ≈ 85% of flat).
export type Benchmark = { id: string; name: string; standard: StandardKey; factor: number };

const b = (datasetId: string, name: string, standard: StandardKey, factor = 1): Benchmark => ({
  id: `builtin:${datasetId}`,
  name,
  standard,
  factor,
});

const BENCH = [
  b('Barbell_Bench_Press_-_Medium_Grip', 'Bench press', 'bench'),
  b('Bench_Press_-_Powerlifting', 'Bench press (powerlifting)', 'bench'),
  b('Wide-Grip_Barbell_Bench_Press', 'Wide-grip bench press', 'bench'),
  b('Barbell_Incline_Bench_Press_-_Medium_Grip', 'Incline bench press', 'bench', 0.85),
];
const DEADLIFT = b('Barbell_Deadlift', 'Deadlift', 'deadlift');
const SQUATS = [
  b('Barbell_Squat', 'Squat', 'squat'),
  b('Barbell_Full_Squat', 'Full squat', 'squat'),
  b('Front_Squat_Clean_Grip', 'Front squat', 'squat', 0.85),
];

export const RANKED_MUSCLES: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'forearms',
];

export const BENCHMARKS: Partial<Record<MuscleGroup, Benchmark[]>> = {
  chest: BENCH,
  triceps: [b('Close-Grip_Barbell_Bench_Press', 'Close-grip bench press', 'bench', 0.9), ...BENCH],
  shoulders: [
    b('Standing_Military_Press', 'Overhead press', 'ohp'),
    b('Barbell_Shoulder_Press', 'Barbell shoulder press', 'ohp'),
    b('Push_Press', 'Push press', 'ohp', 1.2),
  ],
  back: [
    b('Bent_Over_Barbell_Row', 'Barbell row', 'row'),
    b('Reverse_Grip_Bent-Over_Rows', 'Reverse-grip row', 'row'),
    DEADLIFT,
  ],
  biceps: [
    b('Barbell_Curl', 'Barbell curl', 'curl'),
    b('EZ-Bar_Curl', 'EZ-bar curl', 'curl'),
    b('Wide-Grip_Standing_Barbell_Curl', 'Wide-grip barbell curl', 'curl'),
    b('Preacher_Curl', 'Preacher curl', 'curl', 0.85),
  ],
  quads: SQUATS,
  hamstrings: [DEADLIFT, b('Romanian_Deadlift', 'Romanian deadlift', 'deadlift', 0.75)],
  glutes: [b('Barbell_Hip_Thrust', 'Hip thrust', 'hipThrust'), ...SQUATS, DEADLIFT],
  calves: [
    b('Standing_Calf_Raises', 'Standing calf raise', 'calfRaise'),
    b('Smith_Machine_Calf_Raise', 'Smith machine calf raise', 'calfRaise', 0.9),
    b('Standing_Barbell_Calf_Raise', 'Barbell calf raise', 'calfRaise', 0.8),
    b('Calf_Press_On_The_Leg_Press_Machine', 'Leg press calf press', 'calfRaise', 1.2),
    b('Seated_Calf_Raise', 'Seated calf raise', 'calfRaise', 0.7),
  ],
  abs: [
    b('Cable_Crunch', 'Cable crunch', 'cableCrunch'),
    b('Rope_Crunch', 'Rope crunch', 'cableCrunch'),
    b('Standing_Rope_Crunch', 'Standing rope crunch', 'cableCrunch', 0.9),
    b('Ab_Crunch_Machine', 'Ab crunch machine', 'cableCrunch'),
  ],
  forearms: [
    b('Palms-Up_Barbell_Wrist_Curl_Over_A_Bench', 'Barbell wrist curl', 'wristCurl'),
    b('Seated_Palm-Up_Barbell_Wrist_Curl', 'Seated barbell wrist curl', 'wristCurl'),
    b('Palms-Down_Wrist_Curl_Over_A_Bench', 'Reverse wrist curl', 'wristCurl', 0.65),
  ],
};

// --- Tiers ---

export const RANK_NAMES = [
  'Bronze III', 'Bronze II', 'Bronze I',
  'Silver III', 'Silver II', 'Silver I',
  'Gold III', 'Gold II', 'Gold I',
  'Platinum III', 'Platinum II', 'Platinum I',
  'Diamond III', 'Diamond II', 'Diamond I',
  'Elite', 'World Class', 'Olympian',
] as const;

export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'elite' | 'worldClass' | 'olympian';

export const TIER_COLORS: Record<RankTier, string> = {
  bronze: '#C98A4B',
  silver: '#C4C7CF',
  gold: '#F2C14E',
  platinum: '#5FD3C6',
  diamond: '#6EA8FF',
  elite: '#B07CFF',
  worldClass: '#FF5C8A',
  olympian: '#FF6A1F',
};

function tierOf(level: number): RankTier {
  if (level < 3) return 'bronze';
  if (level < 6) return 'silver';
  if (level < 9) return 'gold';
  if (level < 12) return 'platinum';
  if (level < 15) return 'diamond';
  return (['elite', 'worldClass', 'olympian'] as const)[level - 15];
}

// The ratio where each of the 18 levels starts, from a lift's standard.
// Bronze → Silver → Gold → Platinum → Diamond start at 0, beginner, novice, intermediate
// and advanced, each split into III/II/I; Elite, World Class and Olympian start at
// elite, 1.2 × elite and 1.4 × elite.
function levelStarts([beginner, novice, intermediate, advanced, elite]: Standard): number[] {
  const bands = [0, beginner, novice, intermediate, advanced, elite];
  const starts: number[] = [];
  for (let band = 0; band < 5; band++) {
    const from = bands[band];
    const to = bands[band + 1];
    for (let division = 0; division < 3; division++) starts.push(from + ((to - from) * division) / 3);
  }
  starts.push(elite, elite * 1.2, elite * 1.4);
  return starts;
}

export type LiftRank = {
  level: number; // 0 (Bronze III) … 17 (Olympian)
  name: (typeof RANK_NAMES)[number];
  tier: RankTier;
  /** 0–1 progress through the current level (1 at Olympian). */
  progress: number;
  /** Estimated 1RM needed for the next level, in the user's unit; null at Olympian. */
  nextAt: number | null;
};

export function rankLift(
  oneRepMax: number,
  bodyWeight: number,
  heightCm: number,
  sex: Sex,
  benchmark: Pick<Benchmark, 'standard' | 'factor'>
): LiftRank {
  const heightScale = (heightCm / REFERENCE_HEIGHT_CM[sex]) ** HEIGHT_EXPONENT;
  const ratio = ((oneRepMax / benchmark.factor) / bodyWeight) * heightScale;
  const starts = levelStarts(STANDARDS[sex][benchmark.standard]);

  let level = 0;
  while (level < starts.length - 1 && ratio >= starts[level + 1]) level++;

  const top = level === starts.length - 1;
  const from = starts[level];
  const to = top ? from : starts[level + 1];
  const progress = top ? 1 : Math.min(1, Math.max(0, (ratio - from) / (to - from)));
  // Invert the ratio formula to get the 1RM that reaches the next level.
  const nextAt = top ? null : ((to * bodyWeight) / heightScale) * benchmark.factor;

  return { level, name: RANK_NAMES[level], tier: tierOf(level), progress, nextAt };
}

export type MuscleStrength =
  | { status: 'needsProfile'; missing: ('sex' | 'height' | 'bodyWeight')[] }
  | { status: 'noLifts'; benchmarks: string[]; benchmark: Benchmark }
  | {
      status: 'ranked';
      rank: LiftRank;
      lift: string;
      benchmark: Benchmark;
      oneRepMax: number;
      bodyWeight: number;
      ratio: number;
    };

export async function getLatestBodyWeight(db: SQLiteDatabase, unit: WeightUnit): Promise<number | null> {
  const weighIns = await listWeighIns(db, unit);
  return weighIns.length > 0 ? weighIns[weighIns.length - 1].weight : null;
}

export async function getMuscleStrength(
  db: SQLiteDatabase,
  muscle: MuscleGroup,
  unit: WeightUnit,
  profile: Profile,
  bodyWeight: number | null
): Promise<MuscleStrength> {
  const missing: ('sex' | 'height' | 'bodyWeight')[] = [];
  if (!profile.sex) missing.push('sex');
  if (!profile.heightCm) missing.push('height');
  if (!bodyWeight) missing.push('bodyWeight');
  if (missing.length > 0 || !profile.sex || !profile.heightCm || !bodyWeight) {
    return { status: 'needsProfile', missing };
  }

  const benchmarks = BENCHMARKS[muscle] ?? [];
  const records = await Promise.all(
    benchmarks.map((bm) =>
      getExerciseRecords(db, bm.id, unit, HIGH_REP_STANDARDS.has(bm.standard) ? HIGH_REP_MAX : undefined)
    )
  );

  let best: Extract<MuscleStrength, { status: 'ranked' }> | null = null;
  benchmarks.forEach((benchmark, index) => {
    const oneRepMax = records[index].bestOneRepMax?.value;
    if (oneRepMax == null) return;
    const rank = rankLift(oneRepMax, bodyWeight, profile.heightCm!, profile.sex!, benchmark);
    if (!best || rank.level > best.rank.level || (rank.level === best.rank.level && rank.progress > best.rank.progress)) {
      best = {
        status: 'ranked',
        rank,
        lift: benchmark.name,
        benchmark,
        oneRepMax,
        bodyWeight,
        ratio: oneRepMax / bodyWeight,
      };
    }
  });

  return (
    best ?? {
      status: 'noLifts',
      benchmarks: [...new Set(benchmarks.map((bm) => bm.name))],
      benchmark: benchmarks[0],
    }
  );
}

export type RankRequirement = {
  level: number;
  name: (typeof RANK_NAMES)[number];
  tier: RankTier;
  /** Estimated 1RM on the benchmark lift where this rank starts, in the user's unit. */
  oneRepMax: number;
  /** The same as a multiple of the user's body weight. */
  ratio: number;
};

// What every rank needs on a benchmark lift for this lifter (the inverse of rankLift).
export function rankRequirements(
  benchmark: Pick<Benchmark, 'standard' | 'factor'>,
  sex: Sex,
  heightCm: number,
  bodyWeight: number
): RankRequirement[] {
  const heightScale = (heightCm / REFERENCE_HEIGHT_CM[sex]) ** HEIGHT_EXPONENT;
  return levelStarts(STANDARDS[sex][benchmark.standard]).map((start, level) => {
    const oneRepMax = ((start * bodyWeight) / heightScale) * benchmark.factor;
    return {
      level,
      name: RANK_NAMES[level],
      tier: tierOf(level),
      oneRepMax,
      ratio: oneRepMax / bodyWeight,
    };
  });
}
