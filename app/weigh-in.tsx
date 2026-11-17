import { FontSize, FontWeight, Space } from '@/constants/Design';
import { Button, Card } from '@/components/ui';
import HeaderAction from '@/components/HeaderAction';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { showAlert } from '@/components/AlertSheet';
import IconButton from '@/components/IconButton';
import ModalScreen from '@/components/ModalScreen';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import {
  deleteWeighIn,
  getWeighIn,
  listWeighIns,
  saveWeighIn,
  type WeighIn,
} from '@/db/bodyWeight';
import { fromDateKey, shiftDateKey, toDateKey } from '@/db/records';
import { formatWeight } from '@/db/units';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { formatDay, formatNumber } from '@/lib/format';

// Log body weight for a day (one per day; saving again replaces it), and see recent entries.
export default function WeighInScreen() {
  const db = useSQLiteContext();
  const { unit } = useWeightUnit();
  const [date, setDate] = useState(() => toDateKey());
  const [weight, setWeight] = useState('');
  const [recent, setRecent] = useState<WeighIn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');
  const danger = useThemeColor({}, 'danger');

  const today = toDateKey();

  const loadRecent = useCallback(async () => {
    const all = await listWeighIns(db, unit);
    setRecent(all.slice(-10).reverse());
  }, [db, unit]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getWeighIn(db, date, unit), listWeighIns(db, unit)]).then(([existing, all]) => {
      if (cancelled) return;
      setWeight(existing ? formatNumber(existing.weight) : '');
      setRecent(all.slice(-10).reverse());
    });
    return () => {
      cancelled = true;
    };
  }, [db, date, unit]);

  const save = async () => {
    const value = parseFloat(weight.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return setError(`Enter your weight in ${unit}.`);
    setSaving(true);
    try {
      await saveWeighIn(db, date, value, unit);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (entry: WeighIn) => {
    showAlert(`Delete weigh-in for ${formatDay(fromDateKey(entry.date).getTime())}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWeighIn(db, entry.id);
          if (entry.date === date) setWeight('');
          await loadRecent();
        },
      },
    ]);
  };

  return (
    <ModalScreen title="Log weight" right={<HeaderAction label="Save" onPress={save} disabled={saving} />}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View style={styles.dayRow}>
          <IconButton
            ios="chevron.left"
            material="chevron_left"
            label="Previous day"
            color="tint"
            onPress={() => setDate((d) => shiftDateKey(d, -1))}
          />
          <Text style={styles.day}>{formatDay(fromDateKey(date).getTime())}</Text>
          <IconButton
            ios="chevron.right"
            material="chevron_right"
            label="Next day"
            color="tint"
            onPress={() => setDate((d) => shiftDateKey(d, 1))}
            disabled={date >= today}
          />
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={(text) => {
              setWeight(text.replace(/[^0-9.,]/g, ''));
              setError(null);
            }}
            placeholder="0"
            keyboardType="decimal-pad"
            maxLength={6}
            autoFocus
            selectTextOnFocus
            accessibilityLabel={`Body weight in ${unit}`}
          />
          <Text style={styles.unit}>{unit}</Text>
        </View>

        {error && <Text style={{ color: danger }}>{error}</Text>}

        <Button label="Save weigh-in" onPress={save} disabled={saving} />

        {recent.length > 0 && (
          <Card style={styles.recent}>
            <Text style={styles.recentTitle}>Recent</Text>
            {recent.map((entry) => (
              <View key={entry.id} style={[styles.recentRow, { borderBottomColor: border }]}>
                <Text style={[styles.recentDate, { color: muted }]}>
                  {formatDay(fromDateKey(entry.date).getTime())}
                </Text>
                <Text style={styles.recentValue}>{formatWeight(entry.weight, unit)}</Text>
                <IconButton
                  ios="trash"
                  material="delete"
                  label={`Delete weigh-in for ${formatDay(fromDateKey(entry.date).getTime())}`}
                  color="muted"
                  size={18}
                  onPress={() => confirmDelete(entry)}
                />
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Space.lg,
    gap: Space.lg,
    paddingBottom: Space.bottom,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  day: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.semibold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
  },
  input: {
    width: 140,
    fontSize: FontSize.display,
    textAlign: 'center',
  },
  unit: {
    fontSize: FontSize.title,
  },
  recent: {
    gap: Space.xs,
    marginTop: Space.sm,
  },
  recentTitle: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.semibold,
    marginBottom: Space.xs,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.sm,
    gap: Space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentDate: {
    flex: 1,
    fontSize: FontSize.body,
  },
  recentValue: {
    fontSize: FontSize.body,
    fontVariant: ['tabular-nums'],
  },
});
