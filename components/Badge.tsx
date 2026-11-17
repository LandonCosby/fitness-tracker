import { FontSize, FontWeight, Space } from '@/constants/Design';
import { StyleSheet } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import Colors from '@/constants/Colors';

type BadgeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// A small filled label, e.g. "Custom" or "No equipment" on an exercise.
export default function Badge({ label, color = 'tint' }: { label: string; color?: BadgeColor }) {
  const value = useThemeColor({}, color);
  const fill = useThemeColor({}, color === 'tint' ? 'tintSoft' : 'cardRaised');

  return <Text style={[styles.badge, { color: value, backgroundColor: fill }]}>{label}</Text>;
}

export const NO_EQUIPMENT_LABEL = 'No equipment';

const styles = StyleSheet.create({
  badge: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    borderRadius: 6,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xs,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
});
