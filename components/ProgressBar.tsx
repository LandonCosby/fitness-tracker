import { StyleSheet } from 'react-native';

import { View, useThemeColor } from '@/components/Themed';

// A thin bar filled to value / max. Turns the danger color once value passes max.
export default function ProgressBar({
  value,
  max,
  height = 8,
}: {
  value: number;
  max: number;
  height?: number;
}) {
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const track = useThemeColor({}, 'cardRaised');
  const fraction = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max;

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: Math.round(max), now: Math.round(value) }}>
      <View
        style={{
          width: `${fraction * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: over ? danger : tint,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});
