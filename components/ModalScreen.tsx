import { FontSize, FontWeight, Space } from '@/constants/Design';
import { router } from 'expo-router';
import IconButton from '@/components/IconButton';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
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

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: background }]}>
      <View style={[styles.bar, { borderBottomColor: border }]}>
        <View style={styles.side}><IconButton ios="xmark" material="close" label="Close" onPress={() => router.back()} /></View>
        <Text style={styles.title} accessibilityRole="header">
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
    paddingHorizontal: Space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    minWidth: 44,
    flexShrink: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'left',
    paddingHorizontal: Space.sm,
    fontSize: FontSize.headline,
    fontWeight: FontWeight.bold,
  },
});
