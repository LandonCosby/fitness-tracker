import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';

import { View, useThemeColor } from '@/components/Themed';

// A thin bar filled to value / max. Turns the danger color once value passes max.
export default function ProgressBar({
  value,
  max,
  height = 8,
  color,
}: {
  value: number;
  max: number;
  height?: number;
  color?: string;
}) {
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const track = useThemeColor({}, 'cardRaised');
  const fraction = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max;
  const reduced = useReducedMotion();
  const fill = useSharedValue(0);
  useEffect(() => { fill.set(withTiming(fraction, { duration: reduced ? 0 : 250 })); }, [fraction, reduced, fill]);
  const animated = useAnimatedStyle(() => ({ width: (fill.value * 100 + '%') as `${number}%` }));

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: Math.round(max), now: Math.round(value) }}>
      <Animated.View
        style={[animated, {
          height,
          borderRadius: height / 2,
          backgroundColor: color ?? (over ? danger : tint),
        }]}
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
