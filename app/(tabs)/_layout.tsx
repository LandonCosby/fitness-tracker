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
      size={26}
    />
  );
  TabIcon.displayName = `TabIcon(${material})`;
  return TabIcon;
}

// A round icon button in the tab header.
function HeaderIconLink({
  href,
  label,
  ios,
  material,
  accent = false,
}: {
  href: Href;
  label: string;
  ios: string;
  material: string;
  accent?: boolean;
}) {
  const palette = Colors[useColorScheme()];

  return (
    <Link href={href} asChild>
      <Pressable accessibilityLabel={label} hitSlop={6}>
        {({ pressed }) => (
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: accent ? palette.tintSoft : palette.card,
              opacity: pressed ? 0.6 : 1,
            }}>
            <SymbolView
              name={{ ios: ios as any, android: material as any, web: material as any }}
              size={20}
              tintColor={accent ? palette.tint : palette.text}
            />
          </View>
        )}
      </Pressable>
    </Link>
  );
}

function SettingsButton() {
  return (
    <View style={{ marginRight: 16 }}>
      <HeaderIconLink href="/settings" label="Settings" ios="gearshape.fill" material="settings" />
    </View>
  );
}

function AddAndSettingsButtons({ href, label }: { href: Href; label: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginRight: 16 }}>
      <HeaderIconLink href={href} label={label} ios="plus" material="add" accent />
      <HeaderIconLink href="/settings" label="Settings" ios="gearshape.fill" material="settings" />
    </View>
  );
}

export default function TabLayout() {
  const palette = Colors[useColorScheme()];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.tabIconDefault,
        tabBarStyle: { backgroundColor: palette.card, borderTopColor: palette.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        // Big, left-aligned screen titles.
        headerTitleAlign: 'left',
        headerTitleStyle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
        headerStyle: { backgroundColor: palette.background },
        headerShadowVisible: false,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
        headerRight: () => <SettingsButton />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Forge',
          tabBarLabel: 'Home',
          tabBarIcon: tabIcon('house.fill', 'home'),
          headerTitleStyle: {
            fontSize: 30,
            fontWeight: '900',
            letterSpacing: -0.5,
            color: palette.tint,
          },
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          tabBarIcon: tabIcon('dumbbell.fill', 'fitness_center'),
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
        options={{
          title: 'Nutrition',
          tabBarIcon: tabIcon('fork.knife', 'restaurant'),
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 10, marginRight: 16 }}>
              <HeaderIconLink href="/nutrition-goals" label="Goals and units" ios="target" material="track_changes" accent />
              <HeaderIconLink href="/settings" label="Settings" ios="gearshape.fill" material="settings" />
            </View>
          ),
        }}
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
