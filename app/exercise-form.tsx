import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch } from 'react-native';

import { NO_EQUIPMENT_LABEL } from '@/components/Badge';
import Chip from '@/components/Chip';
import ModalScreen from '@/components/ModalScreen';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  type Equipment,
  type MuscleGroup,
} from '@/db/exerciseTags';
import { createExercise, exerciseNameExists, getExercise, updateExercise } from '@/db/exercises';
import { deliverCreatedExercise } from '@/lib/exercisePicker';

// Adds a custom exercise, or edits one when opened with ?id=.
export default function ExerciseFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useSQLiteContext();
  const isEditing = id != null;

  const [loaded, setLoaded] = useState(!isEditing);
  const [name, setName] = useState('');
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup | null>(null);
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [noEquipment, setNoEquipment] = useState(false);
  const [isTimed, setIsTimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const danger = useThemeColor({}, 'danger');
  const success = useThemeColor({}, 'success');
  const muted = useThemeColor({}, 'muted');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getExercise(db, id).then((exercise) => {
      if (cancelled) return;
      // Built-in exercises are read-only; only custom ones can be edited.
      if (!exercise || !exercise.isCustom) {
        router.back();
        return;
      }
      setName(exercise.name);
      setPrimaryMuscle(exercise.primaryMuscle);
      setSecondaryMuscles(exercise.secondaryMuscles);
      setEquipment(exercise.equipment);
      setNoEquipment(exercise.noEquipment);
      setIsTimed(exercise.isTimed);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  const choosePrimary = (muscle: MuscleGroup) => {
    setPrimaryMuscle(muscle);
    setSecondaryMuscles((current) => current.filter((m) => m !== muscle));
  };

  const toggleSecondary = (muscle: MuscleGroup) => {
    setSecondaryMuscles((current) =>
      current.includes(muscle) ? current.filter((m) => m !== muscle) : [...current, muscle]
    );
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter a name.');
    if (!primaryMuscle) return setError('Choose the primary muscle.');

    setSaving(true);
    try {
      if (await exerciseNameExists(db, trimmed, id)) {
        setError('An exercise with this name already exists.');
        return;
      }
      // Keep secondary muscles in the standard order.
      const input = {
        name: trimmed,
        primaryMuscle,
        secondaryMuscles: MUSCLE_GROUPS.filter((m) => secondaryMuscles.includes(m)),
        equipment,
        noEquipment,
        isTimed,
      };
      if (id) {
        await updateExercise(db, id, input);
      } else {
        const newId = await createExercise(db, input);
        deliverCreatedExercise(newId);
      }
      router.back();
    } catch {
      setError('Could not save the exercise. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const title = isEditing ? 'Edit exercise' : 'New exercise';

  if (!loaded) return <ModalScreen title={title}>{null}</ModalScreen>;

  return (
    <ModalScreen title={title}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder="e.g. Landmine Press"
            autoFocus={!isEditing}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Primary muscle</Text>
          <View style={styles.chips}>
            {MUSCLE_GROUPS.map((muscle) => (
              <Chip
                key={muscle}
                label={MUSCLE_LABELS[muscle]}
                selected={primaryMuscle === muscle}
                onPress={() => {
                  choosePrimary(muscle);
                  setError(null);
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Also works (optional)</Text>
          <View style={styles.chips}>
            {MUSCLE_GROUPS.filter((m) => m !== primaryMuscle).map((muscle) => (
              <Chip
                key={muscle}
                label={MUSCLE_LABELS[muscle]}
                selected={secondaryMuscles.includes(muscle)}
                onPress={() => toggleSecondary(muscle)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Equipment (optional)</Text>
          <View style={styles.chips}>
            {EQUIPMENT.map((item) => (
              <Chip
                key={item}
                label={EQUIPMENT_LABELS[item]}
                selected={equipment === item}
                onPress={() => setEquipment(equipment === item ? null : item)}
              />
            ))}
          </View>
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.label}>{NO_EQUIPMENT_LABEL}</Text>
            <Text style={[styles.hint, { color: muted }]}>
              Can be done at home with nothing, or household items like a chair or wall.
            </Text>
          </View>
          <Switch
            value={noEquipment}
            onValueChange={setNoEquipment}
            trackColor={{ true: success }}
            accessibilityLabel={NO_EQUIPMENT_LABEL}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.label}>Timed</Text>
            <Text style={[styles.hint, { color: muted }]}>
              Log sets in seconds instead of reps, like a plank.
            </Text>
          </View>
          <Switch
            value={isTimed}
            onValueChange={setIsTimed}
            trackColor={{ true: tint }}
            accessibilityLabel="Timed"
          />
        </View>

        {error && <Text style={[styles.error, { color: danger }]}>{error}</Text>}

        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: tint },
            (pressed || saving) && styles.pressed,
          ]}>
          <Text style={[styles.saveLabel, { color: background }]}>
            {isEditing ? 'Save changes' : 'Add exercise'}
          </Text>
        </Pressable>
      </ScrollView>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  hint: {
    fontSize: 13,
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
  pressed: {
    opacity: 0.6,
  },
});
