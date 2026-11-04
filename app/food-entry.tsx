import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';

import Chip from '@/components/Chip';
import ModalScreen from '@/components/ModalScreen';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import {
  MEALS,
  MEAL_LABELS,
  caloriesFromMacros,
  createEntry,
  deleteEntry,
  entryTotals,
  getEntry,
  mealForTime,
  saveFood,
  updateEntry,
} from '@/db/nutrition';
import { toDateKey } from '@/db/records';
import type { Meal } from '@/db/types';
import { formatCalories, formatNumber } from '@/lib/format';

function isMeal(value: unknown): value is Meal {
  return (MEALS as readonly unknown[]).includes(value);
}

function parse(text: string): number | null {
  const value = parseFloat(text.replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

const decimalOnly = (text: string) => text.replace(/[^0-9.,]/g, '');

// New food (?date=&meal=&name=) or editing a logged entry (?id=).
export default function FoodEntryScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    meal?: string;
    name?: string;
  }>();
  const { id } = params;
  const db = useSQLiteContext();
  const isEditing = id != null;

  const [loaded, setLoaded] = useState(!isEditing);
  const [date, setDate] = useState(params.date ?? toDateKey());
  const [meal, setMeal] = useState<Meal>(isMeal(params.meal) ? params.meal : mealForTime());
  const [name, setName] = useState(params.name ?? '');
  const [servingLabel, setServingLabel] = useState('');
  const [servingGrams, setServingGrams] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servings, setServings] = useState('1');
  const [saveToFoods, setSaveToFoods] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const danger = useThemeColor({}, 'danger');
  const muted = useThemeColor({}, 'muted');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getEntry(db, id).then((entry) => {
      if (cancelled) return;
      if (!entry) {
        router.back();
        return;
      }
      setDate(entry.date);
      setMeal(entry.meal);
      setName(entry.name);
      setServingLabel(entry.servingLabel ?? '');
      setCalories(formatNumber(entry.calories));
      setProtein(entry.proteinG ? formatNumber(entry.proteinG) : '');
      setCarbs(entry.carbsG ? formatNumber(entry.carbsG) : '');
      setFat(entry.fatG ? formatNumber(entry.fatG) : '');
      setServings(formatNumber(entry.servings));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  const proteinG = parse(protein) ?? 0;
  const carbsG = parse(carbs) ?? 0;
  const fatG = parse(fat) ?? 0;
  const hasMacros = proteinG + carbsG + fatG > 0;
  const suggestedCalories = hasMacros ? caloriesFromMacros(proteinG, carbsG, fatG) : null;
  // A blank calories field uses the value worked out from the macros.
  const caloriesValue = parse(calories) ?? suggestedCalories;
  const servingsValue = parse(servings);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter a name.');
    if (caloriesValue == null)
      return setError('Enter calories, or protein/carbs/fat to work them out.');
    if (!servingsValue) return setError('Servings must be more than 0.');

    const gramsValue = parse(servingGrams);
    const values = {
      name: trimmed,
      servingLabel,
      servingGrams: gramsValue != null && gramsValue > 0 ? gramsValue : null,
      calories: caloriesValue,
      proteinG,
      carbsG,
      fatG,
    };

    setSaving(true);
    try {
      if (id) {
        await updateEntry(db, id, { ...values, meal, servings: servingsValue });
      } else {
        const foodId = saveToFoods ? await saveFood(db, values) : null;
        await createEntry(db, { ...values, date, meal, servings: servingsValue, foodId });
      }
      router.back();
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!id) return;
    Alert.alert('Delete entry?', `"${name}" will be removed from this day.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(db, id);
          router.back();
        },
      },
    ]);
  };

  const title = isEditing ? 'Edit entry' : 'Create ingredient';

  if (!loaded) return <ModalScreen title={title}>{null}</ModalScreen>;

  const totals =
    caloriesValue != null && servingsValue && servingsValue !== 1
      ? entryTotals({ calories: caloriesValue, proteinG, carbsG, fatG, servings: servingsValue })
      : null;

  return (
    <ModalScreen title={title}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder="e.g. Greek yogurt"
            autoFocus={!isEditing && !params.name}
            autoCapitalize="sentences"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Serving size (optional)</Text>
          <TextInput
            value={servingLabel}
            onChangeText={setServingLabel}
            placeholder="e.g. 1 cup, 170 g, 1 bar"
          />
        </View>

        {!isEditing && (
          <View style={styles.field}>
            <Text style={styles.label}>Serving weight in grams (optional)</Text>
            <TextInput
              value={servingGrams}
              onChangeText={(text) => setServingGrams(decimalOnly(text))}
              placeholder="e.g. 170"
              keyboardType="decimal-pad"
              maxLength={6}
            />
            <Text style={[styles.hint, { color: muted }]}>
              Lets you log this food by weight (grams or ounces) next time.
            </Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Per serving</Text>
          <View style={styles.grid}>
            <NumberField
              label="Calories"
              unit="kcal"
              value={calories}
              placeholder={suggestedCalories != null ? String(suggestedCalories) : '0'}
              onChange={(text) => {
                setCalories(decimalOnly(text));
                setError(null);
              }}
            />
            <NumberField
              label="Protein"
              unit="g"
              value={protein}
              onChange={(t) => setProtein(decimalOnly(t))}
            />
            <NumberField
              label="Carbs"
              unit="g"
              value={carbs}
              onChange={(t) => setCarbs(decimalOnly(t))}
            />
            <NumberField
              label="Fat"
              unit="g"
              value={fat}
              onChange={(t) => setFat(decimalOnly(t))}
            />
          </View>
          {suggestedCalories != null && !calories && (
            <Text style={[styles.hint, { color: muted }]}>
              Calories left blank use {suggestedCalories} kcal, worked out from the macros (4 per
              gram of protein and carbs, 9 per gram of fat).
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Servings eaten</Text>
          <TextInput
            style={styles.servingsInput}
            value={servings}
            onChangeText={(text) => setServings(decimalOnly(text))}
            keyboardType="decimal-pad"
            maxLength={5}
            selectTextOnFocus
          />
          {totals && (
            <Text style={[styles.hint, { color: muted }]}>
              Total: {formatCalories(totals.calories)} kcal · P {formatNumber(totals.proteinG)} · C{' '}
              {formatNumber(totals.carbsG)} · F {formatNumber(totals.fatG)}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Meal</Text>
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
        </View>

        {!isEditing && (
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={styles.label}>Save to Custom foods</Text>
              <Text style={[styles.hint, { color: muted }]}>Log it again later in one tap.</Text>
            </View>
            <Switch
              value={saveToFoods}
              onValueChange={setSaveToFoods}
              trackColor={{ true: tint }}
              accessibilityLabel="Save to Custom foods"
            />
          </View>
        )}

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
            {isEditing ? 'Save changes' : `Add to ${MEAL_LABELS[meal]}`}
          </Text>
        </Pressable>

        {isEditing && (
          <Pressable
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              { borderColor: danger },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.deleteLabel, { color: danger }]}>Delete entry</Text>
          </Pressable>
        )}
      </ScrollView>
    </ModalScreen>
  );
}

function NumberField({
  label,
  unit,
  value,
  placeholder = '0',
  onChange,
}: {
  label: string;
  unit: string;
  value: string;
  placeholder?: string;
  onChange: (text: string) => void;
}) {
  const muted = useThemeColor({}, 'muted');
  return (
    <View style={styles.numberField}>
      <Text style={[styles.numberLabel, { color: muted }]}>
        {label} ({unit})
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType="decimal-pad"
        maxLength={7}
        selectTextOnFocus
        accessibilityLabel={`${label} in ${unit}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  numberField: {
    width: '47%',
    flexGrow: 1,
    gap: 4,
  },
  numberLabel: {
    fontSize: 13,
  },
  servingsInput: {
    width: 96,
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
  deleteButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.6,
  },
});
