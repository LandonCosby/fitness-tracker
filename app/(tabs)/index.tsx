import { Link, router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import Elapsed from '@/components/Elapsed';
import { Text, View, useThemeColor } from '@/components/Themed';
import { MUSCLE_LABELS } from '@/db/exerciseTags';
import {
  getActiveSession,
  listSessionHistory,
  startSession,
  type SessionSummary,
} from '@/db/sessions';
import { listWorkouts, type WorkoutListItem } from '@/db/workouts';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { formatDay, formatDuration } from '@/lib/format';

type ActiveSession = Awaited<ReturnType<typeof getActiveSession>>;

const sessionHref = (id: string) => ({ pathname: '/session/[id]' as const, params: { id } });

type ScreenData = {
  active: ActiveSession;
  workouts: WorkoutListItem[];
  history: SessionSummary[];
};

export default function WorkoutsScreen() {
  const db = useSQLiteContext();
  const { unit } = useWeightUnit();
  const [data, setData] = useState<ScreenData | null>(null);
  const [starting, setStarting] = useState(false);
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getActiveSession(db), listWorkouts(db), listSessionHistory(db)]).then(
        ([active, workouts, history]) => {
          if (!cancelled) setData({ active, workouts, history });
        }
      );
      return () => {
        cancelled = true;
      };
    }, [db])
  );

  if (!data) return <View style={styles.container} />;

  const start = async (workoutId: string | null) => {
    if (data.active) {
      const activeId = data.active.id;
      Alert.alert('Workout in progress', 'Finish or discard it before starting another.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resume', onPress: () => router.push(sessionHref(activeId)) },
      ]);
      return;
    }
    if (starting) return;
    setStarting(true);
    try {
      const sessionId = await startSession(db, workoutId, unit);
      router.push(sessionHref(sessionId));
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {data.active ? (
        <Link href={sessionHref(data.active.id)} asChild>
          <Pressable
            style={({ pressed }) => [
              styles.activeCard,
              { backgroundColor: tint },
              pressed && styles.pressed,
            ]}>
            <View style={styles.transparent}>
              <Text style={[styles.activeLabel, { color: background }]}>Workout in progress</Text>
              <Text style={[styles.activeName, { color: background }]}>{data.active.name}</Text>
            </View>
            <Text style={[styles.activeTime, { color: background }]}>
              <Elapsed since={data.active.startedAt} />
            </Text>
            <Text style={[styles.activeResume, { color: background }]}>Resume ›</Text>
          </Pressable>
        </Link>
      ) : (
        <Pressable
          onPress={() => start(null)}
          disabled={starting}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: tint },
            (pressed || starting) && styles.pressed,
          ]}>
          <Text style={[styles.primaryLabel, { color: background }]}>Start empty workout</Text>
        </Pressable>
      )}

      <Section
        title="My workouts"
        action={
          <Link href="/workout-form" asChild>
            <Pressable hitSlop={8}>
              <Text style={{ color: tint }}>+ New</Text>
            </Pressable>
          </Link>
        }>
        {data.workouts.length === 0 ? (
          <Text style={[styles.empty, { color: muted }]}>
            Create a workout to reuse it: pick body parts, add exercises, and set sets × reps.
          </Text>
        ) : (
          data.workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} onStart={() => start(workout.id)} />
          ))
        )}
      </Section>

      <Section title="History">
        {data.history.length === 0 ? (
          <Text style={[styles.empty, { color: muted }]}>Finished workouts will show up here.</Text>
        ) : (
          data.history.map((session) => <HistoryRow key={session.id} session={session} />)
        )}
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

function WorkoutCard({ workout, onStart }: { workout: WorkoutListItem; onStart: () => void }) {
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');

  const details = [
    `${workout.exerciseCount} ${workout.exerciseCount === 1 ? 'exercise' : 'exercises'}`,
    workout.lastPerformedAt ? `Last done ${formatDay(workout.lastPerformedAt)}` : 'Not done yet',
  ];

  return (
    <View style={[styles.card, { borderColor: border }]}>
      <Link href={{ pathname: '/workout-form', params: { id: workout.id } }} asChild>
        <Pressable style={({ pressed }) => [styles.cardText, pressed && styles.pressed]}>
          <Text style={styles.cardTitle}>{workout.name}</Text>
          {workout.muscleGroups.length > 0 && (
            <Text style={[styles.cardDetail, { color: muted }]} numberOfLines={1}>
              {workout.muscleGroups.map((m) => MUSCLE_LABELS[m]).join(', ')}
            </Text>
          )}
          <Text style={[styles.cardDetail, { color: muted }]}>{details.join(' · ')}</Text>
        </Pressable>
      </Link>
      <Pressable
        onPress={onStart}
        disabled={workout.exerciseCount === 0}
        accessibilityLabel={`Start ${workout.name}`}
        style={({ pressed }) => [
          styles.startButton,
          { backgroundColor: tint },
          (pressed || workout.exerciseCount === 0) && styles.pressed,
        ]}>
        <Text style={[styles.startLabel, { color: background }]}>Start</Text>
      </Pressable>
    </View>
  );
}

function HistoryRow({ session }: { session: SessionSummary }) {
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');

  return (
    <Link href={sessionHref(session.id)} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.historyRow,
          { borderBottomColor: border },
          pressed && styles.pressed,
        ]}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyName}>{session.name}</Text>
          <Text style={[styles.historyDate, { color: muted }]}>{formatDay(session.startedAt)}</Text>
        </View>
        <Text style={[styles.cardDetail, { color: muted }]}>
          {formatDuration(session.endedAt - session.startedAt)} · {session.setCount}{' '}
          {session.setCount === 1 ? 'set' : 'sets'}
        </Text>
        {session.exerciseNames.length > 0 && (
          <Text style={[styles.cardDetail, { color: muted }]} numberOfLines={1}>
            {session.exerciseNames.join(', ')}
          </Text>
        )}
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
    gap: 24,
    paddingBottom: 40,
  },
  transparent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.6,
  },
  activeCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeLabel: {
    fontSize: 13,
    opacity: 0.85,
  },
  activeName: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeTime: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  activeResume: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  empty: {
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  cardDetail: {
    fontSize: 13,
  },
  startButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  startLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  historyRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: 'transparent',
  },
  historyName: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
  },
});
