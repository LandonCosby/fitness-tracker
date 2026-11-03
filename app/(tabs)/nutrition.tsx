import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import IconButton from '@/components/IconButton';
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
import { fromDateKey, shiftDateKey, toDateKey } from '@/db/records';
import { getNutritionTargets, type NutritionTargets } from '@/db/settings';
import type { Meal } from '@/db/types';
import { formatAmount, formatCalories, formatDay, formatNumber } from '@/lib/format';

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

  const today = toDateKey();
  const totals = sumNutrients((entries ?? []).map(entryTotals));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.dayRow}>
        <IconButton
          ios="chevron.left"
          material="chevron_left"
          label="Previous day"
          color="tint"
          onPress={() => setDate((d) => shiftDateKey(d, -1))}
        />
        <Pressable onPress={() => setDate(today)} disabled={date === today} hitSlop={8}>
          <Text style={styles.dayLabel}>{formatDay(fromDateKey(date).getTime())}</Text>
        </Pressable>
        <IconButton
          ios="chevron.right"
          material="chevron_right"
          label="Next day"
          color="tint"
          onPress={() => setDate((d) => shiftDateKey(d, 1))}
          disabled={date >= today}
        />
      </View>

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
  const danger = useThemeColor({}, 'danger');

  const remaining = targets.calories != null ? targets.calories - totals.calories : null;

  return (
    <Card style={styles.summary}>
      <View style={styles.summaryHeader}>
        <Text style={[styles.eyebrow, { color: muted }]}>CALORIES</Text>
        <Link href="/nutrition-goals" asChild>
          <TextAction label="Edit goals" accessibilityLabel="Edit nutrition goals and units" />
        </Link>
      </View>
      <View style={styles.calorieRow}>
        <Text style={styles.calories}>
          {formatCalories(totals.calories)}
          <Text style={[styles.caloriesUnit, { color: muted }]}>
            {targets.calories != null ? ` / ${formatCalories(targets.calories)} kcal` : ' kcal'}
          </Text>
        </Text>
        {remaining != null && (
          <Text style={[styles.remaining, { color: remaining < 0 ? danger : muted }]}>
            {remaining >= 0
              ? `${formatCalories(remaining)} left`
              : `${formatCalories(-remaining)} over`}
          </Text>
        )}
      </View>
      {targets.calories != null && <ProgressBar value={totals.calories} max={targets.calories} />}

      <View style={styles.macros}>
        <Macro label="Protein" value={totals.proteinG} target={targets.proteinG} />
        <Macro label="Carbs" value={totals.carbsG} target={targets.carbsG} />
        <Macro label="Fat" value={totals.fatG} target={targets.fatG} />
      </View>
    </Card>
  );
}

function Macro({ label, value, target }: { label: string; value: number; target: number | null }) {
  const muted = useThemeColor({}, 'muted');
  return (
    <View style={styles.macro}>
      <Text style={[styles.macroLabel, { color: muted }]}>{label}</Text>
      <Text style={styles.macroValue}>
        {formatNumber(value)}
        <Text style={{ color: muted }}>{target != null ? ` / ${formatNumber(target)} g` : ' g'}</Text>
      </Text>
      {target != null && <ProgressBar value={value} max={target} height={5} />}
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
                <Text style={[styles.entryDetail, { color: muted }]}>
                  {formatAmount(entry.servings, entry.servingLabel, entry.servingGrams)} · P{' '}
                  {formatNumber(totals.proteinG)} · C {formatNumber(totals.carbsG)} · F{' '}
                  {formatNumber(totals.fatG)}
                </Text>
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
    padding: 16,
    paddingTop: 4,
    gap: 14,
    paddingBottom: 40,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayLabel: {
    fontSize: 17,
    fontWeight: '800',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summary: {
    gap: 12,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: -8,
  },
  calories: {
    fontSize: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  caloriesUnit: {
    fontSize: 15,
    fontWeight: '600',
  },
  remaining: {
    fontSize: 15,
    fontWeight: '700',
  },
  macros: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  macro: {
    flex: 1,
    gap: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  meal: {
    paddingVertical: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 6,
  },
  mealHeading: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  mealCalories: {
    fontSize: 13,
    fontWeight: '500',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  entryText: {
    flex: 1,
  },
  entryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  entryDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  entryCalories: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    textAlign: 'center',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.6,
  },
});
