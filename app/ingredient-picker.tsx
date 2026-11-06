import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { SkeletonRows } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ModalScreen from '@/components/ModalScreen';
import SegmentedControl from '@/components/SegmentedControl';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import { searchFoods, type SavedFood } from '@/db/nutrition';
import { deliverPickedFood } from '@/lib/foodPicker';
import { formatCalories, formatNumber } from '@/lib/format';

type Source = 'ingredient' | 'custom';

// Picks one ingredient for a recipe: built-in ingredients or your custom ingredients
// (custom meals can't go inside other meals).
export default function IngredientPickerScreen() {
  const db = useSQLiteContext();
  const [source, setSource] = useState<Source>('ingredient');
  const [search, setSearch] = useState('');
  const [foods, setFoods] = useState<SavedFood[] | null>(null);
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');

  useEffect(() => {
    let cancelled = false;
    searchFoods(db, { search, category: source }).then((rows) => {
      if (!cancelled) setFoods(rows.filter((f) => !f.isRecipe));
    });
    return () => {
      cancelled = true;
    };
  }, [db, search, source]);

  return (
    <ModalScreen title="Add ingredient">
      <View style={styles.header}>
        <SegmentedControl
          options={[
            { value: 'ingredient' as const, label: 'Ingredients' },
            { value: 'custom' as const, label: 'My ingredients' },
          ]}
          value={source}
          onChange={(next) => {
            setSource(next);
            setFoods(null);
          }}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search ingredients"
          autoCorrect={false}
          clearButtonMode="while-editing"
          autoFocus
        />
      </View>
      <FlatList
        data={foods ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: border }]} />}
        ListEmptyComponent={
          !foods ? (
            <SkeletonRows />
          ) : search.trim() ? (
            <EmptyState
              icon={{ ios: 'magnifyingglass', material: 'search' }}
              title={`No results for "${search.trim()}"`}
              message={source === 'ingredient' ? 'Try My ingredients, or a shorter search.' : 'Try the built-in Ingredients tab.'}
            />
          ) : (
            <EmptyState
              icon={{ ios: 'carrot.fill', material: 'nutrition' }}
              title="No ingredients of your own yet"
              message="Create one from Add food → Custom → Create ingredient."
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              deliverPickedFood(item.id);
              router.back();
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={[styles.detail, { color: muted }]} numberOfLines={1}>
                {item.servingLabel ?? '1 serving'}
                {item.servingGrams ? ` (${formatNumber(item.servingGrams)} g)` : ''} · P{' '}
                {formatNumber(item.proteinG)} · C {formatNumber(item.carbsG)} · F {formatNumber(item.fatG)}
              </Text>
            </View>
            <Text style={styles.calories}>{formatCalories(item.calories)} kcal</Text>
          </Pressable>
        )}
      />
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingBottom: 8,
    gap: 10,
  },
  list: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  detail: {
    fontSize: 13,
    marginTop: 2,
  },
  calories: {
    fontSize: 15,
    fontWeight: '700',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  pressed: {
    opacity: 0.6,
  },
});
