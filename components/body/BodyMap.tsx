import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Polygon } from 'react-native-svg';

import { Text, useThemeColor } from '@/components/Themed';
import type { MuscleGroup } from '@/db/exerciseTags';

import {
  BACK,
  FRONT,
  MIRROR_X,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  isEllipse,
  mirror,
  type BodyView,
  type Point,
} from './bodyShapes';

export type MuscleFill = { color: string; opacity?: number };

// Front and back body figures with each muscle group filled from `fills`.
// Muscles without a fill use the neutral "idle" color.
export default function BodyMap({
  fills,
  height = 220,
  accessibilityLabel,
  onMusclePress,
}: {
  fills: Partial<Record<MuscleGroup, MuscleFill>>;
  height?: number;
  accessibilityLabel: string;
  /** Makes muscles tappable (screen readers use the controls next to the diagram). */
  onMusclePress?: (muscle: MuscleGroup) => void;
}) {
  const muted = useThemeColor({}, 'muted');
  const width = (height * VIEW_WIDTH) / VIEW_HEIGHT;

  return (
    <View style={styles.row} accessible={!onMusclePress} accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {[
        { view: FRONT, label: 'Front' },
        { view: BACK, label: 'Back' },
      ].map(({ view, label }) => (
        <View key={label} style={styles.figure}>
          <Figure view={view} fills={fills} width={width} height={height} onMusclePress={onMusclePress} />
          <Text style={[styles.label, { color: muted }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const toPoints = (points: Point[]) => points.map(([x, y]) => `${x},${y}`).join(' ');

function Figure({
  view,
  fills,
  width,
  height,
  onMusclePress,
}: {
  view: BodyView;
  fills: Partial<Record<MuscleGroup, MuscleFill>>;
  width: number;
  height: number;
  onMusclePress?: (muscle: MuscleGroup) => void;
}) {
  const base = useThemeColor({}, 'cardRaised');
  const idle = useThemeColor({}, 'bodyIdle');
  const gap = useThemeColor({}, 'card');

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
      <G>
        {view.base.flatMap((shape, index) => {
          if (isEllipse(shape)) {
            const ellipses = shape.center ? [shape.cx] : [shape.cx, 2 * MIRROR_X - shape.cx];
            return ellipses.map((cx, side) => (
              <Ellipse key={`b${index}-${side}`} cx={cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={base} />
            ));
          }
          const polys = shape.center ? [shape.points] : [shape.points, mirror(shape.points)];
          return polys.map((points, side) => (
            <Polygon key={`b${index}-${side}`} points={toPoints(points)} fill={base} />
          ));
        })}
      </G>
      <G>
        {view.muscles.flatMap(({ muscle, points }, index) => {
          const fill = fills[muscle];
          return [points, mirror(points)].map((pts, side) => (
            <Polygon
              key={`m${index}-${side}`}
              points={toPoints(pts)}
              fill={fill?.color ?? idle}
              fillOpacity={fill?.opacity ?? 1}
              stroke={gap}
              strokeWidth={1.2}
              strokeLinejoin="round"
              onPress={onMusclePress ? () => onMusclePress(muscle) : undefined}
            />
          ));
        })}
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  figure: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
