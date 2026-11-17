import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { FontSize, FontWeight } from '@/constants/Design';
import { useEffect, useId, useRef, useState } from 'react';
import { ChartEntrance } from '@/components/Motion';
import ChartEmpty from '@/components/charts/ChartEmpty';
import { feedback } from '@/hooks/useFeedback';
import { StyleSheet, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, ClipPath, G, Defs, LinearGradient, Stop, Rect, Line, Path, Text as SvgText } from 'react-native-svg';

import { View, useThemeColor } from '@/components/Themed';

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

const AnimatedRect = Animated.createAnimatedComponent(Rect);
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
  const lastSelection = useRef<number | null>(null);
  const gradientId = useId().replace(/:/g, '');
  const choose = (next: number) => { if (lastSelection.current !== next) { feedback('selection'); lastSelection.current = next; } setSelected(next); };

  const reduced = useReducedMotion();
  const reveal = useSharedValue(1);
  const identity = JSON.stringify(points);
  useEffect(() => { reveal.set(reduced ? 1 : 0); reveal.set(withTiming(1, { duration: reduced ? 0 : 450 })); }, [identity, width, reduced, reveal]);
  const clipProps = useAnimatedProps(() => ({ width: reveal.value * width }));
  const series = useThemeColor({}, 'chartSeries');
  const grid = useThemeColor({}, 'chartGrid');
  const axis = useThemeColor({}, 'chartAxis');
  const muted = useThemeColor({}, 'muted');
  const text = useThemeColor({}, 'text');
  const secondary = useThemeColor({}, 'textSecondary');
  const surface = useThemeColor({}, 'background');

  if (points.length === 0) {
    return (
      <ChartEmpty message={emptyText} label={accessibilityLabel} />
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
    choose(nearestIndex(points.map((p) => toX(p.x)), x));
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
          <ChartEntrance identity={JSON.stringify(points)}><Svg width={width} height={height}>
            <Defs><ClipPath id={gradientId + "clip"}><AnimatedRect x={0} y={0} height={height} animatedProps={clipProps} /></ClipPath><LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={series} stopOpacity={0.24} /><Stop offset="1" stopColor={series} stopOpacity={0} /></LinearGradient></Defs>
            <G clipPath={"url(#" + gradientId + "clip)"}>
            {runs.filter((run) => run.length > 1).map((run, i) => <Path key={"fill"+i} d={"M"+toX(run[0].x)+","+plotBottom+" "+run.map((p) => "L"+toX(p.x)+","+toY(p.y)).join(" ")+" L"+toX(run[run.length - 1].x)+","+plotBottom+" Z"} fill={"url(#"+gradientId+")"} />)}
            </G>
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
                fontSize={FontSize.caption}
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
                  fontSize={FontSize.caption}
                  fill={secondary}>
                  {reference.label}
                </SvgText>
              </>
            )}

            <G clipPath={"url(#" + gradientId + "clip)"}>
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

            </G>
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
            <>{active && <><Rect x={Math.max(PAD.left, Math.min(toX(active.x) - 52, plotRight - 104))} y={Math.max(0, toY(active.y) - 34)} width={104} height={25} rx={8} fill={series} /><SvgText x={Math.max(PAD.left, Math.min(toX(active.x) - 52, plotRight - 104)) + 52} y={Math.max(0, toY(active.y) - 34) + 17} fontSize={FontSize.caption} fill={surface} textAnchor="middle">{formatValue(active.y)}</SvgText></>}</>
            {!active && (
              <SvgText
                x={Math.min(toX(last.x), plotRight)}
                y={toY(last.y) - 10}
                fontSize={FontSize.caption}
                fontWeight={FontWeight.semibold}
                fill={text}
                textAnchor="end">
                {formatValue(last.y)}
              </SvgText>
            )}

            <SvgText x={PAD.left} y={height - 6} fontSize={FontSize.caption} fill={muted}>
              {formatX(xMin)}
            </SvgText>
            {xMax !== xMin && (
              <SvgText x={plotRight} y={height - 6} fontSize={FontSize.caption} fill={muted} textAnchor="end">
                {formatX(xMax)}
              </SvgText>
            )}
          </Svg></ChartEntrance>
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
