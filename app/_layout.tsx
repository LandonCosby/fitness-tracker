import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
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

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <SQLiteProvider databaseName="fitness.db" onInit={initDatabase}>
      <WeightUnitProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
            <Stack.Screen name="workout-form" options={{ title: 'Workout' }} />
            <Stack.Screen name="session/[id]" options={{ title: 'Workout' }} />
            {/* Modals draw their own title bar with <ModalScreen> (see that file for why). */}
            <Stack.Screen name="settings" options={MODAL} />
            <Stack.Screen name="exercise-form" options={MODAL} />
            <Stack.Screen name="exercise-picker" options={MODAL} />
            <Stack.Screen name="food-add" options={MODAL} />
            <Stack.Screen name="food-entry" options={MODAL} />
            <Stack.Screen name="weigh-in" options={MODAL} />
          </Stack>
        </ThemeProvider>
      </WeightUnitProvider>
    </SQLiteProvider>
  );
}
