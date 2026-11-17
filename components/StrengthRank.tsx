import { FontSize, FontWeight, Radius, Space } from '@/constants/Design';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import BodyMap, { type MuscleFill } from '@/components/body/BodyMap';
import Chip from '@/components/Chip';
import RankBadge from '@/components/rank/RankBadge';
import PressableLink from '@/components/PressableLink';
import { Text, View, useThemeColor } from '@/components/Themed';
import { Card } from '@/components/ui';
import { MUSCLE_GROUPS, MUSCLE_LABELS, type MuscleGroup } from '@/db/exerciseTags';
import { getProfile, type Profile, type Sex } from '@/db/profile';
import {
  RANKED_MUSCLES,
  RANK_NAMES,
  TIER_COLORS,
  getLatestBodyWeight,
  getMuscleStrength,
  rankRequirements,
  type Benchmark,
  type MuscleStrength,
} from '@/db/strength';
import { formatWeight } from '@/db/units';
import { useWeightUnit } from '@/hooks/useWeightUnit';

const UNRANKED = MUSCLE_GROUPS.filter((m) => !RANKED_MUSCLES.includes(m));

// Progress tab section: pick a muscle group, see its strength rank (Bronze III → Olympian).
export default function StrengthRank() {
  const db = useSQLiteContext();
  const { unit } = useWeightUnit();
  const [muscle, setMuscle] = useState<MuscleGroup>('chest');
  const [strength, setStrength] = useState<MuscleStrength | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bodyWeight, setBodyWeight] = useState<number | null>(null);
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const idle = useThemeColor({}, 'bodyIdle');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [savedProfile, weight] = await Promise.all([
          getProfile(db),
          getLatestBodyWeight(db, unit),
        ]);
        const result = await getMuscleStrength(db, muscle, unit, savedProfile, weight);
        if (cancelled) return;
        setStrength(result);
        setProfile(savedProfile);
        setBodyWeight(weight);
      })();
      return () => {
        cancelled = true;
      };
    }, [db, unit, muscle])
  );

  const selectedColor =
    strength?.status === 'ranked' ? TIER_COLORS[strength.rank.tier] : tint;
  const fills: Partial<Record<MuscleGroup, MuscleFill>> = { [muscle]: { color: selectedColor } };
  for (const m of RANKED_MUSCLES) if (m !== muscle) fills[m] = { color: idle, opacity: 1 };
  for (const m of UNRANKED) fills[m] = { color: idle, opacity: 0.35 };

  return (
    <Card style={styles.card}>
      <BodyMap
        fills={fills}
        height={170}
        accessibilityLabel={`Body diagram with ${MUSCLE_LABELS[muscle]} highlighted.`}
        onMusclePress={(m) => {
          if (RANKED_MUSCLES.includes(m)) setMuscle(m);
        }}
      />
      <Text style={[styles.tapHint, { color: muted }]}>Tap a muscle or choose below</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        accessibilityRole="radiogroup">
        {RANKED_MUSCLES.map((m) => (
          <Chip key={m} label={MUSCLE_LABELS[m]} selected={m === muscle} onPress={() => setMuscle(m)} />
        ))}
      </ScrollView>

      {strength?.status === 'needsProfile' && <NeedsProfile missing={strength.missing} />}

      {strength?.status === 'noLifts' && (
        <Text style={[styles.hint, { color: muted }]}>
          No {MUSCLE_LABELS[muscle].toLowerCase()} benchmark lifts logged yet. Log one of these to
          get ranked: {strength.benchmarks.join(', ')}.
        </Text>
      )}

      {strength?.status === 'ranked' && <Ranked strength={strength} unit={unit} />}

      {strength && strength.status !== 'needsProfile' && profile?.sex && profile.heightCm && bodyWeight && (
        <AllRanks
          benchmark={strength.benchmark}
          currentLevel={strength.status === 'ranked' ? strength.rank.level : null}
          sex={profile.sex}
          heightCm={profile.heightCm}
          bodyWeight={bodyWeight}
          unit={unit}
        />
      )}

      <Text style={[styles.footnote, { color: muted }]}>
        Ranks compare your best estimated 1-rep max on benchmark lifts with typical strength
        standards for your sex, adjusted for body weight and height. A guide, not a test.
      </Text>
    </Card>
  );
}

function Ranked({
  strength,
  unit,
}: {
  strength: Extract<MuscleStrength, { status: 'ranked' }>;
  unit: 'lb' | 'kg';
}) {
  const muted = useThemeColor({}, 'muted');
  const track = useThemeColor({}, 'cardRaised');
  const { rank } = strength;
  const color = TIER_COLORS[rank.tier];
  const next = rank.level < RANK_NAMES.length - 1 ? RANK_NAMES[rank.level + 1] : null;

  return (
    <View style={styles.ranked}>
      <View style={styles.rankRow}>
        <RankBadge tier={rank.tier} level={rank.level} size={72} />
        <View style={styles.rankText}>
          <Text style={[styles.rankName, { color }]} accessibilityRole="header">
            {rank.name}
          </Text>
          <Text style={[styles.rankDetail, { color: muted }]}>
            {strength.lift} · est. 1RM {formatWeight(strength.oneRepMax, unit)} ·{' '}
            {strength.ratio.toFixed(2)}× body weight
          </Text>
        </View>
      </View>

      <View style={styles.ladder} accessible accessibilityLabel={`Level ${rank.level + 1} of ${RANK_NAMES.length}`}>
        {RANK_NAMES.map((name, index) => (
          <View
            key={name}
            style={[
              styles.rung,
              { backgroundColor: index <= rank.level ? color : track },
              index === rank.level && styles.rungCurrent,
            ]}
          />
        ))}
      </View>

      {next && rank.nextAt != null ? (
        <View style={styles.next}>
          <View style={[styles.progressTrack, { backgroundColor: track }]}>
            <View style={[styles.progressFill, { width: `${rank.progress * 100}%`, backgroundColor: color }]} />
          </View>
          <Text style={[styles.rankDetail, { color: muted }]}>
            Next: <Text style={styles.nextName}>{next}</Text> at {formatWeight(Math.ceil(rank.nextAt), unit)}{' '}
            est. 1RM
          </Text>
        </View>
      ) : (
        <Text style={[styles.rankDetail, { color: muted }]}>Top rank. Nothing left but gold medals.</Text>
      )}
    </View>
  );
}

// Expandable table: the estimated 1RM each rank starts at on the benchmark lift.
function AllRanks({
  benchmark,
  currentLevel,
  sex,
  heightCm,
  bodyWeight,
  unit,
}: {
  benchmark: Benchmark;
  currentLevel: number | null;
  sex: Sex;
  heightCm: number;
  bodyWeight: number;
  unit: 'lb' | 'kg';
}) {
  const [open, setOpen] = useState(false);
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');
  const surface = useThemeColor({}, 'cardRaised');
  const border = useThemeColor({}, 'border');
  const rows = rankRequirements(benchmark, sex, heightCm, bodyWeight);

  return (
    <View style={styles.allRanks}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={8}>
        <Text style={[styles.allRanksToggle, { color: tint }]}>
          {open ? 'Hide rank requirements' : 'What each rank needs ›'}
        </Text>
      </Pressable>
      {open && (
        <View style={[styles.table, { backgroundColor: surface }]}>
          <Text style={[styles.tableCaption, { color: muted }]}>
            {benchmark.name}, est. 1RM at your body weight ({formatWeight(bodyWeight, unit)})
          </Text>
          {[...rows].reverse().map((row) => {
            const current = row.level === currentLevel;
            return (
              <View
                key={row.name}
                style={[
                  styles.tableRow,
                  { borderTopColor: border },
                  current && { backgroundColor: `${TIER_COLORS[row.tier]}22` },
                ]}
                accessible
                accessibilityLabel={`${row.name}: ${Math.round(row.oneRepMax)} ${unit}${current ? ', your rank' : ''}`}>
                <RankBadge
                  tier={row.tier}
                  level={row.level}
                  size={28}
                  showDivision={false}
                  dimmed={currentLevel != null && row.level > currentLevel}
                />
                <Text style={[styles.tableName, current && { color: TIER_COLORS[row.tier] }]}>
                  {row.name}
                  {current ? '  ← you' : ''}
                </Text>
                <Text style={[styles.tableRatio, { color: muted }]}>
                  {row.level === 0 ? 'start' : `${row.ratio.toFixed(2)}×`}
                </Text>
                <Text style={styles.tableValue}>
                  {row.level === 0 ? '—' : formatWeight(Math.ceil(row.oneRepMax), unit)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function NeedsProfile({ missing }: { missing: ('sex' | 'height' | 'bodyWeight')[] }) {
  const muted = useThemeColor({}, 'muted');
  const needsProfile = missing.includes('sex') || missing.includes('height');
  const needsWeight = missing.includes('bodyWeight');

  return (
    <View style={styles.ranked}>
      <Text style={[styles.hint, { color: muted }]}>
        Ranks need your {[needsProfile && 'sex and height', needsWeight && 'body weight'].filter(Boolean).join(' and ')}.
      </Text>
      <View style={styles.actions}>
        {needsProfile && <ActionLink href="/settings" label="Add sex & height" />}
        {needsWeight && <ActionLink href="/weigh-in" label="Log body weight" />}
      </View>
    </View>
  );
}

function ActionLink({ href, label }: { href: '/settings' | '/weigh-in'; label: string }) {
  const tint = useThemeColor({}, 'tint');
  const tintSoft = useThemeColor({}, 'tintSoft');
  return (
    <PressableLink
      href={href}
      style={({ pressed }) => [styles.action, { backgroundColor: tintSoft }, pressed && styles.pressed]}>
      <Text style={[styles.actionLabel, { color: tint }]}>{label}</Text>
    </PressableLink>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Space.lg,
  },
  tapHint: {
    fontSize: FontSize.caption,
    textAlign: 'center',
    marginTop: -6,
  },
  allRanks: {
    gap: Space.md,
  },
  allRanksToggle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  table: {
    borderRadius: Radius.input,
    overflow: 'hidden',
    paddingTop: Space.md,
  },
  tableCaption: {
    fontSize: FontSize.caption,
    paddingHorizontal: Space.md,
    paddingBottom: Space.sm,
  },
  tableRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tableName: {
    flex: 1,
    minWidth: 110,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  tableRatio: {
    minWidth: 54,
    fontSize: FontSize.caption,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  tableValue: {
    minWidth: 76,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  chips: {
    gap: Space.sm,
  },
  hint: {
    fontSize: FontSize.body,
    lineHeight: 20,
  },
  footnote: {
    fontSize: FontSize.caption,
    lineHeight: 15,
  },
  ranked: {
    gap: Space.md,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
  },
  rankText: {
    flex: 1,
    gap: Space.micro,
  },
  rankName: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.3,
  },
  rankDetail: {
    fontSize: FontSize.caption,
    lineHeight: 18,
  },
  ladder: {
    flexDirection: 'row',
    gap: Space.xs,
    alignItems: 'center',
  },
  rung: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  rungCurrent: {
    height: 12,
  },
  next: {
    gap: Space.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  nextName: {
    fontWeight: FontWeight.heavy,
  },
  actions: {
    flexDirection: 'row',
    gap: Space.sm,
    flexWrap: 'wrap',
  },
  action: {
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  actionLabel: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  pressed: {
    opacity: 0.7,
  },
});
