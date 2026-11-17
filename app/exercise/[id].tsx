import { FontSize, FontWeight, Radius, Space } from '@/constants/Design';
import Colors from '@/constants/Colors';
import { Button, Card } from '@/components/ui';
import { Link, Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { showAlert } from '@/components/AlertSheet';
import { CardListSkeleton } from '@/components/ScreenSkeletons';
import Badge, { NO_EQUIPMENT_LABEL } from '@/components/Badge';
import PressableLink from '@/components/PressableLink';
import RecordTiles from '@/components/RecordTiles';
import { getExerciseRecords, type ExerciseRecords } from '@/db/progress';
import { Text, View, useThemeColor } from '@/components/Themed';
import { EQUIPMENT_LABELS, LEVEL_LABELS, MUSCLE_LABELS } from '@/db/exerciseTags';
import { deleteExercise, getExercise, type ExerciseDetail } from '@/db/exercises';
import { getExerciseHistory, type ExerciseHistoryEntry } from '@/db/sessions';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { formatDay, formatSet } from '@/lib/format';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  // undefined while loading, null if it doesn't exist (or was deleted).
  const [exercise, setExercise] = useState<ExerciseDetail | null | undefined>(undefined);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [records, setRecords] = useState<ExerciseRecords | null>(null);
  const { unit } = useWeightUnit();
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');

  // Reloads on focus so changes made on the edit screen show up.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        getExercise(db, id),
        getExerciseHistory(db, id),
        getExerciseRecords(db, id, unit),
      ]).then(([row, entries, best]) => {
        if (cancelled) return;
        setExercise(row);
        setHistory(entries);
        setRecords(best);
      });
      return () => {
        cancelled = true;
      };
    }, [db, id, unit])
  );

  const confirmDelete = () => {
    if (!exercise) return;
    showAlert('Delete exercise?', `"${exercise.name}" will be removed from your library.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExercise(db, exercise.id);
          router.back();
        },
      },
    ]);
  };

  if (exercise === undefined) return <CardListSkeleton count={3} header={false} />;

  if (exercise === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: 'Exercise' }} />
        <Text style={{ color: muted }}>This exercise no longer exists.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen
        options={{
          title: exercise.name,
          headerRight: exercise.isCustom
            ? () => (
                <Link href={{ pathname: '/exercise-form', params: { id: exercise.id } }} asChild>
                  <Pressable hitSlop={8}>
                    <Text style={[styles.headerButton, { color: tint }]}>Edit</Text>
                  </Pressable>
                </Link>
              )
            : undefined,
        }}
      />

      {exercise.noEquipment && (
        <View style={styles.noEquipment}>
          <Badge label={NO_EQUIPMENT_LABEL} color="success" />
          <Text style={[styles.noEquipmentHint, { color: muted }]}>
            Can be done at home with nothing, or household items like a chair or wall.
          </Text>
        </View>
      )}

      <Card style={styles.facts}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}><Badge label={MUSCLE_LABELS[exercise.primaryMuscle]} />{exercise.equipment && <Badge label={EQUIPMENT_LABELS[exercise.equipment]} />}{exercise.level && <Badge label={LEVEL_LABELS[exercise.level] ?? exercise.level} />}</View>
        <Fact label="Primary muscle" value={MUSCLE_LABELS[exercise.primaryMuscle]} />
        {exercise.secondaryMuscles.length > 0 && (
          <Fact
            label="Also works"
            value={exercise.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(', ')}
          />
        )}
        {exercise.equipment && (
          <Fact label="Equipment" value={EQUIPMENT_LABELS[exercise.equipment]} />
        )}
        {exercise.level && <Fact label="Level" value={LEVEL_LABELS[exercise.level] ?? exercise.level} />}
        <Fact label="Logged as" value={exercise.isTimed ? 'Time (seconds)' : 'Reps'} />
        {exercise.isCustom && <Fact label="Source" value="Custom exercise" />}
      </Card>

      {records && history.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Personal records</Text>
          <RecordTiles records={records} isTimed={exercise.isTimed} unit={unit} />
        </Card>
      )}

      {history.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {history.map((entry) => (
            <PressableLink
              key={entry.sessionId}
              href={{ pathname: '/session/[id]', params: { id: entry.sessionId } }}
              style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}>
              <Text style={[styles.historyDate, { color: muted }]}>{formatDay(entry.startedAt)}</Text>
              <Text style={styles.historySets}>
                {entry.sets.map((set) => formatSet(set, unit)).join(', ')}
              </Text>
            </PressableLink>
          ))}
        </Card>
      )}

      {exercise.instructions.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {exercise.instructions.map((step, index) => (
            <View key={index} style={styles.step}>
              <Text style={[styles.stepNumber, { color: muted }]}>{index + 1}.</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Card>
      )}

      {exercise.isCustom && (
        <Button label="Delete exercise" variant="danger" onPress={confirmDelete} />
      )}
    </ScrollView>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const muted = useThemeColor({}, 'muted');
  return (
    <View style={styles.fact}>
      <Text style={[styles.factLabel, { color: muted }]}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
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
    padding: Space.lg,
    gap: Space.xl,
  },
  headerButton: {
    fontSize: FontSize.headline,
  },
  noEquipment: {
    gap: Space.sm,
  },
  noEquipmentHint: {
    fontSize: FontSize.body,
  },
  facts: {
    gap: Space.md,
  },
  fact: {
    gap: Space.micro,
  },
  factLabel: {
    fontSize: FontSize.caption,
  },
  factValue: {
    fontSize: FontSize.headline,
  },
  section: {
    gap: Space.md,
  },
  sectionTitle: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.semibold,
  },
  step: {
    paddingVertical: Space.sm,
    flexDirection: 'row',
    gap: Space.sm,
  },
  historyRow: {
    padding: Space.md,
    borderRadius: Radius.input,
    backgroundColor: Colors.dark.cardRaised,
    gap: Space.micro,
  },
  historyDate: {
    fontSize: FontSize.caption,
  },
  historySets: {
    fontSize: FontSize.body,
  },
  stepNumber: {
    fontSize: FontSize.body,
    minWidth: 20,
  },
  stepText: {
    flex: 1,
    fontSize: FontSize.body,
    lineHeight: 21,
  },
  pressed: {
    opacity: 0.6,
  },
});
