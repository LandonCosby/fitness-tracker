import { FontSize, FontWeight, Space } from '@/constants/Design';
import CalorieRing from '@/components/nutrition/CalorieRing';
import DateStrip from '@/components/nutrition/DateStrip';
import MacroPills from '@/components/nutrition/MacroPills';
import { ProgressSkeleton } from '@/components/ScreenSkeletons';
import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import PressableLink from '@/components/PressableLink';
import ProgressBar from '@/components/ProgressBar';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Button, Card, TextAction } from '@/components/ui';
import {
  MEALS,
  MEAL_LABELS,
  entryTotals,
  listEntriesForDate,
  sumNutrients,
  type LoggedFood,
  type Nutrients,
} from '@/db/nutrition';
import { toDateKey } from '@/db/records';
import { getNutritionTargets, type NutritionTargets } from '@/db/settings';
import type { Meal } from '@/db/types';
import { formatAmount, formatCalories, formatNumber } from '@/lib/format';

export default function NutritionScreen() {
  const db = useSQLiteContext();
  const [date, setDate] = useState(() => toDateKey());
  const [entries, setEntries] = useState<LoggedFood[] | null>(null);
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const muted = useThemeColor({}, 'muted');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([listEntriesForDate(db, date), getNutritionTargets(db)]).then(
        ([rows, goals]) => {
          if (cancelled) return;
          setEntries(rows);
          setTargets(goals);
        }
      );
      return () => {
        cancelled = true;
      };
    }, [db, date])
  );

  const totals = sumNutrients((entries ?? []).map(entryTotals));

  if (!targets || !entries) return <ProgressSkeleton />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DateStrip date={date} onChange={(next) => { setEntries(null); setDate(next); }} />

      {targets && <Summary totals={totals} targets={targets} />}

      {entries &&
        MEALS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            date={date}
            entries={entries.filter((e) => e.meal === meal)}
          />
        ))}

      {targets && Object.values(targets).every((t) => t == null) && (
        <Link href="/nutrition-goals" asChild>
          <Pressable hitSlop={8}>
            <Text style={[styles.hint, { color: muted }]}>Set daily calorie and macro targets ›</Text>
          </Pressable>
        </Link>
      )}
    </ScrollView>
  );
}

function Summary({ totals, targets }: { totals: Nutrients; targets: NutritionTargets }) {
  const muted = useThemeColor({}, 'muted');


  return (
    <Card style={styles.summary}>
      <View style={styles.summaryHeader}>
        <Text style={[styles.eyebrow, { color: muted }]}>CALORIES</Text>
        <Link href="/nutrition-goals" asChild>
          <TextAction label="Edit goals" accessibilityLabel="Edit nutrition goals and units" />
        </Link>
      </View>
      <CalorieRing eaten={totals.calories} target={targets.calories} />

      <View style={styles.macros}>
        <Macro colorToken="protein" label="Protein" value={totals.proteinG} target={targets.proteinG} />
        <Macro colorToken="carbs" label="Carbs" value={totals.carbsG} target={targets.carbsG} />
        <Macro colorToken="fat" label="Fat" value={totals.fatG} target={targets.fatG} />
      </View>
    </Card>
  );
}

function Macro({ label, value, target, colorToken }: { label: string; value: number; target: number | null; colorToken: 'protein' | 'carbs' | 'fat' }) {
  const color = useThemeColor({}, colorToken);
  const muted = useThemeColor({}, 'muted');
  return (
    <View style={styles.macro}>
      <Text style={[styles.macroLabel, { color }]}>{label}</Text>
      <Text style={styles.macroValue}>
        {formatNumber(value)}
        <Text style={{ color: muted }}>{target != null ? ` / ${formatNumber(target)} g` : ' g'}</Text>
      </Text>
      {target != null && <ProgressBar value={value} max={target} height={5} color={color} />}
    </View>
  );
}

function MealSection({
  meal,
  date,
  entries,
}: {
  meal: Meal;
  date: string;
  entries: LoggedFood[];
}) {
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');
  const total = sumNutrients(entries.map(entryTotals));

  return (
    <Card style={styles.meal}>
      <View style={styles.mealHeader}>
        <View style={styles.mealHeading}>
          <Text style={styles.mealTitle}>{MEAL_LABELS[meal]}</Text>
          <Text style={[styles.mealCalories, { color: muted }]}>
            {entries.length > 0 ? `${formatCalories(total.calories)} kcal` : 'Nothing logged'}
          </Text>
        </View>
        <Link href={{ pathname: '/food-add', params: { date, meal } }} asChild>
          <Button
            label="+ Add"
            variant="soft"
            compact
            accessibilityLabel={`Add food to ${MEAL_LABELS[meal]}`}
          />
        </Link>
      </View>

      {entries.map((entry) => {
        const totals = entryTotals(entry);
        return (
          <PressableLink
            key={entry.id}
            href={{ pathname: '/food-entry', params: { id: entry.id } }}
            style={({ pressed }) => [
              styles.entry,
              { borderTopColor: border },
              pressed && styles.pressed,
            ]}>
              <View style={styles.entryText}>
                <Text style={styles.entryName}>{entry.name}</Text>
                <Text style={[styles.entryDetail, { color: muted }]}>{formatAmount(entry.servings, entry.servingLabel, entry.servingGrams)}</Text>
                <MacroPills values={totals} />
              </View>
              <Text style={styles.entryCalories}>{formatCalories(totals.calories)}</Text>
          </PressableLink>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Space.lg,
    paddingTop: Space.xs,
    gap: Space.lg,
    paddingBottom: Space.bottom,
  },
  eyebrow: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summary: {
    gap: Space.md,
  },
  macros: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: Space.lg,
    marginTop: Space.xs,
  },
  macro: {
    flexGrow: 1,
    flexBasis: 90,
    gap: Space.xs,
  },
  macroLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  macroValue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.heavy,
  },
  meal: {
    paddingVertical: Space.md,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingBottom: Space.sm,
  },
  mealHeading: {
    flex: 1,
  },
  mealTitle: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.heavy,
  },
  mealCalories: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.md,
    gap: Space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  entryText: {
    flex: 1,
  },
  entryName: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.semibold,
  },
  entryDetail: {
    fontSize: FontSize.caption,
    marginTop: Space.micro,
  },
  entryCalories: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    textAlign: 'center',
    fontSize: FontSize.body,
  },
  pressed: {
    opacity: 0.6,
  },
});
