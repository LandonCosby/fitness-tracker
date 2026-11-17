import { Space } from '@/constants/Design';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, useThemeColor } from '@/components/Themed';

export default function AmountSheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const card = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'muted');
  return <Modal transparent visible animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose} statusBarTranslucent>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cancel food amount" accessibilityRole="button" />
      <View style={[styles.sheet, { backgroundColor: card, maxHeight: expanded ? '90%' : '55%', paddingBottom: Math.max(insets.bottom, 12) }]} accessibilityViewIsModal>
        <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button" accessibilityLabel={expanded ? 'Collapse amount sheet' : 'Expand amount sheet'} accessibilityState={{ expanded }} style={styles.handle}>
          <View style={[styles.grabber, { backgroundColor: muted }]} /><Text variant="caption" style={{ color: muted }}>{expanded ? 'Show less' : 'Show more'}</Text>
        </Pressable>
        <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content}>{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'flex-end' }, backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.65)' }, sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 }, handle: { minHeight: 44, justifyContent: 'center', alignItems: 'center', gap: Space.xs }, grabber: { width: 36, height: 4, borderRadius: 4 }, content: { padding: Space.lg, gap: Space.md } });
