import { FontSize, FontWeight, Radius, Space } from '@/constants/Design';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { HomeSkeleton } from '@/components/ScreenSkeletons';
import BodyMap from '@/components/body/BodyMap';
import {
  RECOVERY_WINDOW_DAYS,
  RecoveryLegend,
  recoveryAmount,
  recoveryColor,
  recoveryFills,
  readyIn,
  trainedAgo,
} from '@/components/body/recovery';
import PressableLink from '@/components/PressableLink';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Button, Card, SectionHeader } from '@/components/ui';
import {
  ActiveWorkoutCard,
  WeekStats,

  type ActiveSession,
} from '@/components/WorkoutWidgets';
import { MUSCLE_LABELS, type MuscleGroup } from '@/db/exerciseTags';
import { getMuscleRecovery, type MuscleRecovery } from '@/db/muscles';
import { getProfile } from '@/db/profile';
import { getActiveSession, listSessionHistory, type SessionSummary } from '@/db/sessions';
import { getFoodStreak, getWorkoutGoalStreak, type WorkoutGoalStreak } from '@/db/streaks';

type HomeData = {
  active: ActiveSession;
  history: SessionSummary[];
  recovery: Record<MuscleGroup, MuscleRecovery>;
  food: { days: number; loggedToday: boolean };
  workouts: WorkoutGoalStreak;
  loadedAt: number;
};

export default function HomeScreen() {
  const db = useSQLiteContext();
  const [data, setData] = useState<HomeData | null>(null);
  const muted = useThemeColor({}, 'muted');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const loadedAt = Date.now();
        const profile = await getProfile(db);
        const [active, history, recovery, food, workouts] = await Promise.all([
          getActiveSession(db),
          listSessionHistory(db),
          getMuscleRecovery(db, RECOVERY_WINDOW_DAYS, loadedAt),
          getFoodStreak(db),
          getWorkoutGoalStreak(db, profile.weeklyWorkoutGoal, loadedAt),
        ]);
        if (!cancelled) setData({ active, history, recovery, food, workouts, loadedAt });
      })();
      return () => {
        cancelled = true;
      };
    }, [db])
  );

  if (!data) return <HomeSkeleton />;

  const today = new Date(data.loadedAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.eyebrow, { color: muted }]}>{today.toUpperCase()}</Text>

      {data.active ? (
        <ActiveWorkoutCard session={data.active} />
      ) : (
        <Button label="Start workout" onPress={() => router.push('/start-workout')} />
      )}

      <View style={styles.streaks}>
        <StreakCard
          icon={{ ios: 'flame.fill', material: 'local_fire_department' }}
          value={data.food.days}
          unit={data.food.days === 1 ? 'day' : 'days'}
          label="Food logged"
          detail={data.food.loggedToday ? 'Logged today' : 'Log today to keep it going'}
          href="/nutrition"
        />
        <StreakCard
          icon={{ ios: 'target', material: 'track_changes' }}
          value={data.workouts.weeks}
          unit={data.workouts.weeks === 1 ? 'week' : 'weeks'}
          label={`${data.workouts.goal}× a week goal`}
          detail={`This week ${Math.min(data.workouts.thisWeek, 99)}/${data.workouts.goal}`}
          progress={Math.min(1, data.workouts.thisWeek / data.workouts.goal)}
          href="/settings"
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Last 7 days" />
        <WeekStats history={data.history} now={data.loadedAt} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Muscle recovery" />
        <RecoveryCard recovery={data.recovery} now={data.loadedAt} />
      </View>
    </ScrollView>
  );
}

function StreakCard({
  icon,
  value,
  unit,
  label,
  detail,
  progress,
  href,
}: {
  icon: { ios: string; material: string };
  value: number;
  unit: string;
  label: string;
  detail: string;
  progress?: number;
  href: '/nutrition' | '/settings';
}) {
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');
  const track = useThemeColor({}, 'cardRaised');
  const idle = useThemeColor({}, 'bodyIdle');

  return (
    <PressableLink
      href={href}
      accessibilityLabel={`${label}: ${value} ${unit} streak. ${detail}`}
      style={({ pressed }) => [styles.streakPressable, pressed && styles.pressed]}>
      <Card style={styles.streakCard}>
        <View style={styles.streakTop}>
          <SymbolView
            name={{ ios: icon.ios as any, android: icon.material as any, web: icon.material as any }}
            size={20}
            tintColor={value > 0 ? tint : idle}
          />
          <Text style={[styles.streakLabel, { color: muted }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text style={styles.streakValue}>
          {value}
          <Text style={[styles.streakUnit, { color: muted }]}> {unit}</Text>
        </Text>
        {progress != null && (
          <View style={[styles.streakTrack, { backgroundColor: track }]}>
            <View style={[styles.streakFill, { width: `${progress * 100}%`, backgroundColor: tint }]} />
          </View>
        )}
        <Text style={[styles.streakDetail, { color: muted }]} numberOfLines={1}>
          {detail}
        </Text>
      </Card>
    </PressableLink>
  );
}

function RecoveryCard({ recovery, now }: { recovery: Record<MuscleGroup, MuscleRecovery>; now: number }) {
  const muted = useThemeColor({}, 'muted');
  const surface = useThemeColor({}, 'cardRaised');

  // Still recovering: trained within that muscle's recovery time (most recent first).
  const recovering = Object.values(recovery)
    .filter(
      (r): r is MuscleRecovery & { lastTrainedAt: number } =>
        r.lastTrainedAt != null && recoveryAmount(r.lastTrainedAt, now, r.muscle) < 1
    )
    .sort((a, b) => b.lastTrainedAt - a.lastTrainedAt);
  const ready = Object.values(recovery).filter(
    (r) => r.lastTrainedAt == null || recoveryAmount(r.lastTrainedAt, now, r.muscle) >= 1
  );

  const label =
    recovering.length === 0
      ? 'Body diagram: every muscle is recovered.'
      : `Body diagram. ${recovering
          .map((r) => `${MUSCLE_LABELS[r.muscle]} trained ${trainedAgo(r.lastTrainedAt, now)}, ${readyIn(r.lastTrainedAt, now, r.muscle)}`)
          .join('. ')}.`;

  return (
    <Card style={styles.recovery}>
      <BodyMap fills={recoveryFills(recovery, now)} height={230} accessibilityLabel={label} />
      <RecoveryLegend />
      {recovering.length > 0 ? (
        <View style={styles.muscleGroup}>
          <Text style={[styles.groupLabel, { color: muted }]}>RECOVERING</Text>
          <View style={styles.muscleList}>
            {recovering.map((r) => (
              <View key={r.muscle} style={[styles.muscleChip, { backgroundColor: surface }]}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: recoveryColor(recoveryAmount(r.lastTrainedAt, now, r.muscle)) },
                  ]}
                />
                <Text style={styles.muscleName}>{MUSCLE_LABELS[r.muscle]}</Text>
                <Text style={[styles.muscleAgo, { color: muted }]}>
                  {readyIn(r.lastTrainedAt, now, r.muscle)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={[styles.hint, { color: muted }]}>
          Every muscle is recovered and ready to train.
        </Text>
      )}
      {recovering.length > 0 && ready.length > 0 && (
        <Text style={[styles.hint, { color: muted }]}>
          Ready to train: {ready.map((r) => MUSCLE_LABELS[r.muscle]).join(', ')}
        </Text>
      )}
      <Text style={[styles.footnote, { color: muted }]}>
        Recovery times follow resistance-training studies: about 72 h for chest, back and legs, 48
        h for shoulders and arms, 36 h for calves, abs and forearms. Training to failure can take
        longer.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Space.lg,
    paddingTop: Space.xs,
    gap: Space.lg,
    paddingBottom: Space.bottom,
  },
  pressed: {
    opacity: 0.7,
  },
  eyebrow: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginBottom: -6,
  },
  streaks: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: Space.md,
  },
  streakPressable: {
    flex: 1,
    minWidth: 150,
  },
  streakCard: {
    flex: 1,
    gap: Space.sm,
    padding: Space.lg,
  },
  streakTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  streakLabel: {
    flex: 1,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
  },
  streakValue: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.heavy,
    fontVariant: ['tabular-nums'],
  },
  streakUnit: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  streakTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  streakFill: {
    height: 5,
    borderRadius: 3,
  },
  streakDetail: {
    fontSize: FontSize.caption,
  },
  section: {
    gap: Space.md,
  },
  recovery: {
    gap: Space.lg,
  },
  muscleGroup: {
    gap: Space.sm,
  },
  groupLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  footnote: {
    fontSize: FontSize.caption,
    lineHeight: 15,
  },
  muscleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  muscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  muscleName: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
  },
  muscleAgo: {
    fontSize: FontSize.caption,
  },
  hint: {
    fontSize: FontSize.caption,
    lineHeight: 18,
  },
});
