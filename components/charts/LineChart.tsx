import { useState } from 'react';
import { StyleSheet, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { Text, View, useThemeColor } from '@/components/Themed';

import { ChartReadout } from './ChartFrame';
import { compactNumber, nearestIndex, niceTicks, scaleLinear } from './scale';

export type Point = { x: number; y: number };

type Props = {
  points: Point[];
  /** Readout value, e.g. "185 lb". */
  formatValue: (y: number) => string;
  /** Readout and axis label for an x, e.g. "Oct 20". */
  formatX: (x: number) => string;
  /** A horizontal goal line, e.g. a calorie target. */
  reference?: { y: number; label: string };
  /** Start the y-axis at zero (totals) instead of fitting the data (weights). */
  zeroBased?: boolean;
  /** Break the line where consecutive points are further apart than this. */
  breakGapMs?: number;
  height?: number;
  emptyText: string;
  accessibilityLabel: string;
};

const PAD = { top: 22, right: 14, bottom: 22, left: 40 };

// Single-series line chart: 2px line, end dot with a surface ring, labelled endpoint,
// and a touch crosshair that snaps to the nearest point.
export default function LineChart({
  points,
  formatValue,
  formatX,
  reference,
  zeroBased = false,
  breakGapMs,
  height = 180,
  emptyText,
  accessibilityLabel,
}: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const series = useThemeColor({}, 'chartSeries');
  const grid = useThemeColor({}, 'chartGrid');
  const axis = useThemeColor({}, 'chartAxis');
  const muted = useThemeColor({}, 'muted');
  const text = useThemeColor({}, 'text');
  const secondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'background');

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height: height / 2, borderColor: grid }]}>
        <Text style={{ color: muted }}>{emptyText}</Text>
      </View>
    );
  }

  const ys = points.map((p) => p.y);
  const lo = Math.min(...ys, ...(reference ? [reference.y] : []), ...(zeroBased ? [0] : []));
  const hi = Math.max(...ys, ...(reference ? [reference.y] : []));
  const ticks = niceTicks(lo, hi);
  const plotRight = Math.max(width - PAD.right, PAD.left + 1);
  const plotBottom = height - PAD.bottom;
  const xs = points.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const toX =
    xMin === xMax
      ? () => (PAD.left + plotRight) / 2
      : scaleLinear([xMin, xMax], [PAD.left + 6, plotRight - 6]);
  const toY = scaleLinear([ticks[0], ticks[ticks.length - 1]], [plotBottom, PAD.top]);

  // Split into runs, breaking where the gap is too long (e.g. unlogged days).
  const runs: Point[][] = [];
  for (const point of points) {
    const run = runs[runs.length - 1];
    const prev = run?.[run.length - 1];
    if (run && (!breakGapMs || point.x - prev!.x <= breakGapMs)) run.push(point);
    else runs.push([point]);
  }

  const last = points[points.length - 1];
  const active = selected != null ? points[selected] : null;
  const readoutPoint = active ?? last;

  const select = (event: GestureResponderEvent) => {
    const x = event.nativeEvent.locationX;
    setSelected(nearestIndex(points.map((p) => toX(p.x)), x));
  };

  return (
    <View>
      <ChartReadout
        value={formatValue(readoutPoint.y)}
        label={active ? formatX(active.x) : `Latest · ${formatX(last.x)}`}
      />
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={accessibilityLabel}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {ticks.map((tick) => (
              <Line
                key={`g${tick}`}
                x1={PAD.left}
                x2={plotRight}
                y1={toY(tick)}
                y2={toY(tick)}
                stroke={tick === 0 ? axis : grid}
                strokeWidth={1}
              />
            ))}
            {ticks.map((tick) => (
              <SvgText
                key={`t${tick}`}
                x={PAD.left - 6}
                y={toY(tick) + 4}
                fontSize={11}
                fill={muted}
                textAnchor="end">
                {compactNumber(tick)}
              </SvgText>
            ))}

            {reference && (
              <>
                <Line
                  x1={PAD.left}
                  x2={plotRight}
                  y1={toY(reference.y)}
                  y2={toY(reference.y)}
                  stroke={secondary}
                  strokeWidth={1}
                />
                <SvgText
                  x={PAD.left + 4}
                  y={toY(reference.y) - 5}
                  fontSize={11}
                  fill={secondary}>
                  {reference.label}
                </SvgText>
              </>
            )}

            {runs.map((run, i) =>
              run.length === 1 ? (
                <Circle key={`r${i}`} cx={toX(run[0].x)} cy={toY(run[0].y)} r={3} fill={series} />
              ) : (
                <Path
                  key={`r${i}`}
                  d={run
                    .map((p, j) => `${j === 0 ? 'M' : 'L'}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`)
                    .join(' ')}
                  stroke={series}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
              )
            )}

            {active && (
              <Line
                x1={toX(active.x)}
                x2={toX(active.x)}
                y1={PAD.top - 6}
                y2={plotBottom}
                stroke={axis}
                strokeWidth={1}
              />
            )}

            {/* End dot (or the selected point) with a 2px surface ring. */}
            <Circle
              cx={toX(readoutPoint.x)}
              cy={toY(readoutPoint.y)}
              r={5}
              fill={series}
              stroke={surface}
              strokeWidth={2}
            />
            {!active && (
              <SvgText
                x={Math.min(toX(last.x), plotRight)}
                y={toY(last.y) - 10}
                fontSize={12}
                fontWeight="600"
                fill={text}
                textAnchor="end">
                {formatValue(last.y)}
              </SvgText>
            )}

            <SvgText x={PAD.left} y={height - 6} fontSize={11} fill={muted}>
              {formatX(xMin)}
            </SvgText>
            {xMax !== xMin && (
              <SvgText x={plotRight} y={height - 6} fontSize={11} fill={muted} textAnchor="end">
                {formatX(xMax)}
              </SvgText>
            )}
          </Svg>
        )}
        {/* Touch layer: tap or drag to read any point; release to return to the latest. */}
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onResponderGrant={select}
          onResponderMove={select}
          onResponderRelease={() => setSelected(null)}
          onResponderTerminate={() => setSelected(null)}
          onResponderTerminationRequest={() => true}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
});
