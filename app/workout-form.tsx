import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { showAlert } from '@/components/AlertSheet';
import { FormSkeleton } from '@/components/ScreenSkeletons';
import WorkedMuscles from '@/components/body/WorkedMuscles';
import Chip from '@/components/Chip';
import IconButton from '@/components/IconButton';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import { MUSCLE_GROUPS, MUSCLE_LABELS, type MuscleGroup } from '@/db/exerciseTags';
import { getExercise } from '@/db/exercises';
import {
  DEFAULT_TARGET_REPS,
  DEFAULT_TARGET_SECONDS,
  DEFAULT_TARGET_SETS,
  deleteWorkout,
  getWorkout,
  saveWorkout,
} from '@/db/workouts';
import { findPreset, getPresetExercises } from '@/db/workoutPresets';
import { openExercisePicker } from '@/lib/exercisePicker';
import { openPresetPicker } from '@/lib/presetPicker';

type DraftExercise = {
  key: string;
  exerciseId: string;
  name: string;
  isTimed: boolean;
  targetSets: number;
  /** Reps, or seconds for timed exercises, as typed. */
  target: string;
};

const MAX_SETS = 20;

// Creates a workout template, or edits one when opened with ?id=.
export default function WorkoutFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useSQLiteContext();
  const isEditing = id != null;

  const [loaded, setLoaded] = useState(!isEditing);
  const [name, setName] = useState('');
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nextKey = useRef(0);

  const tint = useThemeColor({}, 'tint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const background = useThemeColor({}, 'background');
  const card = useThemeColor({}, 'card');
  const danger = useThemeColor({}, 'danger');
  const muted = useThemeColor({}, 'muted');

  const makeKey = () => String(nextKey.current++);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getWorkout(db, id).then((workout) => {
      if (cancelled) return;
      if (!workout) {
        router.back();
        return;
      }
      setName(workout.name);
      setMuscleGroups(workout.muscleGroups);
      setExercises(
        workout.exercises.map((e) => ({
          key: makeKey(),
          exerciseId: e.exerciseId,
          name: e.name,
          isTimed: e.isTimed,
          targetSets: e.targetSets,
          target: String((e.isTimed ? e.targetSeconds : e.targetReps) ?? ''),
        }))
      );
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  const addExercises = () => {
    openExercisePicker(
      async (exerciseIds) => {
        const details = await Promise.all(exerciseIds.map((exerciseId) => getExercise(db, exerciseId)));
        setExercises((current) => [
          ...current,
          ...details
            .filter((e) => e != null)
            .map((e) => ({
              key: makeKey(),
              exerciseId: e.id,
              name: e.name,
              isTimed: e.isTimed,
              targetSets: DEFAULT_TARGET_SETS,
              target: String(e.isTimed ? DEFAULT_TARGET_SECONDS : DEFAULT_TARGET_REPS),
            })),
        ]);
        setError(null);
      },
      { muscles: muscleGroups }
    );
  };

  // Fills the form from a prebuilt workout; everything stays editable before saving.
  const choosePreset = () => {
    openPresetPicker(async (presetKey) => {
      const preset = findPreset(presetKey);
      if (!preset) return;
      const presetExercises = await getPresetExercises(db, preset);
      const apply = () => {
        setName(preset.name);
        setMuscleGroups(preset.muscleGroups);
        setExercises(
          presetExercises.map((e) => ({
            key: makeKey(),
            exerciseId: e.exerciseId,
            name: e.name,
            isTimed: e.isTimed,
            targetSets: e.targetSets,
            target: String((e.isTimed ? e.targetSeconds : e.targetReps) ?? ''),
          }))
        );
        setError(null);
      };
      if (exercises.length === 0 && !name.trim()) {
        apply();
        return;
      }
      showAlert(`Use ${preset.name}?`, 'This replaces the name, body parts and exercises you have so far.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', onPress: apply },
      ]);
    });
  };

  const updateExercise = (key: string, change: Partial<DraftExercise>) => {
    setExercises((current) => current.map((e) => (e.key === key ? { ...e, ...change } : e)));
  };

  const move = (index: number, offset: -1 | 1) => {
    setExercises((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + offset, 0, item);
      return next;
    });
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter a name.');
    if (exercises.length === 0) return setError('Add at least one exercise.');

    setSaving(true);
    try {
      await saveWorkout(
        db,
        {
          name: trimmed,
          muscleGroups: MUSCLE_GROUPS.filter((m) => muscleGroups.includes(m)),
          exercises: exercises.map((e) => {
            const target = parseInt(e.target, 10);
            const value = Number.isFinite(target) && target > 0 ? target : null;
            return {
              exerciseId: e.exerciseId,
              targetSets: e.targetSets,
              targetReps: e.isTimed ? null : value,
              targetSeconds: e.isTimed ? value : null,
            };
          }),
        },
        id
      );
      router.back();
    } catch {
      setError('Could not save the workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!id) return;
    showAlert('Delete workout?', `"${name}" will be removed. Your history is kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWorkout(db, id);
          router.back();
        },
      },
    ]);
  };

  if (!loaded) return <FormSkeleton fields={4} />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit workout' : 'New workout',
          headerRight: () => (
            <Pressable onPress={save} disabled={saving} hitSlop={8}>
              <Text style={[styles.headerButton, { color: tint }, saving && styles.dimmed]}>
                Save
              </Text>
            </Pressable>
          ),
        }}
      />

      {!isEditing && (
        <Pressable
          onPress={choosePreset}
          accessibilityRole="button"
          style={({ pressed }) => [styles.presetBanner, { backgroundColor: tintSoft }, pressed && styles.dimmed]}>
          <View style={styles.presetText}>
            <Text style={[styles.presetTitle, { color: tint }]}>Start from a prebuilt workout</Text>
            <Text style={[styles.hint, { color: muted }]}>
              Push/Pull/Legs, Upper/Lower, Full body, Home. Edit it however you like.
            </Text>
          </View>
          <Text style={[styles.presetChevron, { color: tint }]}>›</Text>
        </Pressable>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          placeholder="e.g. Push Day"
          autoCapitalize="words"
          returnKeyType="done"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Body parts</Text>
        <Text style={[styles.hint, { color: muted }]}>
          Adding exercises starts with these muscle groups selected.
        </Text>
        <View style={styles.chips}>
          {MUSCLE_GROUPS.map((muscle) => (
            <Chip
              key={muscle}
              label={MUSCLE_LABELS[muscle]}
              selected={muscleGroups.includes(muscle)}
              onPress={() =>
                setMuscleGroups((current) =>
                  current.includes(muscle)
                    ? current.filter((m) => m !== muscle)
                    : [...current, muscle]
                )
              }
            />
          ))}
        </View>
      </View>

      <WorkedMuscles
        exerciseIds={exercises.map((e) => e.exerciseId)}
        bodyParts={muscleGroups}
      />

      <View style={styles.field}>
        <Text style={styles.label}>Exercises</Text>
        {exercises.map((exercise, index) => (
          <View key={exercise.key} style={[styles.exercise, { backgroundColor: card }]}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>
                {index + 1}. {exercise.name}
              </Text>
              <IconButton
                ios="chevron.up"
                material="keyboard_arrow_up"
                label="Move up"
                onPress={() => move(index, -1)}
                disabled={index === 0}
              />
              <IconButton
                ios="chevron.down"
                material="keyboard_arrow_down"
                label="Move down"
                onPress={() => move(index, 1)}
                disabled={index === exercises.length - 1}
              />
              <IconButton
                ios="xmark"
                material="close"
                label={`Remove ${exercise.name}`}
                color="danger"
                onPress={() =>
                  setExercises((current) => current.filter((e) => e.key !== exercise.key))
                }
              />
            </View>
            <View style={styles.targets}>
              <View style={styles.target}>
                <Text style={[styles.targetLabel, { color: muted }]}>Sets</Text>
                <IconButton
                  ios="minus.circle"
                  material="remove_circle_outline"
                  label="Fewer sets"
                  color="tint"
                  onPress={() =>
                    updateExercise(exercise.key, { targetSets: exercise.targetSets - 1 })
                  }
                  disabled={exercise.targetSets <= 1}
                />
                <Text style={styles.setCount}>{exercise.targetSets}</Text>
                <IconButton
                  ios="plus.circle"
                  material="add_circle_outline"
                  label="More sets"
                  color="tint"
                  onPress={() =>
                    updateExercise(exercise.key, { targetSets: exercise.targetSets + 1 })
                  }
                  disabled={exercise.targetSets >= MAX_SETS}
                />
              </View>
              <View style={styles.target}>
                <Text style={[styles.targetLabel, { color: muted }]}>
                  {exercise.isTimed ? 'Seconds' : 'Reps'}
                </Text>
                <TextInput
                  style={styles.targetInput}
                  value={exercise.target}
                  onChangeText={(text) =>
                    updateExercise(exercise.key, { target: text.replace(/[^0-9]/g, '') })
                  }
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="—"
                  selectTextOnFocus
                />
              </View>
            </View>
          </View>
        ))}

        <Pressable
          onPress={addExercises}
          style={({ pressed }) => [styles.addButton, { borderColor: tint }, pressed && styles.dimmed]}>
          <Text style={[styles.addLabel, { color: tint }]}>+ Add exercises</Text>
        </Pressable>
      </View>

      {error && <Text style={[styles.error, { color: danger }]}>{error}</Text>}

      <Pressable
        onPress={save}
        disabled={saving}
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: tint },
          (pressed || saving) && styles.dimmed,
        ]}>
        <Text style={[styles.saveLabel, { color: background }]}>
          {isEditing ? 'Save changes' : 'Create workout'}
        </Text>
      </Pressable>

      {isEditing && (
        <Pressable
          onPress={confirmDelete}
          style={({ pressed }) => [styles.deleteButton, { borderColor: danger }, pressed && styles.dimmed]}>
          <Text style={[styles.deleteLabel, { color: danger }]}>Delete workout</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  headerButton: {
    fontSize: 17,
    fontWeight: '600',
  },
  field: {
    gap: 8,
  },
  presetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 16,
  },
  presetText: {
    flex: 1,
    gap: 2,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  presetChevron: {
    fontSize: 28,
    fontWeight: '600',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exercise: {
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  targets: {
    flexDirection: 'row',
    gap: 24,
  },
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetLabel: {
    fontSize: 14,
  },
  setCount: {
    fontSize: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  targetInput: {
    width: 64,
    textAlign: 'center',
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
  error: {
    fontSize: 14,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  dimmed: {
    opacity: 0.5,
  },
});
