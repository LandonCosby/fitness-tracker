import { FontSize, FontWeight, Space } from '@/constants/Design';
import { Link, router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import EmptyState from '@/components/EmptyState';
import { CardListSkeleton } from '@/components/ScreenSkeletons';
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

  if (!data) return <CardListSkeleton />;

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
            <EmptyState
              compact
              icon={{ ios: 'dumbbell.fill', material: 'fitness_center' }}
              title="No workouts yet"
              message="Build a routine once and start it in one tap, or begin from a prebuilt plan like Push/Pull/Legs."
              actionLabel="Create a workout"
              onAction={() => router.push('/workout-form')}
            />
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
          <EmptyState
            compact
            icon={{ ios: 'clock.arrow.circlepath', material: 'history' }}
            title="No finished workouts yet"
            message="Every workout you finish is saved here with its sets, time and records."
          />
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
    padding: Space.lg,
    paddingTop: Space.xs,
    gap: Space.xl,
    paddingBottom: Space.bottom,
  },
  pressed: {
    opacity: 0.7,
  },
  quickStart: {
    gap: Space.sm,
  },
  eyebrow: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  section: {
    gap: Space.md,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  workoutText: {
    flex: 1,
    gap: Space.xs,
  },
  cardTitle: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.heavy,
  },
  cardDetail: {
    fontSize: FontSize.caption,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
    marginTop: Space.xs,
  },
  tag: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    borderRadius: 6,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    overflow: 'hidden',
  },
  historyCard: {
    gap: Space.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: Space.sm,
  },
  historyName: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.bold,
    flex: 1,
  },
  historyDate: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
  },
  historyStats: {
    flexDirection: 'row',
    gap: Space.lg,
  },
  historyStat: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
  },
});
