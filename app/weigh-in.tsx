import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

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
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
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
    Alert.alert(`Delete weigh-in for ${formatDay(fromDateKey(entry.date).getTime())}?`, undefined, [
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
    <ModalScreen title="Log weight">
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

        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: tint },
            (pressed || saving) && styles.pressed,
          ]}>
          <Text style={[styles.buttonLabel, { color: background }]}>Save</Text>
        </Pressable>

        {recent.length > 0 && (
          <View style={styles.recent}>
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
          </View>
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
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  day: {
    fontSize: 17,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  input: {
    width: 140,
    fontSize: 32,
    textAlign: 'center',
  },
  unit: {
    fontSize: 20,
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
  recent: {
    gap: 4,
    marginTop: 8,
  },
  recentTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recentDate: {
    flex: 1,
    fontSize: 15,
  },
  recentValue: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});
