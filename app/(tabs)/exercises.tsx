import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';

import Chip from '@/components/Chip';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import { EQUIPMENT_LABELS, MUSCLE_GROUPS, MUSCLE_LABELS, type MuscleGroup } from '@/db/exerciseTags';
import { listExercises, type ExerciseListItem } from '@/db/exercises';

export default function ExercisesScreen() {
  const db = useSQLiteContext();
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [exercises, setExercises] = useState<ExerciseListItem[] | null>(null);
  const border = useThemeColor({}, 'border');

  // Reloads on focus too, so adds, edits and deletes show up when coming back.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listExercises(db, { search, muscle }).then((rows) => {
        if (!cancelled) setExercises(rows);
      });
      return () => {
        cancelled = true;
      };
    }, [db, search, muscle])
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled">
          <Chip label="All" selected={muscle === null} onPress={() => setMuscle(null)} />
          {MUSCLE_GROUPS.map((group) => (
            <Chip
              key={group}
              label={MUSCLE_LABELS[group]}
              selected={muscle === group}
              onPress={() => setMuscle(muscle === group ? null : group)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: border }]} />
        )}
        ListEmptyComponent={
          exercises ? (
            <Text style={styles.empty}>No exercises match. Tap + to add your own.</Text>
          ) : undefined
        }
        renderItem={({ item }) => <ExerciseRow exercise={item} />}
      />
    </View>
  );
}

function ExerciseRow({ exercise }: { exercise: ExerciseListItem }) {
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const details = [
    MUSCLE_LABELS[exercise.primary_muscle],
    exercise.equipment ? EQUIPMENT_LABELS[exercise.equipment] : null,
  ].filter(Boolean);

  return (
    <Link href={{ pathname: '/exercise/[id]', params: { id: exercise.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.rowText}>
          <Text style={styles.name}>{exercise.name}</Text>
          <Text style={[styles.details, { color: muted }]}>{details.join(' · ')}</Text>
        </View>
        {exercise.is_custom === 1 && (
          <Text style={[styles.badge, { color: tint, borderColor: tint }]}>Custom</Text>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filters: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  chips: {
    gap: 8,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  rowText: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  name: {
    fontSize: 16,
  },
  details: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
    opacity: 0.7,
  },
});
