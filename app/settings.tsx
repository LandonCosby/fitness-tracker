import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { WEIGHT_UNITS, type WeightUnit } from '@/db/units';
import { useWeightUnit } from '@/hooks/useWeightUnit';

const UNIT_LABELS: Record<WeightUnit, string> = {
  lb: 'Pounds (lb)',
  kg: 'Kilograms (kg)',
};

export default function SettingsScreen() {
  const { unit, setUnit } = useWeightUnit();
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Weight unit</Text>
      <View style={[styles.segmented, { borderColor: tint }]} accessibilityRole="radiogroup">
        {WEIGHT_UNITS.map((option) => {
          const selected = option === unit;
          return (
            <Pressable
              key={option}
              onPress={() => setUnit(option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={({ pressed }) => [
                styles.segment,
                selected && { backgroundColor: tint },
                pressed && !selected && styles.pressed,
              ]}>
              <Text style={[styles.segmentLabel, selected && { color: background }]}>
                {UNIT_LABELS[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        Weights are shown in this unit. Sets you&apos;ve already logged keep the unit they were
        entered in, so switching never changes your history.
      </Text>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    opacity: 0.7,
  },
});
