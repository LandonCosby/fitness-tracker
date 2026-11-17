import MotionPressable from '@/components/MotionPressable';
import { router, type Href } from 'expo-router';
import { type PressableProps } from 'react-native';

// A Pressable that navigates to `href`. Use it instead of <Link asChild><MotionPressable style={fn}>:
// Link's asChild merges styles by spreading objects, so a `({ pressed }) => ...` style
// function on the child is silently dropped (backgrounds and row layouts disappear).
export default function PressableLink({
  href,
  onPress,
  ...props
}: PressableProps & { href: Href }) {
  return (
    <MotionPressable
      accessibilityRole="link"
      {...props}
      onPress={(event) => {
        onPress?.(event);
        router.push(href);
      }}
    />
  );
}
