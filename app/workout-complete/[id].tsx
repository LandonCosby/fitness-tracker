import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import BodyMap, { type MuscleFill } from '@/components/body/BodyMap';
import { RECORD_LABELS, formatRecord } from '@/components/RecordTiles';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Button, Card } from '@/components/ui';
import type { MuscleGroup } from '@/db/exerciseTags';
import { getExerciseMuscles, musclesWorked } from '@/db/muscles';
import { getNewRecords, type NewRecord } from '@/db/progress';
import { getSession, type SessionDetail } from '@/db/sessions';
import { convertWeight, formatWeight } from '@/db/units';
import { useWeightUnit } from '@/hooks/useWeightUnit';
import { formatDay, formatDuration } from '@/lib/format';

type Summary = {
  session: SessionDetail;
  records: NewRecord[];
  fills: Partial<Record<MuscleGroup, MuscleFill>>;
};

// Shown after finishing a workout: totals, muscles worked and any new personal records.
// Entering animations use Reanimated's default, which follows the OS reduce-motion setting.
export default function WorkoutCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { unit } = useWeightUnit();
  const [summary, setSummary] = useState<Summary | null>(null);
  const success = useThemeColor({}, 'success');
  const successSoft = useThemeColor({}, 'successSoft');
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');
  const text = useThemeColor({}, 'text');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getSession(db, id);
      if (!session) {
        router.back();
        return;
      }
      const [records, muscles] = await Promise.all([
        getNewRecords(db, id, unit),
        getExerciseMuscles(db, session.exercises.map((e) => e.exerciseId)),
      ]);
      const worked = musclesWorked(session.exercises.map((e) => muscles.get(e.exerciseId)));
      const fills: Partial<Record<MuscleGroup, MuscleFill>> = {};
      for (const [muscle, level] of Object.entries(worked) as [MuscleGroup, 'primary' | 'secondary'][]) {
        fills[muscle] = { color: tint, opacity: level === 'primary' ? 1 : 0.4 };
      }
      if (cancelled) return;
      setSummary({ session, records, fills });
      // A success buzz for new records; a light tap otherwise.
      (records.length > 0
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      ).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [db, id, unit, tint]);

  if (!summary) return <SafeAreaView style={styles.container} />;

  const { session, records } = summary;
  const sets = session.exercises.flatMap((e) => e.sets);
  const volume = sets.reduce(
    (sum, set) =>
      set.weight != null && set.reps != null ? sum + convertWeight(set.weight, set.unit, unit) * set.reps : sum,
    0
  );
  const duration = session.endedAt != null ? formatDuration(session.endedAt - session.startedAt) : '—';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.check, { backgroundColor: successSoft }]}>
            <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={40} weight="bold" tintColor={success} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(120)} style={[styles.heroTitle, { color: text }]} accessibilityRole="header">
            Workout complete
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(180)} style={[styles.heroSubtitle, { color: muted }]}>
            {session.name} · {formatDay(session.startedAt)}
          </Animated.Text>
        </View>

        <Animated.View entering={FadeInDown.delay(240)}>
          <Card style={styles.stats}>
            <Stat label="Duration" value={duration} />
            <Stat label="Sets" value={String(sets.length)} />
            <Stat label="Volume" value={volume > 0 ? formatWeight(Math.round(volume), unit) : '—'} />
            <Stat label="Exercises" value={String(session.exercises.length)} />
          </Card>
        </Animated.View>

        {records.length > 0 && (
          <View style={styles.section}>
            <Animated.Text entering={FadeInDown.delay(300)} style={[styles.sectionTitle, { color: tint }]}>
              {records.length === 1 ? 'New personal record' : `${records.length} new personal records`}
            </Animated.Text>
            {records.map((record, index) => (
              <Animated.View key={`${record.exerciseName}-${record.kind}`} entering={FadeInDown.delay(360 + index * 90)}>
                <RecordCard record={record} unit={unit} />
              </Animated.View>
            ))}
          </View>
        )}

        {Object.keys(summary.fills).length > 0 && (
          <Animated.View entering={FadeInDown.delay(records.length > 0 ? 420 + records.length * 90 : 320)}>
            <Card style={styles.section}>
              <Text style={styles.cardTitle}>Muscles worked</Text>
              <BodyMap fills={summary.fills} height={190} accessibilityLabel="Body diagram of the muscles this workout trained." />
            </Card>
          </Animated.View>
        )}

        <View style={styles.actions}>
          <Button label="Done" onPress={() => router.back()} />
          <Button
            label="View workout"
            variant="secondary"
            onPress={() => router.replace({ pathname: '/session/[id]', params: { id: session.id } })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const muted = useThemeColor({}, 'muted');
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: muted }]}>{label}</Text>
    </View>
  );
}

function RecordCard({ record, unit }: { record: NewRecord; unit: 'lb' | 'kg' }) {
  const tint = useThemeColor({}, 'tint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  const muted = useThemeColor({}, 'muted');
  const value = formatRecord(record.kind, record.records, unit);
  const previous = formatRecord(record.kind, record.previous, unit);

  return (
    <Card style={[styles.record, { borderColor: tint }]}>
      <View style={[styles.trophy, { backgroundColor: tintSoft }]}>
        <SymbolView name={{ ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' }} size={22} tintColor={tint} />
      </View>
      <View style={styles.recordText}>
        <Text style={styles.recordName} numberOfLines={1}>
          {record.exerciseName}
        </Text>
        <Text style={[styles.recordKind, { color: muted }]}>
          {RECORD_LABELS[record.kind]}
          {previous ? ` · was ${previous}` : ''}
        </Text>
      </View>
      <Text style={[styles.recordValue, { color: tint }]}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 18,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 24,
    paddingBottom: 6,
  },
  check: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  trophy: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordText: {
    flex: 1,
    gap: 2,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '800',
  },
  recordKind: {
    fontSize: 13,
  },
  recordValue: {
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
});
