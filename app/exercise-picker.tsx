import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ExerciseBrowser from '@/components/ExerciseBrowser';
import ModalScreen from '@/components/ModalScreen';
import { Text, View, useThemeColor } from '@/components/Themed';
import { isMuscleGroup } from '@/db/exerciseTags';
import { deliverPickedExercises } from '@/lib/exercisePicker';

// Opened with openExercisePicker(); returns the chosen exercises in the order tapped.
export default function ExercisePickerScreen() {
  const { muscles, single } = useLocalSearchParams<{ muscles?: string; single?: string }>();
  // Single mode: tapping an exercise picks it and closes.
  const singleMode = single === '1';
  const initialMuscles = useMemo(() => (muscles ?? '').split(',').filter(isMuscleGroup), [muscles]);
  const [selected, setSelected] = useState<string[]>([]);
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const insets = useSafeAreaInsets();
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');

  const done = () => {
    deliverPickedExercises(selected);
    router.back();
  };

  return (
    <ModalScreen title={singleMode ? 'Choose exercise' : 'Add exercises'}>
      <ExerciseBrowser
        initialMuscles={initialMuscles}
        selectedIds={selectedIds}
        onToggle={(exercise) => {
          if (singleMode) {
            deliverPickedExercises([exercise.id]);
            router.back();
            return;
          }
          setSelected((current) =>
            current.includes(exercise.id)
              ? current.filter((id) => id !== exercise.id)
              : [...current, exercise.id]
          );
        }}
        bottomInset={singleMode ? 24 : 96}
      />
      {!singleMode && (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              borderTopColor: border,
              backgroundColor: background,
            },
          ]}>
          <Pressable
            onPress={done}
            disabled={selected.length === 0}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: tint },
              (pressed || selected.length === 0) && styles.dimmed,
            ]}>
            <Text style={[styles.buttonLabel, { color: background }]}>
              {selected.length === 0
                ? 'Select exercises'
                : `Add ${selected.length} ${selected.length === 1 ? 'exercise' : 'exercises'}`}
            </Text>
          </Pressable>
        </View>
      )}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  dimmed: {
    opacity: 0.5,
  },
});
