import { FontSize, FontWeight, Radius, Space } from '@/constants/Design';
import { Button, Card } from '@/components/ui';
import HeaderAction from '@/components/HeaderAction';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
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
  const [reordering, setReordering] = useState(false);
  const allowLeave = useUnsavedChanges(JSON.stringify({ name, muscleGroups, exercises: exercises.map(({ exerciseId, targetSets, target }) => [exerciseId, targetSets, target]) }), loaded);
  const nextKey = useRef(0);

  const tint = useThemeColor({}, 'tint');
  const tintSoft = useThemeColor({}, 'tintSoft');
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
      allowLeave();
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
          allowLeave();
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
          headerRight: () => <HeaderAction label="Save" onPress={save} disabled={saving} />,
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

      <Card style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
            accessibilityLabel="Workout name"
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          placeholder="e.g. Push Day"
          autoCapitalize="words"
          returnKeyType="done"
        />
      </Card>

      <Card style={styles.field}>
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
      </Card>

      <WorkedMuscles
        exerciseIds={exercises.map((e) => e.exerciseId)}
        bodyParts={muscleGroups}
      />

      <Card style={styles.field}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}><Text variant="headline">Exercises</Text>{exercises.length > 1 && <Button label={reordering ? "Done reordering" : "Reorder"} variant="secondary" compact onPress={() => setReordering(!reordering)} />}</View>
        {reordering && <Text variant="caption">Use the arrows to set your exercise order.</Text>}
        {exercises.map((exercise, index) => (
          <View key={exercise.key} style={[styles.exercise, { backgroundColor: card }]}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>
                {index + 1}. {exercise.name}
              </Text>
              {reordering && <IconButton
                ios="chevron.up"
                material="keyboard_arrow_up"
                label="Move up"
                onPress={() => move(index, -1)}
                disabled={index === 0}
              />}
              {reordering && <IconButton
                ios="chevron.down"
                material="keyboard_arrow_down"
                label="Move down"
                onPress={() => move(index, 1)}
                disabled={index === exercises.length - 1}
              />}
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
            accessibilityLabel={`${exercise.name} target ${exercise.isTimed ? 'seconds' : 'reps'}`}
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

        <Button label="+ Add exercises" variant="soft" onPress={addExercises} />
      </Card>

      {error && <Text style={[styles.error, { color: danger }]}>{error}</Text>}

      <Button label={isEditing ? "Save changes" : "Create workout"} onPress={save} disabled={saving} />

      {isEditing && (
        <Button label="Delete workout" variant="danger" onPress={confirmDelete} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Space.lg,
    gap: Space.xl,
    paddingBottom: Space.bottom,
  },
  field: {
    gap: Space.sm,
  },
  presetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    borderRadius: Radius.card,
    padding: Space.lg,
  },
  presetText: {
    flex: 1,
    gap: Space.micro,
  },
  presetTitle: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.heavy,
  },
  presetChevron: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.semibold,
  },
  label: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
  hint: {
    fontSize: FontSize.caption,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  exercise: {
    borderRadius: Radius.card,
    padding: Space.lg,
    gap: Space.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  exerciseName: {
    flex: 1,
    fontSize: FontSize.headline,
    fontWeight: FontWeight.medium,
  },
  targets: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: Space.xl,
  },
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  targetLabel: {
    fontSize: FontSize.body,
  },
  setCount: {
    fontSize: FontSize.headline,
    minWidth: 20,
    textAlign: 'center',
  },
  targetInput: {
    width: 64,
    textAlign: 'center',
    paddingVertical: Space.sm,
  },
  error: {
    fontSize: FontSize.body,
  },
  dimmed: {
    opacity: 0.5,
  },
});
