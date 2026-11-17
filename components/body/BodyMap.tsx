import { FontSize, FontWeight, Space } from '@/constants/Design';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Polygon, Polyline } from 'react-native-svg';

import { Text, useThemeColor } from '@/components/Themed';
import type { MuscleGroup } from '@/db/exerciseTags';

import {
  BACK,
  FRONT,
  MIRROR_X,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  baseOutlines,
  isEllipse,
  mirror,
  outline,
  type BodyView,
  type Ellipse as EllipseShape,
  type Point,
} from './bodyShapes';

const toPoints = (points: Point[]) => points.map(([x, y]) => `${x},${y}`).join(' ');

type PreparedView = {
  ellipses: { key: string; shape: EllipseShape; cx: number }[];
  base: { key: string; points: string }[];
  muscles: { key: string; muscle: MuscleGroup; points: string }[];
  lines: { key: string; points: string }[];
};

// Smoothing the outlines is pure geometry, so it's done once per view, not per render.
const prepared = new Map<BodyView, PreparedView>();

function prepare(view: BodyView): PreparedView {
  const cached = prepared.get(view);
  if (cached) return cached;
  const result: PreparedView = { ellipses: [], base: [], muscles: [], lines: [] };
  view.base.forEach((shape, index) => {
    if (isEllipse(shape)) {
      const xs = shape.center ? [shape.cx] : [shape.cx, 2 * MIRROR_X - shape.cx];
      xs.forEach((cx, side) => result.ellipses.push({ key: `e${index}-${side}`, shape, cx }));
    } else {
      baseOutlines(shape).forEach((pts, side) => result.base.push({ key: `b${index}-${side}`, points: toPoints(pts) }));
    }
  });
  view.muscles.forEach(({ muscle, points }, index) => {
    [points, mirror(points)].forEach((pts, side) =>
      result.muscles.push({ key: `m${index}-${side}`, muscle, points: toPoints(outline(pts)) })
    );
  });
  view.lines.forEach((line, index) => {
    [line, mirror(line)].forEach((pts, side) => result.lines.push({ key: `l${index}-${side}`, points: toPoints(pts) }));
  });
  prepared.set(view, result);
  return result;
}

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
  const shapes = prepare(view);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
      <G>
        {shapes.ellipses.map(({ key, shape, cx }) => (
          <Ellipse key={key} cx={cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={base} />
        ))}
        {shapes.base.map(({ key, points }) => (
          <Polygon key={key} points={points} fill={base} />
        ))}
      </G>
      <G>
        {shapes.muscles.map(({ key, muscle, points }) => {
          const fill = fills[muscle];
          return (
            <Polygon
              key={key}
              points={points}
              fill={fill?.color ?? idle}
              fillOpacity={fill?.opacity ?? 1}
              stroke={gap}
              strokeWidth={1.2}
              strokeLinejoin="round"
              onPress={onMusclePress ? () => onMusclePress(muscle) : undefined}
            />
          );
        })}
        {shapes.lines.map(({ key, points }) => (
          <Polyline key={key} points={points} fill="none" stroke={gap} strokeWidth={1.1} strokeLinecap="round" />
        ))}
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
    gap: Space.xs,
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
