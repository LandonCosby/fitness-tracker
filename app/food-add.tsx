import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Chip from '@/components/Chip';
import IconButton from '@/components/IconButton';
import ModalScreen from '@/components/ModalScreen';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import {
  MEALS,
  MEAL_LABELS,
  deleteFood,
  entryTotals,
  logFood,
  mealForTime,
  searchFoods,
  type SavedFood,
} from '@/db/nutrition';
import { toDateKey } from '@/db/records';
import type { Meal } from '@/db/types';
import { formatCalories, formatNumber, formatServings } from '@/lib/format';

const SERVING_STEP = 0.5;
const QUICK_SERVINGS = [0.5, 1, 1.5, 2];

function isMeal(value: unknown): value is Meal {
  return (MEALS as readonly unknown[]).includes(value);
}

// Search My foods and log one with a number of servings. Opened with ?date=&meal=.
export default function FoodAddScreen() {
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const date = params.date ?? toDateKey();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();

  const [meal, setMeal] = useState<Meal>(isMeal(params.meal) ? params.meal : mealForTime());
  const [search, setSearch] = useState('');
  const [foods, setFoods] = useState<SavedFood[] | null>(null);
  const [selected, setSelected] = useState<SavedFood | null>(null);
  const [servings, setServings] = useState('1');
  const [saving, setSaving] = useState(false);

  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const card = useThemeColor({}, 'card');

  const load = useCallback(() => {
    let cancelled = false;
    searchFoods(db, search).then((rows) => {
      if (!cancelled) setFoods(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [db, search]);

  useFocusEffect(load);

  const servingsValue = parseFloat(servings.replace(',', '.'));
  const validServings = Number.isFinite(servingsValue) && servingsValue > 0;

  const add = async () => {
    if (!selected || !validServings) return;
    setSaving(true);
    try {
      await logFood(db, selected, { date, meal, servings: servingsValue });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (food: SavedFood) => {
    Alert.alert(
      `Remove "${food.name}" from My foods?`,
      'Days you already logged it on are not changed.',
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
    const base = validServings ? servingsValue : 1;
    const next = Math.max(SERVING_STEP, Math.round((base + delta) * 2) / 2);
    setServings(formatNumber(next));
  };

  const preview =
    selected && validServings ? entryTotals({ ...selected, servings: servingsValue }) : null;

  return (
    <ModalScreen title={`Add to ${MEAL_LABELS[meal]}`}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.chips}>
            {MEALS.map((m) => (
              <Chip
                key={m}
                label={MEAL_LABELS[m]}
                selected={meal === m}
                onPress={() => setMeal(m)}
              />
            ))}
          </View>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search my foods"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          <Pressable
            onPress={() =>
              router.replace({
                pathname: '/food-entry',
                params: { date, meal, name: search.trim() },
              })
            }
            style={({ pressed }) => [
              styles.newFood,
              { borderColor: tint },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.newFoodLabel, { color: tint }]}>
              + New food{search.trim() ? ` "${search.trim()}"` : ''}
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={foods ?? []}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: selected ? 260 : 24 }}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: border }]} />
          )}
          ListEmptyComponent={
            foods ? (
              <Text style={[styles.empty, { color: muted }]}>
                {search.trim()
                  ? 'No saved foods match.'
                  : 'No saved foods yet. Foods you add are saved here so you can log them again in one tap.'}
              </Text>
            ) : undefined
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setSelected(item);
                setServings('1');
              }}
              onLongPress={() => confirmDelete(item)}
              accessibilityHint="Long press to remove from My foods"
              style={({ pressed }) => [
                styles.row,
                selected?.id === item.id && { backgroundColor: card },
                pressed && styles.pressed,
              ]}>
              <View style={styles.rowText}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={[styles.foodDetail, { color: muted }]}>
                  {item.servingLabel ?? '1 serving'} · P {formatNumber(item.proteinG)} · C{' '}
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
              { borderTopColor: border, paddingBottom: Math.max(insets.bottom, 12) },
            ]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {selected.name}
              </Text>
              <IconButton
                ios="xmark"
                material="close"
                label="Cancel"
                color="muted"
                onPress={() => setSelected(null)}
              />
            </View>

            <View style={styles.servingsRow}>
              <Text style={[styles.servingsLabel, { color: muted }]}>Servings</Text>
              <IconButton
                ios="minus.circle"
                material="remove_circle_outline"
                label="Fewer servings"
                color="tint"
                size={28}
                onPress={() => stepServings(-SERVING_STEP)}
              />
              <TextInput
                style={styles.servingsInput}
                value={servings}
                onChangeText={(text) => setServings(text.replace(/[^0-9.,]/g, ''))}
                keyboardType="decimal-pad"
                maxLength={5}
                selectTextOnFocus
                accessibilityLabel="Servings"
              />
              <IconButton
                ios="plus.circle"
                material="add_circle_outline"
                label="More servings"
                color="tint"
                size={28}
                onPress={() => stepServings(SERVING_STEP)}
              />
            </View>
            <View style={styles.chips}>
              {QUICK_SERVINGS.map((value) => (
                <Chip
                  key={value}
                  label={formatNumber(value)}
                  selected={validServings && servingsValue === value}
                  onPress={() => setServings(formatNumber(value))}
                />
              ))}
            </View>

            {preview && (
              <Text style={[styles.preview, { color: muted }]}>
                {formatServings(servingsValue, selected.servingLabel)} ={' '}
                {formatCalories(preview.calories)} kcal · P {formatNumber(preview.proteinG)} · C{' '}
                {formatNumber(preview.carbsG)} · F {formatNumber(preview.fatG)}
              </Text>
            )}

            <Pressable
              onPress={add}
              disabled={!validServings || saving}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: tint },
                (pressed || !validServings || saving) && styles.pressed,
              ]}>
              <Text style={[styles.buttonLabel, { color: background }]}>
                Add to {MEAL_LABELS[meal]}
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'transparent',
  },
  newFood: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  newFoodLabel: {
    fontSize: 15,
    fontWeight: '500',
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
    backgroundColor: 'transparent',
  },
  foodName: {
    fontSize: 16,
  },
  foodDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  foodCalories: {
    fontSize: 15,
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
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  servingsLabel: {
    flex: 1,
    fontSize: 15,
  },
  servingsInput: {
    width: 64,
    textAlign: 'center',
    paddingVertical: 6,
  },
  preview: {
    fontSize: 13,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
