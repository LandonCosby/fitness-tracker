import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import PressableLink from '@/components/PressableLink';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Button, Card, SectionHeader, TextAction } from '@/components/ui';
import {
  ActiveWorkoutCard,
  WeekStats,
  sessionHref,
  useStartWorkout,
  type ActiveSession,
} from '@/components/WorkoutWidgets';
import { MUSCLE_LABELS } from '@/db/exerciseTags';
import { getActiveSession, listSessionHistory, type SessionSummary } from '@/db/sessions';
import { listWorkouts, type WorkoutListItem } from '@/db/workouts';
import { formatDay, formatDuration } from '@/lib/format';

type ScreenData = {
  active: ActiveSession;
  workouts: WorkoutListItem[];
  history: SessionSummary[];
  loadedAt: number;
};

export default function WorkoutsScreen() {
  const db = useSQLiteContext();
  const [data, setData] = useState<ScreenData | null>(null);
  const { start, starting } = useStartWorkout(data?.active ?? null);
  const muted = useThemeColor({}, 'muted');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getActiveSession(db), listWorkouts(db), listSessionHistory(db)]).then(
        ([active, workouts, history]) => {
          if (!cancelled) setData({ active, workouts, history, loadedAt: Date.now() });
        }
      );
      return () => {
        cancelled = true;
      };
    }, [db])
  );

  if (!data) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {data.active ? (
        <ActiveWorkoutCard session={data.active} />
      ) : (
        <View style={styles.quickStart}>
          <Text style={[styles.eyebrow, { color: muted }]}>QUICK START</Text>
          <Button label="Start an empty workout" onPress={() => start(null)} disabled={starting} />
        </View>
      )}

      <WeekStats history={data.history} now={data.loadedAt} />

      <View style={styles.section}>
        <SectionHeader
          title="My workouts"
          action={
            <Link href="/workout-form" asChild>
              <TextAction label="+ New" accessibilityLabel="New workout" />
            </Link>
          }
        />
        {data.workouts.length === 0 ? (
          <Card>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={[styles.empty, { color: muted }]}>
              Build a routine once and start it in one tap: pick body parts, add exercises, and set
              sets × reps.
            </Text>
            <Link href="/workout-form" asChild>
              <Button label="Create a workout" variant="soft" compact />
            </Link>
          </Card>
        ) : (
          data.workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} onStart={() => start(workout.id)} />
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="History" />
        {data.history.length === 0 ? (
          <Text style={[styles.empty, { color: muted }]}>Finished workouts will show up here.</Text>
        ) : (
          data.history.map((session) => <HistoryCard key={session.id} session={session} />)
        )}
      </View>
    </ScrollView>
  );
}

function WorkoutCard({ workout, onStart }: { workout: WorkoutListItem; onStart: () => void }) {
  const muted = useThemeColor({}, 'muted');
  const surface = useThemeColor({}, 'cardRaised');

  return (
    <Card style={styles.workoutCard}>
      <PressableLink
        href={{ pathname: '/workout-form', params: { id: workout.id } }}
        accessibilityLabel={`Edit ${workout.name}`}
        style={({ pressed }) => [styles.workoutText, pressed && styles.pressed]}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {workout.name}
          </Text>
          <Text style={[styles.cardDetail, { color: muted }]}>
            {workout.exerciseCount} {workout.exerciseCount === 1 ? 'exercise' : 'exercises'} ·{' '}
            {workout.lastPerformedAt ? `Last done ${formatDay(workout.lastPerformedAt)}` : 'Not done yet'}
          </Text>
          {workout.muscleGroups.length > 0 && (
            <View style={styles.tags}>
              {workout.muscleGroups.map((m) => (
                <Text key={m} style={[styles.tag, { backgroundColor: surface, color: muted }]}>
                  {MUSCLE_LABELS[m]}
                </Text>
              ))}
            </View>
          )}
      </PressableLink>
      <Button
        label="Start"
        compact
        onPress={onStart}
        disabled={workout.exerciseCount === 0}
        accessibilityLabel={`Start ${workout.name}`}
      />
    </Card>
  );
}

function HistoryCard({ session }: { session: SessionSummary }) {
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

  return (
    <PressableLink href={sessionHref(session.id)} style={({ pressed }) => pressed && styles.pressed}>
        <Card style={styles.historyCard}>
          {/* Duration and set count in the accent color, like a workout receipt. */}
          <View style={styles.historyHeader}>
            <Text style={styles.historyName} numberOfLines={1}>
              {session.name}
            </Text>
            <Text style={[styles.historyDate, { color: muted }]}>{formatDay(session.startedAt)}</Text>
          </View>
          <View style={styles.historyStats}>
            <Text style={[styles.historyStat, { color: tint }]}>
              {formatDuration(session.endedAt - session.startedAt)}
            </Text>
            <Text style={[styles.historyStat, { color: tint }]}>
              {session.setCount} {session.setCount === 1 ? 'set' : 'sets'}
            </Text>
          </View>
          {session.exerciseNames.length > 0 && (
            <Text style={[styles.cardDetail, { color: muted }]} numberOfLines={2}>
              {session.exerciseNames.join(' · ')}
            </Text>
          )}
        </Card>
    </PressableLink>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 4,
    gap: 24,
    paddingBottom: 40,
  },
  pressed: {
    opacity: 0.7,
  },
  quickStart: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  section: {
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  workoutText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardDetail: {
    fontSize: 13,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tag: {
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  historyCard: {
    gap: 6,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  historyName: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '500',
  },
  historyStats: {
    flexDirection: 'row',
    gap: 14,
  },
  historyStat: {
    fontSize: 13,
    fontWeight: '700',
  },
});
