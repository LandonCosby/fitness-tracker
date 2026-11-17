import { Radius, Space } from '@/constants/Design';
import { useMemo } from 'react';
import { PanResponder, Pressable, ScrollView } from 'react-native';
import IconButton from '@/components/IconButton';
import { Text, View, useThemeColor } from '@/components/Themed';
import { fromDateKey, shiftDateKey, toDateKey } from '@/db/records';

export default function DateStrip({ date, onChange }: { date: string; onChange: (next: string) => void }) {
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');
  const raised = useThemeColor({}, 'cardRaised');
  const muted = useThemeColor({}, 'muted');
  const today = toDateKey();
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 30 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderRelease: (_, g) => {
      const next = shiftDateKey(date, g.dx < 0 ? 1 : -1);
      if (Math.abs(g.dx) > 40 && next <= today) onChange(next);
    },
  }), [date, onChange, today]);
  return <View style={{ gap: Space.sm }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }} {...responder.panHandlers}>
      <IconButton ios="chevron.left" material="chevron_left" label="Previous day" onPress={() => onChange(shiftDateKey(date, -1))} />
      <Pressable onPress={() => onChange(today)} style={{ flex: 1, minHeight: 44, justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Go to today"><Text variant="headline" style={{ textAlign: 'center' }}>{date === today ? 'Today' : fromDateKey(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text></Pressable>
      <IconButton ios="chevron.right" material="chevron_right" label="Next day" disabled={date >= today} onPress={() => onChange(shiftDateKey(date, 1))} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.sm }}>
      {Array.from({ length: 7 }, (_, i) => shiftDateKey(date, i - 3)).filter((d) => d <= today).map((d) => <Pressable key={d} onPress={() => onChange(d)} accessibilityRole="button" accessibilityLabel={fromDateKey(d).toDateString()} accessibilityState={{ selected: d === date }} style={{ minWidth: 48, minHeight: 64, padding: Space.sm, borderRadius: Radius.input, alignItems: 'center', justifyContent: 'center', backgroundColor: d === date ? tint : raised }}><Text variant="caption" style={{ color: d === date ? background : muted }}>{fromDateKey(d).toLocaleDateString(undefined, { weekday: 'short' })}</Text><Text variant="headline" style={{ color: d === date ? background : undefined }}>{fromDateKey(d).getDate()}</Text>{d === today && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: d === date ? background : tint }} />}</Pressable>)}
    </ScrollView>
  </View>;
}
