import { FontSize, FontWeight, Radius, Space } from '@/constants/Design';
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
>
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
    flexWrap: 'wrap',
    borderRadius: Radius.input,
    padding: Space.xs,
  },
  segment: {
    flexGrow: 1,
    flexBasis: 'auto',
    minHeight: 44,
    paddingHorizontal: Space.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Space.md,
    borderRadius: Radius.input,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  compactLabel: {
    fontSize: FontSize.caption,
  },
});
