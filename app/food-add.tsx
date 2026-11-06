import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showAlert } from '@/components/AlertSheet';
import { SkeletonRows } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import Chip from '@/components/Chip';
import IconButton from '@/components/IconButton';
import ModalScreen from '@/components/ModalScreen';
import SegmentedControl from '@/components/SegmentedControl';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import { Button } from '@/components/ui';
import {
  FOOD_CATEGORIES,
  FOOD_CATEGORY_LABELS,
  MEALS,
  MEAL_LABELS,
  deleteFood,
  entryTotals,
  listFoodBrands,
  logFood,
  mealForTime,
  searchFoods,
  type SavedFood,
} from '@/db/nutrition';
import { toDateKey } from '@/db/records';
import type { FoodCategory, Meal } from '@/db/types';
import {
  formatCalories,
  formatNumber,
  formatServings,
  gramsToOunces,
  ouncesToGrams,
} from '@/lib/format';

const SERVING_STEP = 0.5;
const QUICK_SERVINGS = [0.5, 1, 1.5, 2];
const QUICK_AMOUNTS: Record<'g' | 'oz', number[]> = { g: [50, 100, 150, 200], oz: [2, 4, 6, 8] };

type AmountMode = 'servings' | 'g' | 'oz';

const SEARCH_PLACEHOLDERS: Record<FoodCategory, string> = {
  ingredient: 'Search ingredients',
  fast_food: 'Search restaurants and menu items',
  meal: 'Search meals',
  custom: 'Search your foods',
};

function isMeal(value: unknown): value is Meal {
  return (MEALS as readonly unknown[]).includes(value);
}

// Find a food (tabs: Ingredients, Fast food, Meals, Custom) and log it by servings or by
// weight. Opened with ?date=&meal=.
export default function FoodAddScreen() {
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const date = params.date ?? toDateKey();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [meal, setMeal] = useState<Meal>(isMeal(params.meal) ? params.meal : mealForTime());
  const [category, setCategory] = useState<FoodCategory>('ingredient');
  const [brand, setBrand] = useState<string | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [foods, setFoods] = useState<SavedFood[] | null>(null);
  const [selected, setSelected] = useState<SavedFood | null>(null);
  const [mode, setMode] = useState<AmountMode>('servings');
  const [amount, setAmount] = useState('1');
  const [saving, setSaving] = useState(false);

  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');
  const surface = useThemeColor({}, 'cardRaised');

  const load = useCallback(() => {
    let cancelled = false;
    searchFoods(db, { search, category, brand: category === 'fast_food' ? brand : null }).then((rows) => {
      if (!cancelled) setFoods(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [db, search, category, brand]);

  useFocusEffect(load);

  useEffect(() => {
    let cancelled = false;
    listFoodBrands(db).then((rows) => {
      if (!cancelled) setBrands(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  // Weight modes need the serving's weight; foods without one are logged in servings.
  const effectiveMode: AmountMode = selected?.servingGrams ? mode : 'servings';
  const amountValue = parseFloat(amount.replace(',', '.'));
  const validAmount = Number.isFinite(amountValue) && amountValue > 0;
  const grams =
    effectiveMode === 'g' ? amountValue : effectiveMode === 'oz' ? ouncesToGrams(amountValue) : null;
  const servingsValue =
    !validAmount || !selected
      ? NaN
      : grams != null && selected.servingGrams
        ? grams / selected.servingGrams
        : amountValue;

  const select = (food: SavedFood) => {
    setSelected(food);
    setAmount(defaultAmount(food.servingGrams ? mode : 'servings', food));
  };

  const changeMode = (next: AmountMode) => {
    if (!selected?.servingGrams) return;
    // Keep the same quantity when switching, e.g. 1 serving of 112 g → 112 g → 4 oz.
    const currentGrams = !validAmount
      ? null
      : effectiveMode === 'servings'
        ? amountValue * selected.servingGrams
        : grams;
    setMode(next);
    if (currentGrams == null) {
      setAmount(defaultAmount(next, selected));
      return;
    }
    setAmount(
      formatNumber(
        next === 'g'
          ? Math.round(currentGrams)
          : next === 'oz'
            ? Math.round(gramsToOunces(currentGrams) * 10) / 10
            : Math.round((currentGrams / selected.servingGrams) * 100) / 100
      )
    );
  };

  const add = async () => {
    if (!selected || !Number.isFinite(servingsValue) || servingsValue <= 0) return;
    setSaving(true);
    try {
      await logFood(db, selected, { date, meal, servings: servingsValue });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  // Long press: custom meals can be edited (their ingredients); anything can be removed.
  const onLongPress = (food: SavedFood) => {
    if (!food.isRecipe) return confirmDelete(food);
    showAlert(food.name, undefined, [
      {
        text: 'Edit meal',
        onPress: () => {
          setSelected(null);
          router.push({ pathname: '/recipe-form', params: { id: food.id } });
        },
      },
      { text: 'Remove', style: 'destructive', onPress: () => confirmDelete(food) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDelete = (food: SavedFood) => {
    showAlert(
      `Remove "${food.name}"?`,
      'It will no longer be listed here. Days you already logged it on are not changed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteFood(db, food.id);
            if (selected?.id === food.id) setSelected(null);
            setFoods((current) => current?.filter((f) => f.id !== food.id) ?? null);
          },
        },
      ]
    );
  };

  const stepServings = (delta: number) => {
    const base = validAmount ? amountValue : 1;
    const next = Math.max(SERVING_STEP, Math.round((base + delta) * 2) / 2);
    setAmount(formatNumber(next));
  };

  const createFood = () =>
    router.replace({ pathname: '/food-entry', params: { date, meal, name: search.trim() } });

  const preview =
    selected && Number.isFinite(servingsValue) && servingsValue > 0
      ? entryTotals({ ...selected, servings: servingsValue })
      : null;

  return (
    <ModalScreen title={`Add to ${MEAL_LABELS[meal]}`}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.chips}>
            {MEALS.map((m) => (
              <Chip key={m} label={MEAL_LABELS[m]} selected={meal === m} onPress={() => setMeal(m)} />
            ))}
          </View>
          <SegmentedControl
            compact
            options={FOOD_CATEGORIES.map((c) => ({ value: c, label: FOOD_CATEGORY_LABELS[c] }))}
            value={category}
            onChange={(c) => {
              setCategory(c);
              setSelected(null);
              setFoods(null);
            }}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={SEARCH_PLACEHOLDERS[category]}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {category === 'fast_food' && brands.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.brandRow}>
              <Chip label="All" selected={brand == null} onPress={() => setBrand(null)} />
              {brands.map((b) => (
                <Chip
                  key={b}
                  label={b}
                  selected={brand === b}
                  onPress={() => setBrand(brand === b ? null : b)}
                />
              ))}
            </ScrollView>
          )}
          {category === 'custom' && (
            <View style={styles.createRow}>
              <Button label="+ Create ingredient" variant="soft" onPress={createFood} style={styles.createButton} />
              <Button
                label="+ Create meal"
                variant="soft"
                onPress={() => router.push('/recipe-form')}
                style={styles.createButton}
              />
            </View>
          )}
        </View>

        <FlatList
          data={foods ?? []}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: selected ? 340 : 24 }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: border }]} />}
          ListEmptyComponent={
            !foods ? (
              <SkeletonRows />
            ) : search.trim() ? (
              <EmptyState
                icon={{ ios: 'magnifyingglass', material: 'search' }}
                title={`No results for "${search.trim()}"`}
                message="Check the spelling, try another tab, or add it yourself."
                actionLabel={`Create "${search.trim()}"`}
                onAction={createFood}
              />
            ) : category === 'custom' ? (
              <EmptyState
                icon={{ ios: 'fork.knife', material: 'restaurant' }}
                title="Nothing custom yet"
                message="Create an ingredient, or build a meal from ingredients like a recipe. It's saved here for next time."
              />
            ) : (
              <EmptyState icon={{ ios: 'tray', material: 'inbox' }} title="Nothing here" />
            )
          }
          ListFooterComponent={
            category !== 'custom' && foods ? (
              <Pressable onPress={createFood} style={styles.footer} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.footerLabel, { color: muted }]}>
                  Can&apos;t find it? <Text style={styles.footerLink}>Create a food ›</Text>
                </Text>
              </Pressable>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => select(item)}
              onLongPress={() => onLongPress(item)}
              accessibilityHint={item.isRecipe ? 'Long press to edit or remove' : 'Long press to remove from the list'}
              style={({ pressed }) => [
                styles.row,
                selected?.id === item.id && { backgroundColor: surface },
                pressed && styles.pressed,
              ]}>
              <View style={styles.rowText}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={[styles.foodDetail, { color: muted }]} numberOfLines={1}>
                  {describeServing(item)} · P {formatNumber(item.proteinG)} · C{' '}
                  {formatNumber(item.carbsG)} · F {formatNumber(item.fatG)}
                </Text>
              </View>
              <Text style={styles.foodCalories}>{formatCalories(item.calories)} kcal</Text>
            </Pressable>
          )}
        />

        {selected && (
          <View
            style={[
              styles.sheet,
              {
                borderTopColor: border,
                backgroundColor: card,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBlock}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {selected.name}
                </Text>
                <Text style={[styles.foodDetail, { color: muted }]} numberOfLines={1}>
                  {describeServing(selected)}
                  {selected.servingGrams ? ` = ${formatNumber(selected.servingGrams)} g` : ''}
                </Text>
              </View>
              <IconButton
                ios="xmark"
                material="close"
                label="Cancel"
                color="muted"
                onPress={() => setSelected(null)}
              />
            </View>

            {selected.servingGrams != null && (
              <SegmentedControl
                compact
                options={[
                  { value: 'servings' as const, label: 'Servings' },
                  { value: 'g' as const, label: 'Grams' },
                  { value: 'oz' as const, label: 'Ounces' },
                ]}
                value={effectiveMode}
                onChange={changeMode}
              />
            )}

            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { color: muted }]}>
                {effectiveMode === 'servings' ? 'Servings' : effectiveMode === 'g' ? 'Grams' : 'Ounces'}
              </Text>
              {effectiveMode === 'servings' && (
                <IconButton
                  ios="minus.circle"
                  material="remove_circle_outline"
                  label="Fewer servings"
                  color="tint"
                  size={28}
                  onPress={() => stepServings(-SERVING_STEP)}
                />
              )}
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9.,]/g, ''))}
                keyboardType="decimal-pad"
                maxLength={6}
                selectTextOnFocus
                accessibilityLabel={
                  effectiveMode === 'servings' ? 'Servings' : `Amount in ${effectiveMode === 'g' ? 'grams' : 'ounces'}`
                }
              />
              {effectiveMode === 'servings' && (
                <IconButton
                  ios="plus.circle"
                  material="add_circle_outline"
                  label="More servings"
                  color="tint"
                  size={28}
                  onPress={() => stepServings(SERVING_STEP)}
                />
              )}
            </View>
            <View style={styles.chips}>
              {(effectiveMode === 'servings' ? QUICK_SERVINGS : QUICK_AMOUNTS[effectiveMode]).map(
                (value) => (
                  <Chip
                    key={value}
                    label={effectiveMode === 'servings' ? formatNumber(value) : `${value} ${effectiveMode}`}
                    selected={validAmount && amountValue === value}
                    onPress={() => setAmount(formatNumber(value))}
                  />
                )
              )}
            </View>

            {preview && (
              <Text style={[styles.preview, { color: muted }]}>
                {effectiveMode === 'servings'
                  ? formatServings(servingsValue, selected.servingLabel)
                  : `${formatNumber(amountValue)} ${effectiveMode}`}{' '}
                = <Text style={styles.previewCalories}>{formatCalories(preview.calories)} kcal</Text>{' '}
                · P {formatNumber(preview.proteinG)} · C {formatNumber(preview.carbsG)} · F{' '}
                {formatNumber(preview.fatG)}
              </Text>
            )}

            <Button label={`Add to ${MEAL_LABELS[meal]}`} onPress={add} disabled={!preview || saving} />
          </View>
        )}
      </KeyboardAvoidingView>
    </ModalScreen>
  );
}

// "McDonald's · Medium" or "4 oz (112 g)".
function describeServing(food: SavedFood): string {
  return [food.isRecipe ? 'Meal' : null, food.brand, food.servingLabel ?? '1 serving']
    .filter(Boolean)
    .join(' · ');
}

function defaultAmount(mode: AmountMode, food: SavedFood): string {
  if (mode === 'servings' || !food.servingGrams) return '1';
  return mode === 'g'
    ? formatNumber(Math.round(food.servingGrams))
    : formatNumber(Math.round(gramsToOunces(food.servingGrams) * 10) / 10);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brandRow: {
    gap: 6,
  },
  createRow: {
    flexDirection: 'row',
    gap: 8,
  },
  createButton: {
    flex: 1,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
  },
  foodDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  foodCalories: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 14,
  },
  footerLink: {
    fontWeight: '700',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetTitleBlock: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  amountLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  amountInput: {
    width: 84,
    textAlign: 'center',
    paddingVertical: 8,
    fontWeight: '700',
  },
  preview: {
    fontSize: 13,
  },
  previewCalories: {
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.6,
  },
});
