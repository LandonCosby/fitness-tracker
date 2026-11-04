import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { initDatabase } from '@/db/init';
import { WeightUnitProvider } from '@/hooks/useWeightUnit';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/settings` keeps a back button present.
  anchor: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

const MODAL = { presentation: 'modal', headerShown: false } as const;

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
      <WeightUnitProvider>
        <ThemeProvider value={theme}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerTitleStyle: { fontWeight: '700' },
              headerBackButtonDisplayMode: 'minimal',
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
            <Stack.Screen name="workout-form" options={{ title: 'Workout' }} />
            <Stack.Screen name="session/[id]" options={{ title: 'Workout' }} />
            {/* Modals draw their own title bar with <ModalScreen> (see that file for why). */}
            <Stack.Screen name="settings" options={MODAL} />
            <Stack.Screen name="exercise-form" options={MODAL} />
            <Stack.Screen name="exercise-picker" options={MODAL} />
            <Stack.Screen name="performed-exercises" options={MODAL} />
            <Stack.Screen name="start-workout" options={MODAL} />
            <Stack.Screen name="workout-presets" options={MODAL} />
            <Stack.Screen name="nutrition-goals" options={MODAL} />
            <Stack.Screen name="food-add" options={MODAL} />
            <Stack.Screen name="food-entry" options={MODAL} />
            <Stack.Screen name="recipe-form" options={MODAL} />
            <Stack.Screen name="ingredient-picker" options={MODAL} />
            <Stack.Screen name="weigh-in" options={MODAL} />
          </Stack>
        </ThemeProvider>
      </WeightUnitProvider>
    </SQLiteProvider>
  );
}
