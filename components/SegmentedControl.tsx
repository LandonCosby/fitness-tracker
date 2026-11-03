import { Pressable, StyleSheet, View } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';

// A row of mutually exclusive options; the selected one is filled with the accent.
export default function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  compact = false,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  /** Smaller text, for four or more options. */
  compact?: boolean;
}) {
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'cardRaised');

  return (
    <View style={[styles.segmented, { backgroundColor: surface }]} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={({ pressed }) => [
              styles.segment,
              selected && { backgroundColor: tint },
              pressed && !selected && styles.pressed,
            ]}>
            <Text
              style={[styles.label, compact && styles.compactLabel, selected && { color: background }]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  compactLabel: {
    fontSize: 13,
  },
});
