import { StyleSheet } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import Colors from '@/constants/Colors';

type BadgeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// A small outlined label, e.g. "Custom" or "No equipment" on an exercise.
export default function Badge({ label, color = 'tint' }: { label: string; color?: BadgeColor }) {
  const value = useThemeColor({}, color);

  return <Text style={[styles.badge, { color: value, borderColor: value }]}>{label}</Text>;
}

export const NO_EQUIPMENT_LABEL = 'No equipment';

const styles = StyleSheet.create({
  badge: {
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
});
