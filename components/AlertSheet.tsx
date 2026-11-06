import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, type AlertButton } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, useThemeColor } from '@/components/Themed';

// Themed replacement for Alert.alert: a dark bottom sheet with full-width buttons.
// Same signature, so call sites read the same: showAlert(title, message, buttons, options).
// <AlertSheetHost /> is mounted once in app/_layout.tsx. It uses a native Modal so it also
// shows above screens presented as modals (Add food, Settings, ...).

type AlertRequest = {
  title: string;
  message?: string;
  buttons: AlertButton[];
  cancelable: boolean;
};

let present: ((request: AlertRequest) => void) | null = null;

export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean }
) {
  const request: AlertRequest = {
    title,
    message,
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    cancelable: options?.cancelable ?? true,
  };
  if (present) present(request);
  else console.warn('AlertSheetHost is not mounted:', title);
}

export function AlertSheetHost() {
  const [request, setRequest] = useState<AlertRequest | null>(null);
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  const card = useThemeColor({}, 'card');
  const raised = useThemeColor({}, 'cardRaised');
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const danger = useThemeColor({}, 'danger');

  useEffect(() => {
    present = (next) => {
      setRequest(next);
      setVisible(true);
    };
    return () => {
      present = null;
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    progress.set(
      reduceMotion ? 1 : withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })
    );
  }, [visible, progress, reduceMotion]);

  const close = (after?: () => void) => {
    const finish = () => {
      setVisible(false);
      setRequest(null);
      after?.();
    };
    if (reduceMotion) {
      progress.set(0);
      finish();
      return;
    }
    progress.set(
      withTiming(0, { duration: 160 }, (done) => {
        if (done) runOnJS(finish)();
      })
    );
  };

  const cancel = () => {
    if (!request?.cancelable) return;
    const cancelButton = request.buttons.find((b) => b.style === 'cancel');
    close(cancelButton?.onPress ? () => cancelButton.onPress?.() : undefined);
  };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 320 }],
  }));

  if (!request) return null;

  // Cancel goes last; the first remaining non-destructive button is the main action.
  const actions = request.buttons.filter((b) => b.style !== 'cancel');
  const cancelButtons = request.buttons.filter((b) => b.style === 'cancel');
  const primaryIndex = actions.findIndex((b) => b.style !== 'destructive');

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={cancel}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={cancel}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            disabled={!request.cancelable}
          />
        </Animated.View>
        <Animated.View
          style={[styles.sheet, { backgroundColor: card, paddingBottom: Math.max(insets.bottom, 16) }, sheetStyle]}
          accessibilityViewIsModal
          accessibilityRole="alert">
          <View style={[styles.grabber, { backgroundColor: raised }]} />
          <Text style={[styles.title, { color: text }]} accessibilityRole="header">
            {request.title}
          </Text>
          {request.message ? <Text style={[styles.message, { color: muted }]}>{request.message}</Text> : null}
          <View style={styles.buttons}>
            {[...actions, ...cancelButtons].map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              const isPrimary = !isCancel && index === primaryIndex;
              const fill = isDestructive ? danger : isPrimary ? tint : raised;
              const color = isDestructive || isPrimary ? background : text;
              return (
                <Pressable
                  key={`${button.text}-${index}`}
                  onPress={() => close(button.onPress ? () => button.onPress?.() : undefined)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: fill },
                    isCancel && styles.cancelButton,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.buttonLabel, { color }]}>{button.text ?? 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 8,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  message: {
    fontSize: 15,
    lineHeight: 21,
  },
  buttons: {
    gap: 10,
    marginTop: 12,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelButton: {
    marginTop: 2,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
