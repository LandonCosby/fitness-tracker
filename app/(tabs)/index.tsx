import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import BodyMap from '@/components/body/BodyMap';
import {
  RECOVERY_WINDOW_DAYS,
  RecoveryLegend,
  recoveryAmount,
  recoveryColor,
  recoveryFills,
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

  if (!data) return <View style={styles.container} />;

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

  const trained = Object.values(recovery)
    .filter((r): r is MuscleRecovery & { lastTrainedAt: number } => r.lastTrainedAt != null)
    .sort((a, b) => b.lastTrainedAt - a.lastTrainedAt);
  const fresh = Object.values(recovery).filter((r) => r.lastTrainedAt == null);

  const label =
    trained.length === 0
      ? 'Body diagram: every muscle is fresh.'
      : `Body diagram. ${trained.map((r) => `${MUSCLE_LABELS[r.muscle]} trained ${trainedAgo(r.lastTrainedAt, now)}`).join('. ')}.`;

  return (
    <Card style={styles.recovery}>
      <BodyMap fills={recoveryFills(recovery, now)} height={230} accessibilityLabel={label} />
      <RecoveryLegend />
      {trained.length > 0 ? (
        <View style={styles.muscleList}>
          {trained.map((r) => (
            <View key={r.muscle} style={[styles.muscleChip, { backgroundColor: surface }]}>
              <View
                style={[styles.dot, { backgroundColor: recoveryColor(recoveryAmount(r.lastTrainedAt, now)) }]}
              />
              <Text style={styles.muscleName}>{MUSCLE_LABELS[r.muscle]}</Text>
              <Text style={[styles.muscleAgo, { color: muted }]}>{trainedAgo(r.lastTrainedAt, now)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[styles.hint, { color: muted }]}>
          No workouts in the last 7 days. Every muscle is fresh and ready to go.
        </Text>
      )}
      {trained.length > 0 && fresh.length > 0 && (
        <Text style={[styles.hint, { color: muted }]}>
          Fresh: {fresh.map((r) => MUSCLE_LABELS[r.muscle]).join(', ')}
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 4,
    gap: 18,
    paddingBottom: 40,
  },
  pressed: {
    opacity: 0.7,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: -6,
  },
  streaks: {
    flexDirection: 'row',
    gap: 10,
  },
  streakPressable: {
    flex: 1,
  },
  streakCard: {
    flex: 1,
    gap: 6,
    padding: 14,
  },
  streakTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  streakValue: {
    fontSize: 30,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  streakUnit: {
    fontSize: 15,
    fontWeight: '700',
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
    fontSize: 12,
  },
  section: {
    gap: 10,
  },
  recovery: {
    gap: 14,
  },
  muscleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  muscleName: {
    fontSize: 13,
    fontWeight: '700',
  },
  muscleAgo: {
    fontSize: 12,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
