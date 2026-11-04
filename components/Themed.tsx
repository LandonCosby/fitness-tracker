/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */
import { useId } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text as DefaultText,
  TextInput as DefaultTextInput,
  View as DefaultView,
  type TextInputProps as DefaultTextInputProps,
  type TextProps as DefaultTextProps,
  type ViewProps as DefaultViewProps,
} from 'react-native';

import { useColorScheme } from './useColorScheme';

import Colors from '@/constants/Colors';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultTextProps;
export type ViewProps = ThemeProps & DefaultViewProps;
export type TextInputProps = DefaultTextInputProps;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

// Transparent unless lightColor/darkColor are given: the navigation theme paints the
// screen background, and views nested inside filled cards must not cover the card.
export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const theme = useColorScheme();
  const backgroundColor = theme === 'dark' ? darkColor : lightColor;

  return <DefaultView style={[backgroundColor ? { backgroundColor } : null, style]} {...otherProps} />;
}

const NUMERIC_KEYBOARDS = new Set(['number-pad', 'decimal-pad', 'numeric', 'phone-pad']);

export function TextInput(props: TextInputProps) {
  const { style, ...otherProps } = props;
  const color = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'cardRaised');
  const borderColor = useThemeColor({}, 'inputBorder');
  const placeholderTextColor = useThemeColor({}, 'muted');
  const accessoryId = useId();

  // iOS number pads have no return key, so numeric fields get a "Done" bar above the
  // keyboard. Android number pads have their own done key.
  const numeric = NUMERIC_KEYBOARDS.has(props.keyboardType ?? '');
  const withDoneBar = Platform.OS === 'ios' && numeric && !props.inputAccessoryViewID;

  return (
    <>
      <DefaultTextInput
        placeholderTextColor={placeholderTextColor}
        returnKeyType={numeric ? 'done' : undefined}
        inputAccessoryViewID={withDoneBar ? accessoryId : undefined}
        style={[
          {
            color,
            backgroundColor,
            borderColor,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
          },
          style,
        ]}
        {...otherProps}
      />
      {withDoneBar && <KeyboardDoneBar nativeID={accessoryId} />}
    </>
  );
}

// The bar shown above the iOS number pad: a single "Done" that closes the keyboard.
function KeyboardDoneBar({ nativeID }: { nativeID: string }) {
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'card');
  const border = useThemeColor({}, 'border');
  return (
    <InputAccessoryView nativeID={nativeID}>
      <DefaultView
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: border,
        }}>
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={12} accessibilityRole="button">
          <DefaultText style={{ color: tint, fontSize: 17, fontWeight: '700' }}>Done</DefaultText>
        </Pressable>
      </DefaultView>
    </InputAccessoryView>
  );
}
