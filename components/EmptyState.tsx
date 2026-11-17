import { FontSize, FontWeight, Radius, Space } from '@/constants/Design';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text, useThemeColor } from '@/components/Themed';
import { Button } from '@/components/ui';

// A friendly "nothing here yet" block: icon, title, one line of help and an optional action.
export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
  style,
}: {
  /** SF Symbol (iOS) and Material Symbol (Android) names. */
  icon: { ios: string; material: string };
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Smaller, for use inside a card or chart area. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tint = useThemeColor({}, 'tint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const muted = useThemeColor({}, 'muted');

  return (
    <View style={[styles.container, compact && styles.compact, style]}>
      <View style={[styles.iconCircle, compact && styles.iconCircleCompact, { backgroundColor: tintSoft }]}>
        <SymbolView
          name={{ ios: icon.ios as any, android: icon.material as any, web: icon.material as any }}
          size={compact ? 20 : 26}
          tintColor={tint}
        />
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">
        {title}
      </Text>
      {message && <Text style={[styles.message, { color: muted }]}>{message}</Text>}
      {actionLabel && onAction && (
        <Button label={actionLabel} variant="soft" compact onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Space.xxl,
    paddingHorizontal: Space.xl,
    gap: Space.sm,
  },
  compact: {
    paddingVertical: Space.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.sm,
  },
  iconCircleCompact: {
    width: 40,
    height: 40,
    borderRadius: Radius.card,
    marginBottom: Space.micro,
  },
  title: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.heavy,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: FontSize.body,
  },
  message: {
    fontSize: FontSize.body,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    alignSelf: 'center',
    marginTop: Space.sm,
  },
});
