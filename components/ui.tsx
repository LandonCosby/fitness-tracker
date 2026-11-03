import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';

// A filled surface. Use instead of bordered boxes so screens read as stacked cards.
export function Card({
  children,
  style,
  raised = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Use the brighter surface, e.g. for a card inside a card. */
  raised?: boolean;
}) {
  const backgroundColor = useThemeColor({}, raised ? 'cardRaised' : 'card');
  return <View style={[styles.card, { backgroundColor }, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'danger';

// A full-width (or self-sized with `compact`) action button.
// primary: accent fill. soft: accent-tinted. secondary: neutral surface. danger: red text.
export function Button({
  label,
  onPress,
  variant = 'primary',
  compact = false,
  disabled = false,
  accessibilityLabel,
  style,
}: {
  label: string;
  /** Optional when wrapped in <Link asChild>, which supplies it. */
  onPress?: () => void;
  variant?: ButtonVariant;
  compact?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const tint = useThemeColor({}, 'tint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const background = useThemeColor({}, 'background');
  const cardRaised = useThemeColor({}, 'cardRaised');
  const text = useThemeColor({}, 'text');
  const danger = useThemeColor({}, 'danger');

  const fill = { primary: tint, soft: tintSoft, secondary: cardRaised, danger: 'transparent' }[variant];
  const color = { primary: background, soft: tint, secondary: text, danger }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        { backgroundColor: fill },
        (pressed || disabled) && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text style={[styles.label, compact && styles.compactLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

// A bold section title with an optional trailing action (e.g. "+ New").
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {action}
    </View>
  );
}

// A small text action in the accent color, for section headers.
export function TextAction({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const tint = useThemeColor({}, 'tint');
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {({ pressed }) => (
        <Text style={[styles.textAction, { color: tint }, pressed && styles.pressed]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  compactLabel: {
    fontSize: 14,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  textAction: {
    fontSize: 15,
    fontWeight: '700',
  },
});
