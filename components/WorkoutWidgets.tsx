import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { showAlert } from '@/components/AlertSheet';
import Elapsed from '@/components/Elapsed';
import PressableLink from '@/components/PressableLink';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Card } from '@/components/ui';
import { getActiveSession, startSession, type SessionSummary } from '@/db/sessions';
import { useWeightUnit } from '@/hooks/useWeightUnit';

// Pieces shared by the Home and Workouts tabs.

export type ActiveSession = Awaited<ReturnType<typeof getActiveSession>>;

export const sessionHref = (id: string) => ({ pathname: '/session/[id]' as const, params: { id } });

const WEEK_MS = 7 * 86400000;

// Starts a workout (empty, or from a template) unless one is already running.
export function useStartWorkout(active: ActiveSession) {
  const db = useSQLiteContext();
  const { unit } = useWeightUnit();
  const [starting, setStarting] = useState(false);

  const start = async (workoutId: string | null) => {
    if (active) {
      const activeId = active.id;
      showAlert('Workout in progress', 'Finish or discard it before starting another.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resume', onPress: () => router.push(sessionHref(activeId)) },
      ]);
      return;
    }
    if (starting) return;
    setStarting(true);
    try {
      const sessionId = await startSession(db, workoutId, unit);
      router.push(sessionHref(sessionId));
    } finally {
      setStarting(false);
    }
  };

  return { start, starting };
}

// The resume banner shown while a workout is running.
export function ActiveWorkoutCard({ session }: { session: NonNullable<ActiveSession> }) {
  const tint = useThemeColor({}, 'tint');
  const onTint = useThemeColor({}, 'background');

  return (
    <PressableLink
      href={sessionHref(session.id)}
      accessibilityLabel={`Resume ${session.name}`}
      style={({ pressed }) => [styles.activeCard, { backgroundColor: tint }, pressed && styles.pressed]}>
      <View style={styles.activeText}>
        <Text style={[styles.activeLabel, { color: onTint }]}>WORKOUT IN PROGRESS</Text>
        <Text style={[styles.activeName, { color: onTint }]} numberOfLines={1}>
          {session.name}
        </Text>
      </View>
      <View style={styles.activeRight}>
        <Text style={[styles.activeTime, { color: onTint }]}>
          <Elapsed since={session.startedAt} />
        </Text>
        <Text style={[styles.activeResume, { color: onTint }]}>Resume ›</Text>
      </View>
    </PressableLink>
  );
}

// Workouts, sets and time over the last 7 days, from the loaded history.
export function WeekStats({ history, now }: { history: SessionSummary[]; now: number }) {
  const since = now - WEEK_MS;
  const recent = history.filter((s) => s.startedAt >= since);
  const sets = recent.reduce((sum, s) => sum + s.setCount, 0);
  const ms = recent.reduce((sum, s) => sum + (s.endedAt - s.startedAt), 0);
  const minutes = Math.round(ms / 60000);
  const time = minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;

  return (
    <Card style={styles.stats}>
      <Stat value={String(recent.length)} label={recent.length === 1 ? 'Workout' : 'Workouts'} />
      <Divider />
      <Stat value={String(sets)} label="Sets" />
      <Divider />
      <Stat value={time} label="Time" />
    </Card>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const muted = useThemeColor({}, 'muted');
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label} in the last 7 days`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statLabel, { color: muted }]}>{label}</Text>
    </View>
  );
}

function Divider() {
  const border = useThemeColor({}, 'border');
  return <View style={[styles.divider, { backgroundColor: border }]} />;
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  activeCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeText: {
    flex: 1,
    gap: 2,
  },
  activeLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.8,
  },
  activeName: {
    fontSize: 20,
    fontWeight: '800',
  },
  activeRight: {
    alignItems: 'flex-end',
  },
  activeTime: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  activeResume: {
    fontSize: 14,
    fontWeight: '700',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
});
