import { useState } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Keeps normal Pressable style callbacks and events while animating on the UI thread.
export default function MotionPressable({ style, onPressIn, onPressOut, onHoverIn, onHoverOut, ...props }: PressableProps) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <AnimatedPressable {...props}
    style={[typeof style === 'function' ? style({ pressed, hovered }) : style, motion]}
    onHoverIn={(event) => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={(event) => { setHovered(false); onHoverOut?.(event); }}
    onPressIn={(event) => { setPressed(true); scale.set(withTiming(reduced ? 1 : 0.98, { duration: 90 })); onPressIn?.(event); }}
    onPressOut={(event) => { setPressed(false); scale.set(withTiming(1, { duration: reduced ? 0 : 150 })); onPressOut?.(event); }}
  />;
}
