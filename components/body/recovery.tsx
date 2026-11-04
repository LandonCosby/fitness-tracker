import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Text, useThemeColor } from '@/components/Themed';
import type { MuscleGroup } from '@/db/exerciseTags';
import type { MuscleRecovery } from '@/db/muscles';

import type { MuscleFill } from './BodyMap';

// How long each muscle group takes to recover after a hard session, in hours.
//
// Studies of trained lifters put full recovery of strength and muscle-damage markers at
// roughly 48–72 h for the same muscles; after heavy multi-joint lifts (squat, bench press,
// deadlift) and lower-body barbell work, 72 h is the recommended gap, and training to failure
// slows recovery further. So the large movers get 72 h. Upper-arm and shoulder muscles are
// mostly worked as assistance/single-joint lifts and get 48 h, the low end of that range.
// There's little direct data for calves, abs and forearms; 36 h follows common coaching
// guidance (24–48 h) for small, high-endurance muscles.
//  - Belcher et al. 2019, back squat / bench press / deadlift time course (pubmed 30779596)
//  - Morán-Navarro et al. 2017, failure vs non-failure recovery (pubmed 28965198)
//  - NSCA guidance: more recovery between heavy days; lower body slower than upper body
export const RECOVERY_HOURS: Record<MuscleGroup, number> = {
  chest: 72,
  back: 72,
  quads: 72,
  hamstrings: 72,
  glutes: 72,
  shoulders: 48,
  biceps: 48,
  triceps: 48,
  calves: 36,
  abs: 36,
  forearms: 36,
};

// Recovery colors: just trained (hot orange) → recovering (amber, yellow-green) →
// recovered (green), scaled to each muscle's recovery time.
const STOPS: { at: number; color: [number, number, number] }[] = [
  { at: 0, color: [255, 77, 31] }, //   #FF4D1F just trained
  { at: 0.3, color: [255, 159, 28] }, // #FF9F1C
  { at: 0.65, color: [201, 216, 74] }, // #C9D84A
  { at: 1, color: [47, 191, 138] }, //   #2FBF8A recovered
];

// Longer than any recovery time, so the query sees every muscle still recovering.
export const RECOVERY_WINDOW_DAYS = 7;

function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

// 0 = trained just now, 1 = fully recovered (or not trained in the window).
export function recoveryAmount(lastTrainedAt: number | null, now: number, muscle: MuscleGroup): number {
  if (lastTrainedAt == null) return 1;
  return Math.min(1, Math.max(0, (now - lastTrainedAt) / (RECOVERY_HOURS[muscle] * 3600000)));
}

// "Ready now", "Ready in 5 h", "Ready in 2 days".
export function readyIn(lastTrainedAt: number, now: number, muscle: MuscleGroup): string {
  const hours = (lastTrainedAt + RECOVERY_HOURS[muscle] * 3600000 - now) / 3600000;
  if (hours <= 0) return 'Recovered';
  if (hours < 24) return `Ready in ${Math.ceil(hours)} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Ready in 1 day' : `Ready in ${days} days`;
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
    // Recovered muscles are drawn a little dimmer so the recovering ones stand out.
    const amount = recoveryAmount(entry.lastTrainedAt, now, entry.muscle);
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
    <View style={styles.legend} accessible accessibilityLabel="Color key: orange is just trained, green is recovered">
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
        <Text style={[styles.legendLabel, { color: muted }]}>Recovered</Text>
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
