import { FontSize, FontWeight, Radius, Space } from '@/constants/Design';
import MotionPressable from '@/components/MotionPressable';
import { feedback } from '@/hooks/useFeedback';
import { StyleSheet } from 'react-native';

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
    <MotionPressable
      onPress={() => { feedback('selection'); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? tint : surface },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, selected && { color: background }]}>{label}</Text>
    </MotionPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
});
