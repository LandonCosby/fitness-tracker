import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { FontSize } from '@/constants/Design';
import { useEffect, useRef, useState } from 'react';
import { ChartEntrance } from '@/components/Motion';
import ChartEmpty from '@/components/charts/ChartEmpty';
import { feedback } from '@/hooks/useFeedback';
import { StyleSheet, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { View, useThemeColor } from '@/components/Themed';

import { ChartReadout } from './ChartFrame';
import { compactNumber, niceTicks, scaleLinear } from './scale';

export type Bar = { x: number; y: number };

type Props = {
  bars: Bar[];
  formatValue: (y: number) => string;
  formatX: (x: number) => string;
  height?: number;
  emptyText: string;
  accessibilityLabel: string;
};

const PAD = { top: 12, right: 8, bottom: 22, left: 32 };
const MAX_BAR = 24;
const GAP = 2;
const RADIUS = 4;

// Column with a rounded data end and a square base.
function columnPath(x: number, top: number, width: number, base: number): string {
  'worklet';
  const r = Math.min(RADIUS, width / 2, Math.max(0, base - top));
  return [
    `M${x},${base}`,
    `L${x},${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `L${x + width - r},${top}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `L${x + width},${base}`,
    'Z',
  ].join(' ');
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
function GrowingColumn({ x, top, width, base, color, opacity, identity }: { x: number; top: number; width: number; base: number; color: string; opacity: number; identity: string }) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(1);
  useEffect(() => { grow.set(reduced ? 1 : 0); grow.set(withTiming(1, { duration: reduced ? 0 : 400 })); }, [identity, grow, reduced]);
  const animatedProps = useAnimatedProps(() => ({ d: columnPath(x, base - (base - top) * grow.value, width, base) }));
  return <AnimatedPath animatedProps={animatedProps} fill={color} opacity={opacity} />;
}

// Single-series column chart from a zero baseline. Tap or drag across to read a column.
export default function BarChart({
  bars,
  formatValue,
  formatX,
  height = 160,
  emptyText,
  accessibilityLabel,
}: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const lastSelection = useRef<number | null>(null);
  const choose = (next: number) => { if (lastSelection.current !== next) { feedback('selection'); lastSelection.current = next; } setSelected(next); };

  const series = useThemeColor({}, 'chartSeries');
  const grid = useThemeColor({}, 'chartGrid');
  const axis = useThemeColor({}, 'chartAxis');
  const muted = useThemeColor({}, 'muted');

  if (bars.length === 0 || bars.every((b) => b.y === 0)) {
    return (
      <ChartEmpty message={emptyText} label={accessibilityLabel} />
    );
  }

  const ticks = niceTicks(0, Math.max(...bars.map((b) => b.y)), 3);
  const plotRight = Math.max(width - PAD.right, PAD.left + 1);
  const plotBottom = height - PAD.bottom;
  const toY = scaleLinear([0, ticks[ticks.length - 1]], [plotBottom, PAD.top]);
  const slot = (plotRight - PAD.left) / bars.length;
  const barWidth = Math.max(2, Math.min(MAX_BAR, slot - GAP));

  const last = bars[bars.length - 1];
  const active = selected != null ? bars[selected] : null;
  const readout = active ?? last;

  const select = (event: GestureResponderEvent) => {
    const index = Math.floor((event.nativeEvent.locationX - PAD.left) / slot);
    choose(Math.max(0, Math.min(bars.length - 1, index)));
  };

  return (
    <View>
      <ChartReadout
        value={formatValue(readout.y)}
        label={active ? formatX(active.x) : `Latest · ${formatX(last.x)}`}
      />
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={accessibilityLabel}>
        {width > 0 && (
          <ChartEntrance identity={JSON.stringify(bars)}><Svg width={width} height={height}>
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

            {active && selected != null && <Line x1={PAD.left + (selected + 0.5) * slot} x2={PAD.left + (selected + 0.5) * slot} y1={PAD.top} y2={plotBottom} stroke={series} strokeDasharray="3 4" />}
            {bars.map((bar, i) =>
              bar.y > 0 ? (
                <GrowingColumn
                  key={bar.x}
                  identity={JSON.stringify(bars)}
                  x={PAD.left + i * slot + (slot - barWidth) / 2}
                  top={toY(bar.y)}
                  width={barWidth}
                  base={plotBottom}
                  color={series}
                  opacity={selected == null || selected === i ? 1 : 0.4}
                />
              ) : null
            )}

            <SvgText x={PAD.left} y={height - 6} fontSize={FontSize.caption} fill={muted}>
              {formatX(bars[0].x)}
            </SvgText>
            {bars.length > 1 && (
              <SvgText x={plotRight} y={height - 6} fontSize={FontSize.caption} fill={muted} textAnchor="end">
                {formatX(last.x)}
              </SvgText>
            )}
          </Svg></ChartEntrance>
        )}
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
