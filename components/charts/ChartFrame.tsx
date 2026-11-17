import { FontSize, FontWeight, Radius, Space } from '@/constants/Design';
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
  const surface = useThemeColor({}, 'cardRaised');

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
        <View style={[styles.table, { backgroundColor: surface }]}>
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
    gap: Space.sm,
  },
  readout: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Space.sm,
    minHeight: 24,
  },
  readoutValue: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.semibold,
  },
  readoutLabel: {
    fontSize: FontSize.caption,
  },
  toggle: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  toggleLabel: {
    fontSize: FontSize.body,
  },
  table: {
    borderRadius: Radius.input,
    paddingHorizontal: Space.md,
  },
  row: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Space.sm,
    gap: Space.md,
  },
  rowLabel: {
    fontSize: FontSize.body,
  },
  rowValue: {
    fontSize: FontSize.body,
    fontVariant: ['tabular-nums'],
  },
});
