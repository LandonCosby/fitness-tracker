import { StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import type { ExerciseRecords, RecordKind } from '@/db/progress';
import { formatWeight, type WeightUnit } from '@/db/units';
import { formatDay, formatSeconds } from '@/lib/format';

export const RECORD_LABELS: Record<RecordKind, string> = {
  heaviest: 'Heaviest',
  bestOneRepMax: 'Best est. 1RM',
  mostReps: 'Most reps',
  longestHold: 'Longest hold',
};

// The record's headline value, e.g. "185 lb", "12 reps", "1:30".
export function formatRecord(kind: RecordKind, records: ExerciseRecords, unit: WeightUnit): string | null {
  switch (kind) {
    case 'heaviest':
      return records.heaviest ? formatWeight(records.heaviest.weight, unit) : null;
    case 'bestOneRepMax':
      return records.bestOneRepMax ? formatWeight(records.bestOneRepMax.value, unit) : null;
    case 'mostReps':
      return records.mostReps ? `${records.mostReps.reps} reps` : null;
    case 'longestHold':
      return records.longestHold ? formatSeconds(records.longestHold.seconds) : null;
  }
}

function detailFor(kind: RecordKind, records: ExerciseRecords, unit: WeightUnit): string | null {
  switch (kind) {
    case 'heaviest':
      return records.heaviest?.reps ? `× ${records.heaviest.reps}` : null;
    case 'bestOneRepMax':
      return records.bestOneRepMax
        ? `from ${formatWeight(records.bestOneRepMax.weight, unit)} × ${records.bestOneRepMax.reps}`
        : null;
    case 'mostReps':
      return records.mostReps?.weight ? `at ${formatWeight(records.mostReps.weight, unit)}` : null;
    case 'longestHold':
      return null;
  }
}

export function recordKindsFor(isTimed: boolean, records: ExerciseRecords): RecordKind[] {
  if (isTimed) return ['longestHold'];
  // Bodyweight-only exercises have no weight records.
  return records.heaviest ? ['heaviest', 'bestOneRepMax', 'mostReps'] : ['mostReps'];
}

// A row of stat tiles: label, value, and how/when the record was set.
export default function RecordTiles({
  records,
  isTimed,
  unit,
}: {
  records: ExerciseRecords;
  isTimed: boolean;
  unit: WeightUnit;
}) {
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'muted');

  return (
    <View style={styles.row}>
      {recordKindsFor(isTimed, records).map((kind) => {
        const value = formatRecord(kind, records, unit);
        const detail = detailFor(kind, records, unit);
        const at = records[kind]?.at;
        return (
          <View key={kind} style={[styles.tile, { borderColor: border }]}>
            <Text style={[styles.label, { color: muted }]}>{RECORD_LABELS[kind]}</Text>
            <Text style={styles.value}>{value ?? '—'}</Text>
            {(detail || at) && (
              <Text style={[styles.detail, { color: muted }]} numberOfLines={2}>
                {[detail, at ? formatDay(at) : null].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 17,
    fontWeight: '600',
  },
  detail: {
    fontSize: 11,
  },
});
