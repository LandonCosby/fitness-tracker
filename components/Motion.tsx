import { useEffect, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

export function MotionRow({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  return <Animated.View style={style} entering={reduced ? undefined : FadeInDown.duration(160)} exiting={reduced ? undefined : FadeOutUp.duration(120)} layout={reduced ? undefined : LinearTransition.duration(180)}>{children}</Animated.View>;
}

export function ChartEntrance({ children, identity }: { children: ReactNode; identity: string }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(1);
  useEffect(() => {
    progress.set(reduced ? 1 : 0);
    progress.set(withTiming(1, { duration: reduced ? 0 : 400 }));
  }, [identity, reduced, progress]);
  const style = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ scaleY: 0.88 + progress.value * 0.12 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
