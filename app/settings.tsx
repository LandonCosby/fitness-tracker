import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
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

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { unit, setUnit } = useWeightUnit();
  const [targets, setTargets] = useState<TargetText | null>(null);
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weight unit</Text>
        <View style={[styles.segmented, { borderColor: tint }]} accessibilityRole="radiogroup">
          {WEIGHT_UNITS.map((option) => {
            const selected = option === unit;
            return (
              <Pressable
                key={option}
                onPress={() => setUnit(option)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={({ pressed }) => [
                  styles.segment,
                  selected && { backgroundColor: tint },
                  pressed && !selected && styles.pressed,
                ]}>
                <Text style={[styles.segmentLabel, selected && { color: background }]}>
                  {UNIT_LABELS[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.hint, { color: muted }]}>
          Weights are shown in this unit. Sets you&apos;ve already logged keep the unit they were
          entered in, so switching never changes your history.
        </Text>
      </View>

      {targets && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily nutrition targets</Text>
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
            Leave a field empty for no target.
            {macroCalories > 0 &&
              ` Your protein, carbs and fat targets add up to ${macroCalories.toLocaleString()} kcal.`}
          </Text>
        </View>
      )}

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 32,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: '500',
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
  },
  hint: {
    fontSize: 13,
  },
});
