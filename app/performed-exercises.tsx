import { FontSize, FontWeight, Space } from '@/constants/Design';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { SkeletonRows } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ModalScreen from '@/components/ModalScreen';
import { formatRecord, recordKindsFor } from '@/components/RecordTiles';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import { listRecords, type RecordsListItem } from '@/db/progress';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { deliverPickedExercises } from '@/lib/exercisePicker';
import { formatDay } from '@/lib/format';

// Picks one exercise you've logged sets for (most recently trained first), for the
// Exercise progress chart. Opened with openExercisePicker(..., { performedOnly: true }).
export default function PerformedExercisesScreen() {
  const db = useSQLiteContext();
  const { unit } = useWeightUnit();
  const [items, setItems] = useState<RecordsListItem[] | null>(null);
  const [search, setSearch] = useState('');
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');

  useEffect(() => {
    let cancelled = false;
    listRecords(db, unit, 1000).then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [db, unit]);

  const query = search.trim().toLowerCase();
  const visible = (items ?? []).filter((item) => item.name.toLowerCase().includes(query));

  return (
    <ModalScreen title="Your lifts">
      <View style={styles.header}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search lifts you've done"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.exerciseId}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: border }]} />}
        ListEmptyComponent={
          !items ? (
            <SkeletonRows />
          ) : items.length === 0 ? (
            <EmptyState
              icon={{ ios: 'dumbbell.fill', material: 'fitness_center' }}
              title="No lifts yet"
              message="Lifts appear here once you finish a workout with them."
            />
          ) : (
            <EmptyState
              icon={{ ios: 'magnifyingglass', material: 'search' }}
              title={`No results for "${search.trim()}"`}
              message="Only lifts you've logged are listed here."
            />
          )
        }
        renderItem={({ item }) => {
          const [kind] = recordKindsFor(item.isTimed, item.records);
          const best = formatRecord(kind, item.records, unit);
          return (
            <Pressable
              onPress={() => {
                deliverPickedExercises([item.exerciseId]);
                router.back();
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={[styles.detail, { color: muted }]}>
                  Last trained {formatDay(item.lastPerformedAt)}
                </Text>
              </View>
              {best && <Text style={styles.best}>{best}</Text>}
            </Pressable>
          );
        }}
      />
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Space.lg,
    paddingBottom: Space.sm,
  },
  list: {
    paddingBottom: Space.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.semibold,
  },
  detail: {
    fontSize: FontSize.caption,
    marginTop: Space.micro,
  },
  best: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.heavy,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Space.lg,
  },
  pressed: {
    opacity: 0.6,
  },
});
