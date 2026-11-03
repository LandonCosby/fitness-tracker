import { Pressable, StyleSheet } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';

// A selectable pill, used for filters and multiple-choice fields.
export default function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'cardRaised');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? tint : surface },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, selected && { color: background }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
