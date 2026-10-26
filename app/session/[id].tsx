import { Link, Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import Elapsed from '@/components/Elapsed';
import IconButton from '@/components/IconButton';
import { RECORD_LABELS, formatRecord } from '@/components/RecordTiles';
import { getNewRecords } from '@/db/progress';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
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
  const danger = useThemeColor({}, 'danger');
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

  if (session === undefined) return <View style={styles.container} />;

  if (session === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <Text style={{ color: muted }}>This workout no longer exists.</Text>
      </View>
    );
  }

  const active = session.endedAt == null;

  const discard = () => {
    Alert.alert(
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
      Alert.alert('No sets checked off', 'Tick ✓ on the sets you did, or discard this workout.', [
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
    Alert.alert(
      'Finish workout?',
      unfinished > 0
        ? `${unfinished} unchecked ${unfinished === 1 ? 'set' : 'sets'} will be removed.`
        : undefined,
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            await finishSession(db, session.id);
            const records = await getNewRecords(db, session.id, unit);
            if (records.length === 0) {
              router.back();
              return;
            }
            Alert.alert(
              records.length === 1 ? 'New personal record!' : `${records.length} new personal records!`,
              records
                .map(
                  (r) =>
                    `${r.exerciseName}: ${RECORD_LABELS[r.kind]} ${formatRecord(r.kind, r.records, unit)}`
                )
                .join('\n'),
              [{ text: 'Nice', onPress: () => router.back() }],
              { cancelable: false }
            );
          },
        },
      ]
    );
  };

  const addExercises = () => {
    openExercisePicker(async (exerciseIds) => {
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
      automaticallyAdjustKeyboardInsets>
      <Stack.Screen
        options={{
          title: session.name,
          headerRight: active
            ? () => (
                <Pressable onPress={finish} hitSlop={8}>
                  <Text style={[styles.headerButton, { color: tint }]}>Finish</Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      <Text style={[styles.meta, { color: muted }]}>
        {active ? (
          <>
            Started {formatTime(session.startedAt)} · <Elapsed since={session.startedAt} />
          </>
        ) : (
          `${formatDay(session.startedAt)} · ${formatTime(session.startedAt)} · ${formatDuration(
            session.endedAt! - session.startedAt
          )}`
        )}
      </Text>

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

      {active && (
        <Pressable
          onPress={addExercises}
          style={({ pressed }) => [styles.addButton, { borderColor: tint }, pressed && styles.pressed]}>
          <Text style={[styles.addLabel, { color: tint }]}>+ Add exercises</Text>
        </Pressable>
      )}

      <Pressable onPress={discard} style={styles.discard} hitSlop={8}>
        <Text style={{ color: danger }}>{active ? 'Discard workout' : 'Delete from history'}</Text>
      </Pressable>
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
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

  const remove = () => {
    Alert.alert('Remove exercise?', `${exercise.name} and its sets will be removed from this workout.`, [
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
    <View style={[styles.card, { borderColor: border }]}>
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

      <View style={styles.setRow}>
        <Text style={[styles.colSet, styles.colHeader, { color: muted }]}>SET</Text>
        <Text style={[styles.colLast, styles.colHeader, { color: muted }]}>LAST TIME</Text>
        <Text style={[styles.colWeight, styles.colHeader, { color: muted }]}>
          {unit.toUpperCase()}
        </Text>
        <Text style={[styles.colEffort, styles.colHeader, { color: muted }]}>
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
          onDeleted={onChanged}
        />
      ))}

      <Pressable
        onPress={async () => {
          await addSet(db, exercise.id, unit);
          await onChanged();
        }}
        style={({ pressed }) => [styles.addSet, pressed && styles.pressed]}>
        <Text style={{ color: tint }}>+ Add set</Text>
      </Pressable>
    </View>
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
  onDeleted,
}: {
  set: LoggedSet;
  index: number;
  isTimed: boolean;
  previous: SetValues | undefined;
  unit: WeightUnit;
  onDeleted: () => Promise<void>;
}) {
  const db = useSQLiteContext();
  const [weight, setWeight] = useState(() =>
    toInput(set.weight == null ? null : convertWeight(set.weight, set.unit, unit))
  );
  const [effort, setEffort] = useState(() => toInput(isTimed ? set.durationS : set.reps));
  const [completed, setCompleted] = useState(set.completed);
  const [missingEffort, setMissingEffort] = useState(false);
  const muted = useThemeColor({}, 'muted');
  const success = useThemeColor({}, 'success');
  const danger = useThemeColor({}, 'danger');
  const card = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');

  const save = (nextWeight: string, nextEffort: string) => {
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
    setCompleted(next);
    await setSetCompleted(db, set.id, next);
  };

  const confirmDelete = () => {
    Alert.alert(`Delete set ${index + 1}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSet(db, set.id);
          await onDeleted();
        },
      },
    ]);
  };

  return (
    <View style={[styles.setRow, completed && { backgroundColor: card }]}>
      <Pressable onLongPress={confirmDelete} style={styles.colSet} accessibilityHint="Long press to delete">
        <Text style={styles.setNumber}>{index + 1}</Text>
      </Pressable>
      <Text style={[styles.colLast, styles.last, { color: muted }]} numberOfLines={1}>
        {previous ? formatSet(previous, unit) : '—'}
      </Text>
      <TextInput
        style={[styles.colWeight, styles.input]}
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
          styles.input,
          { borderColor: missingEffort ? danger : border },
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
      <View style={styles.colCheck}>
        <IconButton
          ios={completed ? 'checkmark.circle.fill' : 'circle'}
          material={completed ? 'check_circle' : 'radio_button_unchecked'}
          label={completed ? `Set ${index + 1} done` : `Mark set ${index + 1} done`}
          color={completed ? 'success' : 'muted'}
          size={28}
          onPress={toggle}
        />
      </View>
      {completed && <View style={[styles.doneBar, { backgroundColor: success }]} />}
    </View>
  );
}

function FinishedExercise({
  exercise,
  unit,
}: {
  exercise: SessionExerciseDetail;
  unit: WeightUnit;
}) {
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={[styles.card, { borderColor: border }]}>
      <Link href={{ pathname: '/exercise/[id]', params: { id: exercise.exerciseId } }} asChild>
        <Pressable>
          <Text style={[styles.exerciseName, { color: tint }]}>{exercise.name}</Text>
        </Pressable>
      </Link>
      {exercise.sets.map((set, index) => (
        <View key={set.id} style={styles.summaryRow}>
          <Text style={[styles.summarySet, { color: muted }]}>{index + 1}</Text>
          <Text style={styles.summaryValue}>{formatSet(set, unit)}</Text>
        </View>
      ))}
    </View>
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
    padding: 16,
    gap: 16,
    paddingBottom: 48,
  },
  headerButton: {
    fontSize: 17,
    fontWeight: '600',
  },
  meta: {
    fontSize: 14,
  },
  empty: {
    textAlign: 'center',
    marginVertical: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  cardTitle: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 2,
    backgroundColor: 'transparent',
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '600',
  },
  colSet: {
    width: 28,
    alignItems: 'center',
    textAlign: 'center',
  },
  colLast: {
    flex: 1,
  },
  colWeight: {
    width: 68,
    textAlign: 'center',
  },
  colEffort: {
    width: 56,
    textAlign: 'center',
  },
  colCheck: {
    width: 32,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  setNumber: {
    fontSize: 15,
    fontWeight: '600',
  },
  last: {
    fontSize: 13,
  },
  input: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  doneBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
  },
  addSet: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  discard: {
    alignSelf: 'center',
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summarySet: {
    width: 20,
    textAlign: 'right',
  },
  summaryValue: {
    fontSize: 15,
  },
  pressed: {
    opacity: 0.6,
  },
});
