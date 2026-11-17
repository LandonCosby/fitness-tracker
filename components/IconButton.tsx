import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';

import { useThemeColor } from '@/components/Themed';
import Colors from '@/constants/Colors';

type ColorName = keyof typeof Colors.light & keyof typeof Colors.dark;

// A tappable SF Symbol (iOS) / Material Symbol (Android) with a text label for screen readers.
export default function IconButton({
  ios,
  material,
  label,
  onPress,
  color = 'text',
  size = 22,
  disabled = false,
}: {
  ios: string;
  material: string;
  label: string;
  onPress: () => void;
  color?: ColorName;
  size?: number;
  disabled?: boolean;
}) {
  const tintColor = useThemeColor({}, color);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : pressed ? 0.5 : 1 })}>
      <SymbolView
        name={{ ios: ios as any, android: material as any, web: material as any }}
        size={size}
        tintColor={tintColor}
      />
    </Pressable>
  );
}
