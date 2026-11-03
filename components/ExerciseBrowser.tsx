import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import Badge, { NO_EQUIPMENT_LABEL } from '@/components/Badge';
import Chip from '@/components/Chip';
import PressableLink from '@/components/PressableLink';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  type Equipment,
  type MuscleGroup,
} from '@/db/exerciseTags';
import { listExercises, type ExerciseListItem } from '@/db/exercises';

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

type Props = {
  /** Muscle groups selected when the browser opens. */
  initialMuscles?: MuscleGroup[];
  /** Pick mode: rows toggle selection instead of opening the exercise. */
  onToggle?: (exercise: ExerciseListItem) => void;
  selectedIds?: ReadonlySet<string>;
  /** Extra space under the list, e.g. for a bottom button. */
  bottomInset?: number;
};

// Searchable exercise list with the Advanced (muscle group / equipment) filters.
export default function ExerciseBrowser({
  initialMuscles = [],
  onToggle,
  selectedIds,
  bottomInset = 0,
}: Props) {
  const db = useSQLiteContext();
  const [search, setSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [muscles, setMuscles] = useState<MuscleGroup[]>(initialMuscles);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [noEquipment, setNoEquipment] = useState(false);
  const [exercises, setExercises] = useState<ExerciseListItem[] | null>(null);
  const border = useThemeColor({}, 'border');
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'muted');

  const filterCount = muscles.length + equipment.length + (noEquipment ? 1 : 0);
  const filterLabels = [
    ...MUSCLE_GROUPS.filter((m) => muscles.includes(m)).map((m) => MUSCLE_LABELS[m]),
    ...(noEquipment ? [NO_EQUIPMENT_LABEL] : []),
    ...EQUIPMENT.filter((e) => equipment.includes(e)).map((e) => EQUIPMENT_LABELS[e]),
  ];

  // Reloads on focus too, so adds, edits and deletes show up when coming back.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listExercises(db, { search, muscles, equipment, noEquipment }).then((rows) => {
        if (!cancelled) setExercises(rows);
      });
      return () => {
        cancelled = true;
      };
    }, [db, search, muscles, equipment, noEquipment])
  );

  const clearFilters = () => {
    setMuscles([]);
    setEquipment([]);
    setNoEquipment(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          <AdvancedButton
            open={showAdvanced}
            count={filterCount}
            onPress={() => setShowAdvanced((open) => !open)}
          />
        </View>

        {showAdvanced && (
          <View style={[styles.panel, { backgroundColor: card }]}>
            <FilterGroup title="Muscle group">
              {MUSCLE_GROUPS.map((group) => (
                <Chip
                  key={group}
                  label={MUSCLE_LABELS[group]}
                  selected={muscles.includes(group)}
                  onPress={() => setMuscles((current) => toggle(current, group))}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Equipment">
              <Chip
                label={NO_EQUIPMENT_LABEL}
                selected={noEquipment}
                onPress={() => setNoEquipment((on) => !on)}
              />
              {EQUIPMENT.map((item) => (
                <Chip
                  key={item}
                  label={EQUIPMENT_LABELS[item]}
                  selected={equipment.includes(item)}
                  onPress={() => setEquipment((current) => toggle(current, item))}
                />
              ))}
            </FilterGroup>

            {filterCount > 0 && (
              <Pressable onPress={clearFilters} hitSlop={8} style={styles.clear}>
                <Text style={{ color: muted }}>Clear all</Text>
              </Pressable>
            )}
          </View>
        )}

        {exercises && (
          <Text style={[styles.resultCount, { color: muted }]} numberOfLines={1}>
            {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
            {filterLabels.length > 0 && ` · ${filterLabels.join(', ')}`}
          </Text>
        )}
      </View>

      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: bottomInset }}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: border }]} />
        )}
        ListEmptyComponent={
          exercises ? (
            <Text style={styles.empty}>
              {onToggle ? 'No exercises match.' : 'No exercises match. Tap + to add your own.'}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) =>
          onToggle ? (
            <Pressable
              onPress={() => onToggle(item)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selectedIds?.has(item.id) ?? false }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ExerciseRowContent exercise={item} />
              <Checkmark checked={selectedIds?.has(item.id) ?? false} />
            </Pressable>
          ) : (
            <PressableLink
              href={{ pathname: '/exercise/[id]', params: { id: item.id } }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <ExerciseRowContent exercise={item} />
            </PressableLink>
          )
        }
      />
    </View>
  );
}

function AdvancedButton({
  open,
  count,
  onPress,
}: {
  open: boolean;
  count: number;
  onPress: () => void;
}) {
  const tint = useThemeColor({}, 'tint');
  const text = useThemeColor({}, 'text');
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const active = open || count > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Advanced search, ${count} filters on` : 'Advanced search'}
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => [
        styles.advancedButton,
        { borderColor: active ? tint : border },
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={{
          ios: 'line.3.horizontal.decrease',
          android: 'filter_list',
          web: 'filter_list',
        }}
        size={18}
        tintColor={active ? tint : text}
      />
      <Text style={[styles.advancedLabel, active && { color: tint }]}>Advanced</Text>
      {count > 0 && (
        <View style={[styles.countBadge, { backgroundColor: tint }]}>
          <Text style={[styles.countLabel, { color: background }]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

function ExerciseRowContent({ exercise }: { exercise: ExerciseListItem }) {
  const muted = useThemeColor({}, 'muted');
  const details = [
    MUSCLE_LABELS[exercise.primary_muscle],
    exercise.equipment ? EQUIPMENT_LABELS[exercise.equipment] : null,
  ].filter(Boolean);

  return (
    <>
      <View style={styles.rowText}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={[styles.details, { color: muted }]}>{details.join(' · ')}</Text>
        {exercise.no_equipment === 1 && (
          <View style={styles.rowBadge}>
            <Badge label={NO_EQUIPMENT_LABEL} color="success" />
          </View>
        )}
      </View>
      {exercise.is_custom === 1 && <Badge label="Custom" />}
    </>
  );
}

function Checkmark({ checked }: { checked: boolean }) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');
  return (
    <SymbolView
      name={{
        ios: checked ? 'checkmark.circle.fill' : 'circle',
        android: checked ? 'check_circle' : 'radio_button_unchecked',
        web: checked ? 'check_circle' : 'radio_button_unchecked',
      }}
      size={24}
      tintColor={checked ? tint : border}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  search: {
    flex: 1,
  },
  advancedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  advancedLabel: {
    fontSize: 15,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 14,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  panel: {
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clear: {
    alignSelf: 'flex-end',
  },
  resultCount: {
    fontSize: 13,
    paddingBottom: 6,
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
  rowBadge: {
    marginTop: 4,
    backgroundColor: 'transparent',
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
