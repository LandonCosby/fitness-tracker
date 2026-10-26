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
  const border = useThemeColor({}, 'border');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? tint : border },
        selected && { backgroundColor: tint },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, selected && { color: background }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 14,
  },
});
