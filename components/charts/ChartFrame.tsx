import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';

export type ChartRow = { label: string; value: string };

// The readout above a chart: the selected (or latest) value, strong, with its label muted.
export function ChartReadout({ value, label }: { value: string; label: string }) {
  const muted = useThemeColor({}, 'muted');
  return (
    <View style={styles.readout} accessibilityLiveRegion="polite">
      <Text style={styles.readoutValue}>{value}</Text>
      <Text style={[styles.readoutLabel, { color: muted }]}>{label}</Text>
    </View>
  );
}

// Wraps a chart with a "Show data" toggle listing every value, so nothing depends on
// touching the chart (the table view).
export function ChartWithData({ rows, children }: { rows: ChartRow[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');

  return (
    <View style={styles.wrapper}>
      {children}
      {rows.length > 0 && (
        <Pressable
          onPress={() => setOpen((o) => !o)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={styles.toggle}>
          <Text style={[styles.toggleLabel, { color: tint }]}>
            {open ? 'Hide data' : 'Show data'}
          </Text>
        </Pressable>
      )}
      {open && (
        <View style={[styles.table, { borderColor: border }]}>
          {[...rows].reverse().map((row, index) => (
            <View
              key={`${row.label}-${index}`}
              style={[styles.row, index > 0 && { borderTopColor: border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[styles.rowLabel, { color: muted }]}>{row.label}</Text>
              <Text style={styles.rowValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    minHeight: 24,
  },
  readoutValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  readoutLabel: {
    fontSize: 13,
  },
  toggle: {
    alignSelf: 'flex-start',
  },
  toggleLabel: {
    fontSize: 14,
  },
  table: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    gap: 12,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});
