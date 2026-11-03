import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { Card } from '@/components/ui';
import { MUSCLE_GROUPS, MUSCLE_LABELS, type MuscleGroup } from '@/db/exerciseTags';
import { getExerciseMuscles, musclesWorked, type ExerciseMuscles } from '@/db/muscles';

import BodyMap, { type MuscleFill } from './BodyMap';

// Body diagram for the workout form: muscles the exercises work (primary solid, secondary
// lighter). Before any exercise is added, the chosen body parts are outlined faintly.
export default function WorkedMuscles({
  exerciseIds,
  bodyParts,
}: {
  exerciseIds: string[];
  bodyParts: MuscleGroup[];
}) {
  const db = useSQLiteContext();
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');
  const [muscles, setMuscles] = useState<Map<string, ExerciseMuscles>>(new Map());
  const key = [...new Set(exerciseIds)].sort().join('|');

  useEffect(() => {
    let cancelled = false;
    getExerciseMuscles(db, key ? key.split('|') : []).then((map) => {
      if (!cancelled) setMuscles(map);
    });
    return () => {
      cancelled = true;
    };
  }, [db, key]);

  const worked = musclesWorked(exerciseIds.map((id) => muscles.get(id)));
  const hasExercises = Object.keys(worked).length > 0;

  const fills: Partial<Record<MuscleGroup, MuscleFill>> = {};
  if (hasExercises) {
    for (const [muscle, level] of Object.entries(worked) as [MuscleGroup, 'primary' | 'secondary'][]) {
      fills[muscle] = { color: tint, opacity: level === 'primary' ? 1 : 0.4 };
    }
  } else {
    for (const muscle of bodyParts) fills[muscle] = { color: tint, opacity: 0.25 };
  }

  const primary = MUSCLE_GROUPS.filter((m) => worked[m] === 'primary');
  const secondary = MUSCLE_GROUPS.filter((m) => worked[m] === 'secondary');
  const label = hasExercises
    ? `Body diagram. Primary: ${primary.map((m) => MUSCLE_LABELS[m]).join(', ') || 'none'}. Secondary: ${secondary.map((m) => MUSCLE_LABELS[m]).join(', ') || 'none'}.`
    : 'Body diagram. No exercises added yet.';

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Muscles worked</Text>
      <BodyMap fills={fills} height={200} accessibilityLabel={label} />
      {hasExercises ? (
        <View style={styles.legend}>
          <Key color={tint} opacity={1} label={`Primary: ${primary.map((m) => MUSCLE_LABELS[m]).join(', ') || '—'}`} />
          {secondary.length > 0 && (
            <Key color={tint} opacity={0.4} label={`Secondary: ${secondary.map((m) => MUSCLE_LABELS[m]).join(', ')}`} />
          )}
        </View>
      ) : (
        <Text style={[styles.hint, { color: muted }]}>
          Add exercises to see which muscles this workout hits.
        </Text>
      )}
    </Card>
  );
}

function Key({ color, opacity, label }: { color: string; opacity: number; label: string }) {
  const muted = useThemeColor({}, 'muted');
  return (
    <View style={styles.keyRow}>
      <View style={[styles.swatch, { backgroundColor: color, opacity }]} />
      <Text style={[styles.keyLabel, { color: muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  legend: {
    gap: 6,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  keyLabel: {
    flex: 1,
    fontSize: 13,
  },
  hint: {
    fontSize: 13,
  },
});
