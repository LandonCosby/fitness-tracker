import HeaderAction from '@/components/HeaderAction';
import { FontSize, FontWeight, Radius, Space } from '@/constants/Design';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { MotionRow } from '@/components/Motion';
import { feedback } from '@/hooks/useFeedback';
import { Link, Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { showAlert } from '@/components/AlertSheet';
import { SessionSkeleton } from '@/components/ScreenSkeletons';
import Elapsed from '@/components/Elapsed';
import IconButton from '@/components/IconButton';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import { Button, Card } from '@/components/ui';
import {
  addExercisesToSession,
  addSet,
  countUnfinishedSets,
  deleteSession,
  deleteSet,
  finishSession,
  getSession,
  removeSessionExercise,
  setSetCompleted,
  updateSet,
  type LoggedSet,
  type SessionDetail,
  type SessionExerciseDetail,
  type SetValues,
} from '@/db/sessions';
import { convertWeight, type WeightUnit } from '@/db/units';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { openExercisePicker } from '@/lib/exercisePicker';
import { formatDay, formatDuration, formatSet, formatTime } from '@/lib/format';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { unit } = useWeightUnit();
  // undefined while loading, null if it doesn't exist (or was deleted).
  const [session, setSession] = useState<SessionDetail | null | undefined>(undefined);
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');

  const reload = useCallback(async () => {
    setSession(await getSession(db, id));
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getSession(db, id).then((row) => {
        if (!cancelled) setSession(row);
      });
      return () => {
        cancelled = true;
      };
    }, [db, id])
  );

  if (session === undefined) return <SessionSkeleton />;

  if (session === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <Text style={{ color: muted }}>This workout no longer exists.</Text>
      </View>
    );
  }

  const active = session.endedAt == null;
  const allSets = session.exercises.flatMap((e) => e.sets);
  const totalSets = allSets.length;
  // Finished workouts only keep completed sets.
  const doneSets = active ? allSets.filter((s) => s.completed).length : totalSets;

  const discard = () => {
    showAlert(
      active ? 'Discard workout?' : 'Delete workout?',
      active
        ? 'Everything logged in this workout will be thrown away.'
        : 'This workout will be removed from your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: active ? 'Discard' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(db, session.id);
            router.back();
          },
        },
      ]
    );
  };

  const finish = async () => {
    const { unfinished, finished } = await countUnfinishedSets(db, session.id);
    if (finished === 0) {
      showAlert('No sets checked off', 'Tick ✓ on the sets you did, or discard this workout.', [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(db, session.id);
            router.back();
          },
        },
      ]);
      return;
    }
    showAlert(
      'Finish workout?',
      unfinished > 0
        ? `${unfinished} unchecked ${unfinished === 1 ? 'set' : 'sets'} will be removed.`
        : undefined,
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            feedback('medium');
            await finishSession(db, session.id);
            // The summary (totals, muscles worked, new records) replaces the logger.
            router.replace({ pathname: '/workout-complete/[id]', params: { id: session.id } });
          },
        },
      ]
    );
  };

  const addExercises = () => {
    openExercisePicker(async (exerciseIds) => {
      feedback('light');
      await addExercisesToSession(db, session.id, exerciseIds, unit);
      await reload();
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets>
      <Stack.Screen
        options={{
          title: session.name,
          headerRight: active
            ? () => (
                <HeaderAction label="Finish" variant="success" onPress={finish} />
              )
            : undefined,
        }}
      />

      <Card style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: muted }]}>
            {active ? 'DURATION' : formatDay(session.startedAt).toUpperCase()}
          </Text>
          <Text style={[styles.summaryValue, active && { color: tint }]}>
            {active ? (
              <Elapsed since={session.startedAt} />
            ) : (
              formatDuration(session.endedAt! - session.startedAt)
            )}
          </Text>
          <Text style={[styles.summaryDetail, { color: muted }]}>
            {active ? 'Started' : 'At'} {formatTime(session.startedAt)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: muted }]}>SETS DONE</Text>
          <Text style={styles.summaryValue}>
            {doneSets}
            {active && <Text style={[styles.summaryOf, { color: muted }]}> / {totalSets}</Text>}
          </Text>
          <Text style={[styles.summaryDetail, { color: muted }]}>
            {session.exercises.length} {session.exercises.length === 1 ? 'exercise' : 'exercises'}
          </Text>
        </View>
      </Card>

      {session.exercises.length === 0 && (
        <Text style={[styles.empty, { color: muted }]}>
          {active ? 'Add exercises to start logging sets.' : 'No sets were logged.'}
        </Text>
      )}

      {session.exercises.map((exercise) =>
        active ? (
          <ActiveExercise
            key={exercise.id}
            exercise={exercise}
            unit={unit}
            onChanged={reload}
          />
        ) : (
          <FinishedExercise key={exercise.id} exercise={exercise} unit={unit} />
        )
      )}

      {active && <Button label="+ Add exercises" variant="soft" onPress={addExercises} />}

      <Button
        label={active ? 'Discard workout' : 'Delete from history'}
        variant="danger"
        onPress={discard}
      />
    </ScrollView>
  );
}

function ActiveExercise({
  exercise,
  unit,
  onChanged,
}: {
  exercise: SessionExerciseDetail;
  unit: WeightUnit;
  onChanged: () => Promise<void>;
}) {
  const db = useSQLiteContext();
  const { fontScale } = useWindowDimensions();
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

  const remove = () => {
    showAlert('Remove exercise?', `${exercise.name} and its sets will be removed from this workout.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeSessionExercise(db, exercise.id);
          await onChanged();
        },
      },
    ]);
  };

  return (
    <MotionRow><Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Link href={{ pathname: '/exercise/[id]', params: { id: exercise.exerciseId } }} asChild>
          <Pressable style={styles.cardTitle}>
            <Text style={[styles.exerciseName, { color: tint }]}>{exercise.name}</Text>
          </Pressable>
        </Link>
        <IconButton
          ios="xmark"
          material="close"
          label={`Remove ${exercise.name}`}
          color="muted"
          onPress={remove}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1 }}><View style={{ minWidth: Math.max(300, 300 * fontScale), flex: 1 }}>
      <View style={[styles.setRow, styles.setRowBody]}>
        <Text style={[styles.colSet, styles.colHeader, { color: muted }]}>SET</Text>
        <Text style={[styles.colLast, styles.colHeader, { color: muted }]}>LAST TIME</Text>
        <Text style={[styles.colWeight, { width: 72 * fontScale }, styles.colHeader, { color: muted }]}>
          {unit.toUpperCase()}
        </Text>
        <Text style={[styles.colEffort, { width: 60 * fontScale }, styles.colHeader, { color: muted }]}>
          {exercise.isTimed ? 'SEC' : 'REPS'}
        </Text>
        <View style={styles.colCheck} />
      </View>

      {exercise.sets.map((set, index) => (
        <SetRow
          key={set.id}
          set={set}
          index={index}
          isTimed={exercise.isTimed}
          previous={exercise.previous[index]}
          unit={unit}
          onChanged={onChanged}
        />
      ))}

      </View></ScrollView>
      <Button
        label="+ Add set"
        variant="secondary"
        style={styles.addSet}
        onPress={async () => {
          feedback('light');
          await addSet(db, exercise.id, unit);
          await onChanged();
        }}
      />
    </Card></MotionRow>
  );
}

function toInput(value: number | null): string {
  return value == null ? '' : String(Math.round(value * 10) / 10);
}

function parseNumber(text: string): number | null {
  const value = parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

// One set: weight and reps/seconds are saved as you type; ✓ marks it done.
function SetRow({
  set,
  index,
  isTimed,
  previous,
  unit,
  onChanged,
}: {
  set: LoggedSet;
  index: number;
  isTimed: boolean;
  previous: SetValues | undefined;
  unit: WeightUnit;
  onChanged: () => Promise<void>;
}) {
  const db = useSQLiteContext();
  const { fontScale } = useWindowDimensions();
  const [weight, setWeight] = useState(() =>
    toInput(set.weight == null ? null : convertWeight(set.weight, set.unit, unit))
  );
  const [effort, setEffort] = useState(() => toInput(isTimed ? set.durationS : set.reps));
  const [completed, setCompleted] = useState(set.completed);
  const [missingEffort, setMissingEffort] = useState(false);
  const muted = useThemeColor({}, 'muted');
  const success = useThemeColor({}, 'success');
  const successSoft = useThemeColor({}, 'successSoft');
  const danger = useThemeColor({}, 'danger');
  const surface = useThemeColor({}, 'cardRaised');
  const background = useThemeColor({}, 'background');
  const reduced = useReducedMotion();
  const done = useSharedValue(completed ? 1 : 0);
  const pop = useSharedValue(1);
  useEffect(() => {
    done.set(withTiming(completed ? 1 : 0, { duration: reduced ? 0 : 180 }));
    if (!reduced && completed) pop.set(withSequence(withTiming(1.12, { duration: 80 }), withTiming(1, { duration: 120 })));
  }, [completed, done, pop, reduced]);
  const fillStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(done.value, [0, 1], ['transparent', successSoft]) }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const save =(nextWeight: string, nextEffort: string) => {
    const effortValue = parseNumber(nextEffort);
    const whole = effortValue == null ? null : Math.round(effortValue);
    updateSet(db, set.id, {
      weight: parseNumber(nextWeight),
      unit,
      reps: isTimed ? null : whole,
      durationS: isTimed ? whole : null,
    });
  };

  const toggle = async () => {
    if (!completed && parseNumber(effort) == null) {
      setMissingEffort(true);
      return;
    }
    const next = !completed;
    feedback(next ? 'success' : 'light');
    setCompleted(next);
    await setSetCompleted(db, set.id, next);
    await onChanged(); // refreshes the "sets done" count
  };

  const confirmDelete = () => {
    feedback('warning');
    showAlert(`Delete set ${index + 1}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSet(db, set.id);
          await onChanged();
        },
      },
    ]);
  };

  return (
    <MotionRow><Animated.View style={[styles.setRow, styles.setRowBody, fillStyle]}>
      <Pressable onPress={confirmDelete} style={styles.colSet} accessibilityRole="button" accessibilityLabel={`Delete set ${index + 1}`}>
        <View style={[styles.setPill, { backgroundColor: completed ? 'transparent' : surface }]}>
          <Text style={styles.setNumber}>{index + 1}</Text>
        </View>
      </Pressable>
      <Text style={[styles.colLast, styles.last, { color: muted }]} numberOfLines={1}>
        {previous ? formatSet(previous, unit) : '—'}
      </Text>
      <TextInput
        style={[styles.colWeight, { width: 72 * fontScale }, styles.input]}
        value={weight}
        onChangeText={(text) => {
          const clean = text.replace(/[^0-9.,]/g, '');
          setWeight(clean);
          save(clean, effort);
        }}
        keyboardType="decimal-pad"
        placeholder="—"
        maxLength={6}
        selectTextOnFocus
        accessibilityLabel={`Set ${index + 1} weight in ${unit}`}
      />
      <TextInput
        style={[
          styles.colEffort,
          { width: 60 * fontScale },
          styles.input,
          { borderColor: missingEffort ? danger : 'transparent' },
        ]}
        value={effort}
        onChangeText={(text) => {
          const clean = text.replace(/[^0-9]/g, '');
          setEffort(clean);
          setMissingEffort(false);
          save(weight, clean);
        }}
        keyboardType="number-pad"
        placeholder="—"
        maxLength={4}
        selectTextOnFocus
        accessibilityLabel={`Set ${index + 1} ${isTimed ? 'seconds' : 'reps'}`}
      />
      <Animated.View style={[styles.colCheck, checkStyle]}>
        <Pressable
          onPress={toggle}
          hitSlop={6}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed }}
          accessibilityLabel={`Set ${index + 1} done`}
          style={({ pressed }) => [
            styles.check,
            { backgroundColor: completed ? success : surface },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={18}
            weight="bold"
            tintColor={completed ? background : muted}
          />
        </Pressable>
      </Animated.View>
    </Animated.View></MotionRow>
  );
}

function FinishedExercise({
  exercise,
  unit,
}: {
  exercise: SessionExerciseDetail;
  unit: WeightUnit;
}) {
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'cardRaised');

  return (
    <Card style={styles.card}>
      <Link href={{ pathname: '/exercise/[id]', params: { id: exercise.exerciseId } }} asChild>
        <Pressable>
          <Text style={[styles.exerciseName, { color: tint }]}>{exercise.name}</Text>
        </Pressable>
      </Link>
      {exercise.sets.map((set, index) => (
        <View key={set.id} style={styles.loggedRow}>
          <View style={[styles.setPill, { backgroundColor: surface }]}>
            <Text style={[styles.setNumber, { color: muted }]}>{index + 1}</Text>
          </View>
          <Text style={styles.loggedValue}>{formatSet(set, unit)}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Space.lg,
    gap: Space.lg,
    paddingBottom: Space.bottom,
  },
  summary: {
    flexDirection: 'row',
    gap: Space.md,
  },
  summaryItem: {
    flex: 1,
    gap: Space.micro,
  },
  summaryLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.heavy,
    fontVariant: ['tabular-nums'],
  },
  summaryOf: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.bold,
  },
  summaryDetail: {
    fontSize: FontSize.caption,
  },
  empty: {
    textAlign: 'center',
    marginVertical: Space.xl,
  },
  card: {
    paddingHorizontal: Space.md,
    gap: Space.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.sm,
    marginBottom: Space.xs,
  },
  cardTitle: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.heavy,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  setRowBody: {
    borderRadius: Radius.input,
    paddingVertical: Space.xs,
    paddingHorizontal: Space.sm,
  },
  colHeader: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  colSet: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  colLast: {
    flex: 1,
  },
  colWeight: {
    width: 72,
    textAlign: 'center',
  },
  colEffort: {
    width: 60,
    textAlign: 'center',
  },
  colCheck: {
    width: 44,
    alignItems: 'center',
  },
  setPill: {
    width: 28,
    height: 28,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumber: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.heavy,
  },
  last: {
    fontSize: FontSize.caption,
  },
  input: {
    paddingVertical: Space.sm,
    paddingHorizontal: Space.xs,
    borderRadius: Radius.small,
    fontWeight: FontWeight.bold,
  },
  check: {
    width: 44,
    height: 44,
    borderRadius: Radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSet: {
    marginTop: Space.xs,
    paddingVertical: Space.md,
  },
  loggedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.sm,
  },
  loggedValue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
  pressed: {
    opacity: 0.6,
  },
});
