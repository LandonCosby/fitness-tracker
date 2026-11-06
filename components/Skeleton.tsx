import { useEffect, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useThemeColor } from '@/components/Themed';

// Placeholder blocks shown while a screen loads, shaped like the content that's coming,
// so nothing flashes blank or jumps. They pulse gently unless the OS asks for less motion.

function usePulse() {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(
      withRepeat(withTiming(0.45, { duration: 750, easing: Easing.inOut(Easing.ease) }), -1, true)
    );
  }, [opacity, reduceMotion]);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

// One grey block. Use inside <SkeletonScreen>/<SkeletonCard>, which share one pulse.
export function Bone({
  width = '100%',
  height = 14,
  radius = 6,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const color = useThemeColor({}, 'cardRaised');
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: color }, style]} />;
}

// A card-shaped placeholder with a title line and a few text lines (or custom children).
export function SkeletonCard({ height, lines = 2, children }: { height?: number; lines?: number; children?: ReactNode }) {
  const card = useThemeColor({}, 'card');
  return (
    <View style={[styles.card, { backgroundColor: card }, height != null && { height }]}>
      {children ?? (
        <>
          <Bone width="55%" height={18} />
          {Array.from({ length: lines }, (_, i) => (
            <Bone key={i} width={i === lines - 1 ? '70%' : '90%'} />
          ))}
        </>
      )}
    </View>
  );
}

// Full-screen loading layout: pulsing children in the screen's normal padding.
export function SkeletonScreen({ children, padding = 16 }: { children: ReactNode; padding?: number }) {
  const pulse = usePulse();
  return (
    <ScrollView
      scrollEnabled={false}
      contentContainerStyle={{ padding, gap: 14 }}
      accessibilityLabel="Loading"
      accessibilityState={{ busy: true }}>
      <Animated.View style={[styles.stack, pulse]}>{children}</Animated.View>
    </ScrollView>
  );
}

// A list of row placeholders (name + detail + trailing value), for food and exercise lists.
export function SkeletonRows({ count = 8 }: { count?: number }) {
  const pulse = usePulse();
  return (
    <Animated.View style={pulse} accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.rowText}>
            <Bone width={`${55 + ((i * 17) % 30)}%`} height={15} />
            <Bone width="40%" height={11} />
          </View>
          <Bone width={56} height={15} />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowText: {
    flex: 1,
    gap: 6,
  },
});
