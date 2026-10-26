import { SymbolView } from 'expo-symbols';
import { Link, Tabs, type Href } from 'expo-router';
import { Pressable, View, type ColorValue } from 'react-native';

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

function HeaderIconLink({
  href,
  label,
  ios,
  material,
}: {
  href: Href;
  label: string;
  ios: string;
  material: string;
}) {
  const colorScheme = useColorScheme();

  return (
    <Link href={href} asChild>
      <Pressable style={{ marginRight: 15 }} accessibilityLabel={label}>
        {({ pressed }) => (
          <SymbolView
            name={{ ios: ios as any, android: material as any, web: material as any }}
            size={25}
            tintColor={Colors[colorScheme].text}
            style={{ opacity: pressed ? 0.5 : 1 }}
          />
        )}
      </Pressable>
    </Link>
  );
}

function SettingsButton() {
  return <HeaderIconLink href="/settings" label="Settings" ios="gearshape" material="settings" />;
}

function AddAndSettingsButtons({ href, label }: { href: Href; label: string }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <HeaderIconLink href={href} label={label} ios="plus" material="add" />
      <SettingsButton />
    </View>
  );
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
        headerRight: () => <SettingsButton />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workouts',
          tabBarIcon: tabIcon('dumbbell', 'fitness_center'),
          headerRight: () => <AddAndSettingsButtons href="/workout-form" label="New workout" />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarIcon: tabIcon('list.bullet', 'list'),
          headerRight: () => <AddAndSettingsButtons href="/exercise-form" label="Add exercise" />,
        }}
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
