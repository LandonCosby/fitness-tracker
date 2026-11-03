import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import ModalScreen from '@/components/ModalScreen';
import SegmentedControl from '@/components/SegmentedControl';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import { Card } from '@/components/ui';
import { caloriesFromMacros } from '@/db/nutrition';
import { getNutritionTargets, setNutritionTarget, type NutritionTargets } from '@/db/settings';
import { WEIGHT_UNITS, type WeightUnit } from '@/db/units';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { formatNumber } from '@/lib/format';

const UNIT_LABELS: Record<WeightUnit, string> = {
  lb: 'Pounds (lb)',
  kg: 'Kilograms (kg)',
};

const TARGET_FIELDS: { name: keyof NutritionTargets; label: string; unit: string }[] = [
  { name: 'calories', label: 'Calories', unit: 'kcal' },
  { name: 'proteinG', label: 'Protein', unit: 'g' },
  { name: 'carbsG', label: 'Carbs', unit: 'g' },
  { name: 'fatG', label: 'Fat', unit: 'g' },
];

type TargetText = Record<keyof NutritionTargets, string>;

// Daily calorie/macro goals and the lb/kg unit, opened from the Nutrition tab.
export default function NutritionGoalsScreen() {
  const db = useSQLiteContext();
  const { unit, setUnit } = useWeightUnit();
  const [targets, setTargets] = useState<TargetText | null>(null);
  const muted = useThemeColor({}, 'muted');

  useEffect(() => {
    let cancelled = false;
    getNutritionTargets(db).then((saved) => {
      if (cancelled) return;
      const text = (value: number | null) => (value == null ? '' : formatNumber(value));
      setTargets({
        calories: text(saved.calories),
        proteinG: text(saved.proteinG),
        carbsG: text(saved.carbsG),
        fatG: text(saved.fatG),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  // Saved as you type; an empty field clears that target.
  const changeTarget = (name: keyof NutritionTargets, text: string) => {
    const clean = text.replace(/[^0-9.,]/g, '');
    setTargets((current) => (current ? { ...current, [name]: clean } : current));
    const value = parseFloat(clean.replace(',', '.'));
    setNutritionTarget(db, name, Number.isFinite(value) ? value : null);
  };

  const macroCalories = targets
    ? caloriesFromMacros(
        parseFloat(targets.proteinG) || 0,
        parseFloat(targets.carbsG) || 0,
        parseFloat(targets.fatG) || 0
      )
    : 0;

  return (
    <ModalScreen title="Goals & units">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        {targets && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Daily targets</Text>
            <View style={styles.grid}>
              {TARGET_FIELDS.map((field) => (
                <View key={field.name} style={styles.targetField}>
                  <Text style={[styles.targetLabel, { color: muted }]}>
                    {field.label} ({field.unit})
                  </Text>
                  <TextInput
                    value={targets[field.name]}
                    onChangeText={(text) => changeTarget(field.name, text)}
                    placeholder="No target"
                    keyboardType="decimal-pad"
                    maxLength={6}
                    accessibilityLabel={`${field.label} target in ${field.unit}`}
                  />
                </View>
              ))}
            </View>
            <Text style={[styles.hint, { color: muted }]}>
              Leave a field empty for no target. Changes save as you type.
              {macroCalories > 0 &&
                ` Your protein, carbs and fat targets add up to ${macroCalories.toLocaleString()} kcal.`}
            </Text>
          </Card>
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Weight unit</Text>
          <SegmentedControl
            options={WEIGHT_UNITS.map((option) => ({ value: option, label: UNIT_LABELS[option] }))}
            value={unit}
            onChange={setUnit}
          />
          <Text style={[styles.hint, { color: muted }]}>
            Used for body weight and lifts everywhere in the app. Sets you&apos;ve already logged keep
            the unit they were entered in, so switching never changes your history.
          </Text>
        </Card>
      </ScrollView>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  targetField: {
    width: '47%',
    flexGrow: 1,
    gap: 4,
  },
  targetLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
