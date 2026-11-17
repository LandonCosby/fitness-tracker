import { FontSize, FontWeight, Radius, Space } from '@/constants/Design';
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
              width: 44,
              height: 44,
              borderRadius: Radius.card,
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
    <View style={{ marginRight: Space.lg }}>
      <HeaderIconLink href="/settings" label="Settings" ios="gearshape.fill" material="settings" />
    </View>
  );
}

function AddAndSettingsButtons({ href, label }: { href: Href; label: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: Space.md, marginRight: Space.lg }}>
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
        tabBarLabelStyle: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold },
        // Big, left-aligned screen titles.
        headerTitleAlign: 'left',
        headerTitleStyle: { fontSize: FontSize.display, fontWeight: FontWeight.heavy, letterSpacing: -0.5 },
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
            fontSize: FontSize.display,
            fontWeight: FontWeight.heavy,
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
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: tabIcon('fork.knife', 'restaurant'),
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: Space.md, marginRight: Space.lg }}>
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
