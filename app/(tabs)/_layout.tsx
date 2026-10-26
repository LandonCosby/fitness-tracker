import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

// SF Symbol name on iOS, Material Symbol name on Android and web.
function tabIcon(ios: string, material: string) {
  const TabIcon = ({ color }: { color: ColorValue }) => (
    <SymbolView
      name={{ ios: ios as any, android: material as any, web: material as any }}
      tintColor={color}
      size={28}
    />
  );
  TabIcon.displayName = `TabIcon(${material})`;
  return TabIcon;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Workouts', tabBarIcon: tabIcon('dumbbell', 'fitness_center') }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: 'Exercises', tabBarIcon: tabIcon('list.bullet', 'list') }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: 'Nutrition', tabBarIcon: tabIcon('fork.knife', 'restaurant') }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: tabIcon('chart.line.uptrend.xyaxis', 'show_chart'),
        }}
      />
    </Tabs>
  );
}
