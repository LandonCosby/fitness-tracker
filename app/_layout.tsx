import { FontSize, FontWeight } from '@/constants/Design';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import 'react-native-reanimated';

import { AlertSheetHost } from '@/components/AlertSheet';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { initDatabase } from '@/db/init';
import { FeedbackProvider } from '@/hooks/useFeedback';
import { WeightUnitProvider } from '@/hooks/useWeightUnit';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/settings` keeps a back button present.
  anchor: '(tabs)',
};

// Keep the native splash (dark, Forge logo; see app.json) up until the database is ready.
// <SQLiteProvider> renders nothing while it migrates and seeds on first launch, so hiding
// the splash any earlier shows an empty root view. Fade it out rather than cutting.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });

// The native splash only appears in a real build (development or store). Expo Go shows its
// own loading screen instead; to check this one, use `npx expo run:ios|android` or
// `npx eas-cli@latest build --profile development`.
export default function RootLayout() {
  return <RootLayoutNav />;
}

// Rendered inside SQLiteProvider, so it mounts only once the database is ready.
function HideSplashWhenReady() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return null;
}

const MODAL = { presentation: 'modal', headerShown: false } as const;
const SHORT_SHEET = { presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [0.65, 1] as number[], sheetGrabberVisible: true, contentStyle: { backgroundColor: Colors.dark.background } } as const;

// React Navigation paints screen backgrounds, headers and the tab bar from this theme,
// so they match the app palette.
function navigationTheme(scheme: 'light' | 'dark'): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.tint,
      background: palette.background,
      card: palette.background,
      text: palette.text,
      border: palette.border,
      notification: palette.tint,
    },
  };
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const theme = useMemo(() => navigationTheme(colorScheme), [colorScheme]);

  return (
    <SQLiteProvider databaseName="fitness.db" onInit={initDatabase}>
      <HideSplashWhenReady />
      <FeedbackProvider><WeightUnitProvider>
        <ThemeProvider value={theme}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerTitleStyle: { fontSize: FontSize.headline, fontWeight: FontWeight.bold },
              headerTitleAlign: 'left',
              headerTransparent: false,
              headerBackButtonDisplayMode: 'minimal',
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
            <Stack.Screen name="workout-form" options={{ title: 'Workout' }} />
            <Stack.Screen name="session/[id]" options={{ title: 'Workout' }} />
            <Stack.Screen
              name="workout-complete/[id]"
              options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }}
            />
            {/* Modals draw their own title bar with <ModalScreen> (see that file for why). */}
            <Stack.Screen name="settings" options={MODAL} />
            <Stack.Screen name="exercise-form" options={MODAL} />
            <Stack.Screen name="exercise-picker" options={SHORT_SHEET} />
            <Stack.Screen name="performed-exercises" options={MODAL} />
            <Stack.Screen name="start-workout" options={MODAL} />
            <Stack.Screen name="workout-presets" options={MODAL} />
            <Stack.Screen name="nutrition-goals" options={SHORT_SHEET} />
            <Stack.Screen name="food-add" options={MODAL} />
            <Stack.Screen name="food-entry" options={MODAL} />
            <Stack.Screen name="recipe-form" options={MODAL} />
            <Stack.Screen name="ingredient-picker" options={MODAL} />
            <Stack.Screen name="weigh-in" options={SHORT_SHEET} />
          </Stack>
          <AlertSheetHost />
        </ThemeProvider>
      </WeightUnitProvider></FeedbackProvider>
    </SQLiteProvider>
  );
}
