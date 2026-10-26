import { Link, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import IconButton from '@/components/IconButton';
import ProgressBar from '@/components/ProgressBar';
import { Text, View, useThemeColor } from '@/components/Themed';
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
import { formatCalories, formatDay, formatNumber, formatServings } from '@/lib/format';

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
        <Link href="/settings" asChild>
          <Pressable hitSlop={8}>
            <Text style={[styles.hint, { color: muted }]}>
              Set daily calorie and macro targets in Settings ›
            </Text>
          </Pressable>
        </Link>
      )}
    </ScrollView>
  );
}

function Summary({ totals, targets }: { totals: Nutrients; targets: NutritionTargets }) {
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');

  const remaining = targets.calories != null ? targets.calories - totals.calories : null;

  return (
    <View style={[styles.summary, { borderColor: border }]}>
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
    </View>
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
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');
  const total = sumNutrients(entries.map(entryTotals));

  return (
    <View style={styles.meal}>
      <View style={[styles.mealHeader, { borderBottomColor: border }]}>
        <Text style={styles.mealTitle}>{MEAL_LABELS[meal]}</Text>
        {entries.length > 0 && (
          <Text style={[styles.mealCalories, { color: muted }]}>
            {formatCalories(total.calories)} kcal
          </Text>
        )}
        <Link href={{ pathname: '/food-add', params: { date, meal } }} asChild>
          <Pressable hitSlop={8} accessibilityLabel={`Add food to ${MEAL_LABELS[meal]}`}>
            <Text style={[styles.add, { color: tint }]}>+ Add</Text>
          </Pressable>
        </Link>
      </View>

      {entries.map((entry) => {
        const totals = entryTotals(entry);
        return (
          <Link
            key={entry.id}
            href={{ pathname: '/food-entry', params: { id: entry.id } }}
            asChild>
            <Pressable style={({ pressed }) => [styles.entry, pressed && styles.pressed]}>
              <View style={styles.entryText}>
                <Text style={styles.entryName}>{entry.name}</Text>
                <Text style={[styles.entryDetail, { color: muted }]}>
                  {formatServings(entry.servings, entry.servingLabel)} · P{' '}
                  {formatNumber(totals.proteinG)} · C {formatNumber(totals.carbsG)} · F{' '}
                  {formatNumber(totals.fatG)}
                </Text>
              </View>
              <Text style={styles.entryCalories}>{formatCalories(totals.calories)}</Text>
            </Pressable>
          </Link>
        );
      })}
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
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  summary: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  calories: {
    fontSize: 28,
    fontWeight: '700',
  },
  caloriesUnit: {
    fontSize: 15,
    fontWeight: '400',
  },
  remaining: {
    fontSize: 15,
  },
  macros: {
    flexDirection: 'row',
    gap: 16,
  },
  macro: {
    flex: 1,
    gap: 4,
  },
  macroLabel: {
    fontSize: 13,
  },
  macroValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  meal: {
    gap: 4,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mealTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  mealCalories: {
    fontSize: 14,
  },
  add: {
    fontSize: 15,
    fontWeight: '500',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  entryText: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  entryName: {
    fontSize: 16,
  },
  entryDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  entryCalories: {
    fontSize: 16,
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
