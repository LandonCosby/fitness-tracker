import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, View, useThemeColor } from '@/components/Themed';

// Layout for screens presented as modals: our own title bar, then the content.
//
// The native header is hidden on modals (see app/_layout.tsx). On iOS 26 the native modal
// header is laid out over the screen's content, which covered search boxes and form fields.
// Drawing the bar ourselves keeps content below it on every iOS version and on Android.
// SafeAreaView measures this view itself: 0 at the top of an iOS sheet, the status bar
// height on Android's full-screen modals.
export default function ModalScreen({
  title,
  right,
  children,
}: {
  title: string;
  /** Optional trailing header control, e.g. a Save button. */
  right?: ReactNode;
  children: ReactNode;
}) {
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: background }]}>
      <View style={[styles.bar, { borderBottomColor: border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.side}>
          <Text style={[styles.close, { color: tint }]}>Close</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={[styles.side, styles.right]}>{right}</View>
      </View>
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: 72,
  },
  right: {
    alignItems: 'flex-end',
  },
  close: {
    fontSize: 17,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
});
