import { StyleSheet, View } from 'react-native';

import { Bone, SkeletonCard, SkeletonScreen } from '@/components/Skeleton';

// Loading layouts shaped like each screen's real content (see components/Skeleton.tsx).

export function HomeSkeleton() {
  return (
    <SkeletonScreen padding={16}>
      <Bone width="40%" height={12} />
      <Bone height={52} radius={14} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <SkeletonCard height={124} />
        </View>
        <View style={styles.flex}>
          <SkeletonCard height={124} />
        </View>
      </View>
      <SkeletonCard height={84} lines={1} />
      <SkeletonCard>
        <Bone width="45%" height={18} />
        <View style={styles.figures}>
          <Bone width={110} height={220} radius={40} />
          <Bone width={110} height={220} radius={40} />
        </View>
        <Bone height={8} radius={4} />
      </SkeletonCard>
    </SkeletonScreen>
  );
}

// A stack of cards: Workouts tab, Start a workout, lists of plans.
export function CardListSkeleton({ count = 4, header = true }: { count?: number; header?: boolean }) {
  return (
    <SkeletonScreen>
      {header && <Bone height={52} radius={14} />}
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </SkeletonScreen>
  );
}

// Workout in progress / finished workout.
export function SessionSkeleton() {
  return (
    <SkeletonScreen>
      <SkeletonCard height={96} />
      {[0, 1].map((i) => (
        <SkeletonCard key={i}>
          <Bone width="50%" height={18} />
          {[0, 1, 2].map((r) => (
            <View key={r} style={styles.setRow}>
              <Bone width={28} height={28} radius={8} />
              <Bone width="30%" height={12} />
              <View style={styles.flex} />
              <Bone width={64} height={32} radius={8} />
              <Bone width={52} height={32} radius={8} />
              <Bone width={34} height={34} radius={10} />
            </View>
          ))}
        </SkeletonCard>
      ))}
    </SkeletonScreen>
  );
}

export function ProgressSkeleton() {
  return (
    <SkeletonScreen>
      <Bone width="45%" height={20} />
      <SkeletonCard height={300} />
      <View style={styles.row}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Bone key={i} width={52} height={32} radius={16} />
        ))}
      </View>
      <SkeletonCard height={220} />
      <SkeletonCard height={220} />
    </SkeletonScreen>
  );
}

// Forms in modals and pushed screens: labelled fields.
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <SkeletonScreen>
      {Array.from({ length: fields }, (_, i) => (
        <View key={i} style={styles.field}>
          <Bone width="30%" height={13} />
          <Bone height={46} radius={12} />
        </View>
      ))}
      <Bone height={52} radius={14} style={styles.button} />
    </SkeletonScreen>
  );
}

export function NutritionSkeleton() {
  return (
    <View style={styles.inline}>
      <SkeletonCard height={150} />
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} height={64} lines={1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  figures: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  field: {
    gap: 8,
  },
  button: {
    marginTop: 8,
  },
  inline: {
    gap: 14,
  },
});
