import { Link, Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { EQUIPMENT_LABELS, LEVEL_LABELS, MUSCLE_LABELS } from '@/db/exerciseTags';
import { deleteExercise, getExercise, type ExerciseDetail } from '@/db/exercises';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  // undefined while loading, null if it doesn't exist (or was deleted).
  const [exercise, setExercise] = useState<ExerciseDetail | null | undefined>(undefined);
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const muted = useThemeColor({}, 'muted');

  // Reloads on focus so changes made on the edit screen show up.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getExercise(db, id).then((row) => {
        if (!cancelled) setExercise(row);
      });
      return () => {
        cancelled = true;
      };
    }, [db, id])
  );

  const confirmDelete = () => {
    if (!exercise) return;
    Alert.alert('Delete exercise?', `"${exercise.name}" will be removed from your library.`, [
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

  if (exercise === undefined) return <View style={styles.container} />;

  if (exercise === null) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Stack.Screen options={{ title: 'Exercise' }} />
        <Text style={{ color: muted }}>This exercise no longer exists.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      <View style={styles.facts}>
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
        {exercise.isCustom && <Fact label="Source" value="Custom exercise" />}
      </View>

      {exercise.instructions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {exercise.instructions.map((step, index) => (
            <View key={index} style={styles.step}>
              <Text style={[styles.stepNumber, { color: muted }]}>{index + 1}.</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      {exercise.isCustom && (
        <Pressable
          onPress={confirmDelete}
          style={({ pressed }) => [styles.deleteButton, { borderColor: danger }, pressed && styles.pressed]}>
          <Text style={[styles.deleteLabel, { color: danger }]}>Delete exercise</Text>
        </Pressable>
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
    padding: 16,
    gap: 24,
  },
  headerButton: {
    fontSize: 17,
  },
  facts: {
    gap: 12,
  },
  fact: {
    gap: 2,
  },
  factLabel: {
    fontSize: 13,
  },
  factValue: {
    fontSize: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  step: {
    flexDirection: 'row',
    gap: 8,
  },
  stepNumber: {
    fontSize: 15,
    minWidth: 20,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  deleteButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.6,
  },
});
