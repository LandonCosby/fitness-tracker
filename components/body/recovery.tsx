import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Text, useThemeColor } from '@/components/Themed';
import type { MuscleGroup } from '@/db/exerciseTags';
import type { MuscleRecovery } from '@/db/muscles';

import type { MuscleFill } from './BodyMap';

// Recovery colors over the 7-day window: just trained (hot orange) → recovering (amber,
// yellow-green) → fresh (green). Untrained in the window = fresh.
const STOPS: { at: number; color: [number, number, number] }[] = [
  { at: 0, color: [255, 77, 31] }, //   #FF4D1F just trained
  { at: 0.3, color: [255, 159, 28] }, // #FF9F1C
  { at: 0.65, color: [201, 216, 74] }, // #C9D84A
  { at: 1, color: [47, 191, 138] }, //   #2FBF8A fresh
];

export const RECOVERY_WINDOW_DAYS = 7;
const WINDOW_MS = RECOVERY_WINDOW_DAYS * 86400000;

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

// 0 = trained just now, 1 = a week or more ago (or never).
export function recoveryAmount(lastTrainedAt: number | null, now: number): number {
  if (lastTrainedAt == null) return 1;
  return Math.min(1, Math.max(0, (now - lastTrainedAt) / WINDOW_MS));
}

export function recoveryColor(amount: number): string {
  for (let i = 1; i < STOPS.length; i++) {
    const from = STOPS[i - 1];
    const to = STOPS[i];
    if (amount <= to.at) {
      const t = (amount - from.at) / (to.at - from.at);
      return toHex(from.color.map((c, k) => c + (to.color[k] - c) * t) as [number, number, number]);
    }
  }
  return toHex(STOPS[STOPS.length - 1].color);
}

export function recoveryFills(
  recovery: Record<MuscleGroup, MuscleRecovery>,
  now: number
): Partial<Record<MuscleGroup, MuscleFill>> {
  const fills: Partial<Record<MuscleGroup, MuscleFill>> = {};
  for (const entry of Object.values(recovery)) {
    // Fresh muscles are drawn a little dimmer so the trained ones stand out.
    const amount = recoveryAmount(entry.lastTrainedAt, now);
    fills[entry.muscle] = { color: recoveryColor(amount), opacity: amount >= 1 ? 0.55 : 1 };
  }
  return fills;
}

// "Today", "1 day ago", "3 days ago".
export function trainedAgo(lastTrainedAt: number, now: number): string {
  const startOfDay = (t: number) => new Date(new Date(t).setHours(0, 0, 0, 0)).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(lastTrainedAt)) / 86400000);
  if (days <= 0) return 'Today';
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

// Gradient bar explaining the colors.
export function RecoveryLegend() {
  const muted = useThemeColor({}, 'muted');
  return (
    <View style={styles.legend} accessible accessibilityLabel="Color key: orange is just trained, green is fresh">
      <Svg width="100%" height={8}>
        <Defs>
          <LinearGradient id="recovery" x1="0" y1="0" x2="1" y2="0">
            {STOPS.map((stop) => (
              <Stop key={stop.at} offset={stop.at} stopColor={toHex(stop.color)} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height={8} rx={4} fill="url(#recovery)" />
      </Svg>
      <View style={styles.legendLabels}>
        <Text style={[styles.legendLabel, { color: muted }]}>Just trained</Text>
        <Text style={[styles.legendLabel, { color: muted }]}>Recovering</Text>
        <Text style={[styles.legendLabel, { color: muted }]}>Fresh</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    gap: 6,
  },
  legendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
