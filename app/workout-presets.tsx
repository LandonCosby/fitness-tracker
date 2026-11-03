import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import ModalScreen from '@/components/ModalScreen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Card } from '@/components/ui';
import { MUSCLE_LABELS } from '@/db/exerciseTags';
import { PRESET_GROUPS, getPresetExercises, type WorkoutPreset } from '@/db/workoutPresets';
import type { WorkoutTemplateExercise } from '@/db/workouts';
import { deliverPickedPreset } from '@/lib/presetPicker';
import { formatSeconds } from '@/lib/format';

// Lists the prebuilt workouts. Tapping one fills in the "New workout" form.
export default function WorkoutPresetsScreen() {
  const db = useSQLiteContext();
  const muted = useThemeColor({}, 'muted');
  // Exercise names from the library, per preset key.
  const [exercises, setExercises] = useState<Record<string, WorkoutTemplateExercise[]> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const presets = PRESET_GROUPS.flatMap((g) => g.presets);
    Promise.all(presets.map((p) => getPresetExercises(db, p))).then((lists) => {
      if (!cancelled) setExercises(Object.fromEntries(presets.map((p, i) => [p.key, lists[i]])));
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const choose = (preset: WorkoutPreset) => {
    deliverPickedPreset(preset.key);
    router.back();
  };

  return (
    <ModalScreen title="Prebuilt workouts">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: muted }]}>
          Pick one to fill in your new workout. You can change the name, exercises, sets and reps
          before saving, and edit it any time after.
        </Text>
        {exercises &&
          PRESET_GROUPS.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={[styles.groupTitle, { color: muted }]}>{group.title.toUpperCase()}</Text>
              {group.presets.map((preset) => (
                <PresetCard
                  key={preset.key}
                  preset={preset}
                  exercises={exercises[preset.key] ?? []}
                  onPress={() => choose(preset)}
                />
              ))}
            </View>
          ))}
      </ScrollView>
    </ModalScreen>
  );
}

function PresetCard({
  preset,
  exercises,
  onPress,
}: {
  preset: WorkoutPreset;
  exercises: WorkoutTemplateExercise[];
  onPress: () => void;
}) {
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'cardRaised');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Use ${preset.name}: ${exercises.length} exercises`}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeading}>
            <Text style={styles.name}>{preset.name}</Text>
            <Text style={[styles.description, { color: muted }]}>{preset.description}</Text>
          </View>
          <Text style={[styles.use, { color: tint }]}>Use ›</Text>
        </View>
        <View style={styles.tags}>
          {preset.muscleGroups.map((m) => (
            <Text key={m} style={[styles.tag, { backgroundColor: surface, color: muted }]}>
              {MUSCLE_LABELS[m]}
            </Text>
          ))}
        </View>
        <View style={styles.exercises}>
          {exercises.map((e, index) => (
            <View key={`${e.exerciseId}-${index}`} style={styles.exerciseRow}>
              <Text style={[styles.scheme, { color: tint }]}>
                {e.targetSets} ×{' '}
                {e.isTimed ? formatSeconds(e.targetSeconds ?? 0) : e.targetReps}
              </Text>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {e.name}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 22,
    paddingBottom: 40,
  },
  intro: {
    fontSize: 14,
    lineHeight: 20,
  },
  group: {
    gap: 10,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardHeading: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
  },
  description: {
    fontSize: 13,
  },
  use: {
    fontSize: 15,
    fontWeight: '700',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  exercises: {
    gap: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scheme: {
    width: 64,
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
  },
});
