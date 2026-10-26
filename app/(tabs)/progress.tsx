import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import Chip from '@/components/Chip';
import RecordTiles, { formatRecord, recordKindsFor } from '@/components/RecordTiles';
import { Text, View, useThemeColor } from '@/components/Themed';
import BarChart from '@/components/charts/BarChart';
import { ChartWithData } from '@/components/charts/ChartFrame';
import LineChart from '@/components/charts/LineChart';
import { listWeighIns, type WeighIn } from '@/db/bodyWeight';
import { getExercise } from '@/db/exercises';
import {
  getDailyNutrition,
  getExerciseProgress,
  getExerciseRecords,
  getFirstSessionTime,
  getMostRecentExerciseId,
  getWeeklyTraining,
  listRecords,
  type DayNutrition,
  type ExerciseRecords,
  type ProgressSeries,
  type RecordsListItem,
  type WeekTraining,
} from '@/db/progress';
import { fromDateKey, toDateKey } from '@/db/records';
import { getNutritionTargets, type NutritionTargets } from '@/db/settings';
import { formatWeight } from '@/db/units';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { openExercisePicker } from '@/lib/exercisePicker';
import { formatCalories, formatDay, formatNumber, formatSeconds, formatShortDate } from '@/lib/format';

const DAY = 86400000;
const WEEK = 7 * DAY;
const MAX_WEEKS = 52;

const RANGES = [
  { key: '1M', days: 30 },
  { key: '3M', days: 91 },
  { key: '6M', days: 182 },
  { key: '1Y', days: 365 },
  { key: 'All', days: null },
] as const;

type RangeKey = (typeof RANGES)[number]['key'];

type ExerciseView = {
  id: string;
  name: string;
  isTimed: boolean;
  progress: ProgressSeries;
  records: ExerciseRecords;
};

type ScreenData = {
  exercise: ExerciseView | null;
  weekly: WeekTraining[];
  nutrition: DayNutrition[];
  targets: NutritionTargets;
  weighIns: WeighIn[];
  records: RecordsListItem[];
};

const METRIC_TITLES: Record<ProgressSeries['metric'], string> = {
  oneRepMax: 'Best estimated 1-rep max per workout',
  reps: 'Most reps in a set per workout',
  seconds: 'Longest hold per workout',
};

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const { unit } = useWeightUnit();
  const [range, setRange] = useState<RangeKey>('3M');
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [data, setData] = useState<ScreenData | null>(null);
  const [weeklyMetric, setWeeklyMetric] = useState<'workouts' | 'sets'>('workouts');
  const [nutritionMetric, setNutritionMetric] = useState<'calories' | 'protein'>('calories');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const days = RANGES.find((r) => r.key === range)!.days;
      const now = Date.now();
      const since = days != null ? now - days * DAY : undefined;
      const fromDate = since != null ? toDateKey(new Date(since)) : '';

      (async () => {
        const [chosenId, first] = await Promise.all([
          exerciseId ?? getMostRecentExerciseId(db),
          getFirstSessionTime(db),
        ]);
        // Weekly bars: the range, or everything up to a year for "All".
        const weeklySince = Math.max(since ?? first ?? now, now - (MAX_WEEKS - 1) * WEEK);

        const [exercise, weekly, nutrition, targets, weighIns, records] = await Promise.all([
          chosenId ? getExercise(db, chosenId) : null,
          getWeeklyTraining(db, weeklySince, now),
          getDailyNutrition(db, fromDate),
          getNutritionTargets(db),
          listWeighIns(db, unit, fromDate),
          listRecords(db, unit, 10),
        ]);

        let exerciseView: ExerciseView | null = null;
        if (exercise) {
          const [progress, exerciseRecords] = await Promise.all([
            getExerciseProgress(db, exercise.id, exercise.isTimed, unit, since),
            getExerciseRecords(db, exercise.id, unit),
          ]);
          exerciseView = {
            id: exercise.id,
            name: exercise.name,
            isTimed: exercise.isTimed,
            progress,
            records: exerciseRecords,
          };
        }

        if (!cancelled) {
          setData({ exercise: exerciseView, weekly, nutrition, targets, weighIns, records });
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [db, unit, range, exerciseId])
  );

  const chooseExercise = () => {
    openExercisePicker(([id]) => id && setExerciseId(id), { single: true });
  };

  if (!data) return <View style={styles.container} />;

  const exercise = data.exercise;
  const formatProgress = (y: number) =>
    exercise?.progress.metric === 'seconds'
      ? formatSeconds(Math.round(y))
      : exercise?.progress.metric === 'reps'
        ? `${Math.round(y)} reps`
        : formatWeight(y, unit);

  const weeklyBars = data.weekly.map((w) => ({
    x: w.weekStart,
    y: weeklyMetric === 'workouts' ? w.workouts : w.sets,
  }));
  const formatWeekly = (y: number) =>
    weeklyMetric === 'workouts' ? `${y} ${y === 1 ? 'workout' : 'workouts'}` : `${y} ${y === 1 ? 'set' : 'sets'}`;

  const nutritionPoints = data.nutrition.map((d) => ({
    x: d.x,
    y: nutritionMetric === 'calories' ? d.calories : d.proteinG,
  }));
  const nutritionTarget =
    nutritionMetric === 'calories' ? data.targets.calories : data.targets.proteinG;
  const formatNutrition = (y: number) =>
    nutritionMetric === 'calories' ? `${formatCalories(y)} kcal` : `${formatNumber(y)} g protein`;

  const weightPoints = data.weighIns.map((w) => ({ x: fromDateKey(w.date).getTime(), y: w.weight }));
  const weightChange =
    weightPoints.length > 1 ? weightPoints[weightPoints.length - 1].y - weightPoints[0].y : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* One range filter above everything it scopes. */}
      <View style={styles.ranges} accessibilityRole="radiogroup">
        {RANGES.map((r) => (
          <Chip key={r.key} label={r.key} selected={range === r.key} onPress={() => setRange(r.key)} />
        ))}
      </View>

      <Section
        title="Exercise progress"
        subtitle={exercise ? METRIC_TITLES[exercise.progress.metric] : undefined}>
        <Pressable
          onPress={chooseExercise}
          style={({ pressed }) => [styles.picker, { borderColor: tint }, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={exercise ? `Exercise: ${exercise.name}. Change` : 'Choose an exercise'}>
          <Text style={styles.pickerLabel} numberOfLines={1}>
            {exercise?.name ?? 'Choose an exercise'}
          </Text>
          <Text style={{ color: tint }}>Change</Text>
        </Pressable>
        {exercise && (
          <>
            <ChartWithData
              rows={exercise.progress.points.map((p) => ({
                label: formatShortDate(p.x),
                value: formatProgress(p.y),
              }))}>
              <LineChart
                points={exercise.progress.points}
                formatValue={formatProgress}
                formatX={formatShortDate}
                emptyText="No workouts with this exercise in this range."
                accessibilityLabel={`${exercise.name}: ${METRIC_TITLES[exercise.progress.metric]}`}
              />
            </ChartWithData>
            <RecordTiles records={exercise.records} isTimed={exercise.isTimed} unit={unit} />
          </>
        )}
        {!exercise && (
          <Text style={[styles.empty, { color: muted }]}>
            Finish a workout to see your progress here.
          </Text>
        )}
      </Section>

      <Section
        title="Weekly training"
        action={
          <Toggle
            options={[
              ['workouts', 'Workouts'],
              ['sets', 'Sets'],
            ]}
            value={weeklyMetric}
            onChange={setWeeklyMetric}
          />
        }>
        <ChartWithData
          rows={weeklyBars.map((b) => ({ label: `Week of ${formatShortDate(b.x)}`, value: formatWeekly(b.y) }))}>
          <BarChart
            bars={weeklyBars}
            formatValue={formatWeekly}
            formatX={(x) => `Week of ${formatShortDate(x)}`}
            emptyText="No finished workouts in this range."
            accessibilityLabel={`${weeklyMetric === 'workouts' ? 'Workouts' : 'Sets'} per week`}
          />
        </ChartWithData>
      </Section>

      <Section
        title="Nutrition"
        subtitle="Daily total. Days with nothing logged are skipped."
        action={
          <Toggle
            options={[
              ['calories', 'Calories'],
              ['protein', 'Protein'],
            ]}
            value={nutritionMetric}
            onChange={setNutritionMetric}
          />
        }>
        <ChartWithData
          rows={nutritionPoints.map((p) => ({ label: formatShortDate(p.x), value: formatNutrition(p.y) }))}>
          <LineChart
            points={nutritionPoints}
            formatValue={formatNutrition}
            formatX={formatShortDate}
            reference={
              nutritionTarget != null
                ? {
                    y: nutritionTarget,
                    label: `Target ${nutritionMetric === 'calories' ? formatCalories(nutritionTarget) : `${formatNumber(nutritionTarget)} g`}`,
                  }
                : undefined
            }
            zeroBased
            breakGapMs={1.5 * DAY}
            emptyText="No food logged in this range."
            accessibilityLabel={nutritionMetric === 'calories' ? 'Calories per day' : 'Protein per day'}
          />
        </ChartWithData>
      </Section>

      <Section
        title="Body weight"
        subtitle={
          weightChange != null
            ? `${weightChange > 0 ? '+' : weightChange < 0 ? '−' : '±'}${formatWeight(Math.abs(weightChange), unit)} since ${formatShortDate(weightPoints[0].x)}`
            : undefined
        }
        action={
          <Link href="/weigh-in" asChild>
            <Pressable hitSlop={8}>
              <Text style={{ color: tint }}>+ Log weight</Text>
            </Pressable>
          </Link>
        }>
        <ChartWithData
          rows={weightPoints.map((p) => ({ label: formatShortDate(p.x), value: formatWeight(p.y, unit) }))}>
          <LineChart
            points={weightPoints}
            formatValue={(y) => formatWeight(y, unit)}
            formatX={formatShortDate}
            emptyText="Log your weight to see the trend."
            accessibilityLabel="Body weight"
          />
        </ChartWithData>
      </Section>

      <Section title="Personal records" subtitle="Most recently trained first. Tap for details.">
        {data.records.length === 0 ? (
          <Text style={[styles.empty, { color: muted }]}>Records appear after your first workout.</Text>
        ) : (
          data.records.map((item) => <RecordRow key={item.exerciseId} item={item} />)
        )}
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const muted = useThemeColor({}, 'muted');
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {subtitle && <Text style={[styles.subtitle, { color: muted }]}>{subtitle}</Text>}
      {children}
    </View>
  );
}

function Toggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.toggle} accessibilityRole="radiogroup">
      {options.map(([key, label]) => (
        <Chip key={key} label={label} selected={value === key} onPress={() => onChange(key)} />
      ))}
    </View>
  );
}

function RecordRow({ item }: { item: RecordsListItem }) {
  const { unit } = useWeightUnit();
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');
  // Headline: the first record type that applies (1RM-capable lifts lead with heaviest).
  const [kind] = recordKindsFor(item.isTimed, item.records);
  const headline = formatRecord(kind, item.records, unit);
  const oneRepMax = !item.isTimed ? formatRecord('bestOneRepMax', item.records, unit) : null;

  return (
    <Link href={{ pathname: '/exercise/[id]', params: { id: item.exerciseId } }} asChild>
      <Pressable
        style={({ pressed }) => [styles.recordRow, { borderBottomColor: border }, pressed && styles.pressed]}>
        <View style={styles.recordText}>
          <Text style={styles.recordName}>{item.name}</Text>
          <Text style={[styles.recordDetail, { color: muted }]}>
            Last trained {formatDay(item.lastPerformedAt)}
          </Text>
        </View>
        <View style={styles.recordValues}>
          <Text style={styles.recordValue}>{headline ?? '—'}</Text>
          {oneRepMax && kind !== 'bestOneRepMax' && (
            <Text style={[styles.recordDetail, { color: muted }]}>1RM ≈ {oneRepMax}</Text>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 28,
    paddingBottom: 40,
  },
  ranges: {
    flexDirection: 'row',
    gap: 8,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: -6,
  },
  toggle: {
    flexDirection: 'row',
    gap: 6,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  empty: {
    fontSize: 14,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recordText: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  recordName: {
    fontSize: 16,
  },
  recordDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  recordValues: {
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
  },
  recordValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
