import { feedback } from '@/hooks/useFeedback';
import { FontSize, FontWeight, Space } from '@/constants/Design';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import EmptyState from '@/components/EmptyState';
import ModalScreen from '@/components/ModalScreen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Button, Card } from '@/components/ui';
import { sessionHref } from '@/components/WorkoutWidgets';
import { MUSCLE_LABELS } from '@/db/exerciseTags';
import { getActiveSession, startSession } from '@/db/sessions';
import { listWorkouts, type WorkoutListItem } from '@/db/workouts';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { formatDay } from '@/lib/format';

// Opened by Home's "Start workout": pick one of your workouts (or an empty one) to begin.
export default function StartWorkoutScreen() {
  const db = useSQLiteContext();
  const { unit } = useWeightUnit();
  const [workouts, setWorkouts] = useState<WorkoutListItem[] | null>(null);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listWorkouts(db).then((rows) => {
        if (!cancelled) setWorkouts(rows);
      });
      return () => {
        cancelled = true;
      };
    }, [db])
  );

  const start = async (workoutId: string | null) => {
    if (starting) return;
    setStarting(true);
    try {
      // Home only opens this screen when nothing is running, but check again to be safe.
      feedback('medium');
      const active = await getActiveSession(db);
      const sessionId = active?.id ?? (await startSession(db, workoutId, unit));
      router.back();
      router.push(sessionHref(sessionId));
    } finally {
      setStarting(false);
    }
  };

  // Most recently done first; never-done workouts after, alphabetically (listWorkouts order).
  const sorted = [...(workouts ?? [])].sort(
    (a, b) => (b.lastPerformedAt ?? 0) - (a.lastPerformedAt ?? 0)
  );

  return (
    <ModalScreen title="Start a workout">
      <ScrollView contentContainerStyle={styles.content}>
        {workouts && workouts.length === 0 && (
          <Card>
            <EmptyState
              compact
              icon={{ ios: 'list.bullet.clipboard', material: 'assignment' }}
              title="No saved workouts yet"
              message="Create one, or start from a prebuilt Push/Pull/Legs, Upper/Lower or Full body plan."
              actionLabel="Create a workout"
              onAction={() => router.replace('/workout-form')}
            />
          </Card>
        )}

        {sorted.map((workout) => (
          <WorkoutOption
            key={workout.id}
            workout={workout}
            disabled={starting || workout.exerciseCount === 0}
            onPress={() => start(workout.id)}
          />
        ))}

        <View style={styles.footer}>
          <Button
            label="Start an empty workout"
            variant="secondary"
            onPress={() => start(null)}
            disabled={starting}
          />
          {workouts && workouts.length > 0 && (
            <Button label="+ Create a new workout" variant="soft" onPress={() => router.replace('/workout-form')} />
          )}
        </View>
      </ScrollView>
    </ModalScreen>
  );
}

function WorkoutOption({
  workout,
  disabled,
  onPress,
}: {
  workout: WorkoutListItem;
  disabled: boolean;
  onPress: () => void;
}) {
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');
  const surface = useThemeColor({}, 'cardRaised');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Start ${workout.name}`}
      style={({ pressed }) => [(pressed || disabled) && styles.pressed]}>
      <Card style={styles.option}>
        <View style={styles.optionText}>
          <Text style={styles.name} numberOfLines={1}>
            {workout.name}
          </Text>
          <Text style={[styles.detail, { color: muted }]}>
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
        </View>
        <Text style={[styles.go, { color: tint }]}>Start ›</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Space.lg,
    gap: Space.md,
    paddingBottom: Space.bottom,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  optionText: {
    flex: 1,
    gap: Space.xs,
  },
  name: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.heavy,
  },
  detail: {
    fontSize: FontSize.caption,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
    marginTop: Space.micro,
  },
  tag: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    borderRadius: 6,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    overflow: 'hidden',
  },
  go: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.heavy,
  },
  footer: {
    gap: Space.md,
    marginTop: Space.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
