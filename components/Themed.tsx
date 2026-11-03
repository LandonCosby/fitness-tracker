/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */
import {
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

export function TextInput(props: TextInputProps) {
  const { style, ...otherProps } = props;
  const color = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'cardRaised');
  const borderColor = useThemeColor({}, 'inputBorder');
  const placeholderTextColor = useThemeColor({}, 'muted');

  return (
    <DefaultTextInput
      placeholderTextColor={placeholderTextColor}
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
  );
}
