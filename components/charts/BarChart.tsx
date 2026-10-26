import { useState } from 'react';
import { StyleSheet, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { Text, View, useThemeColor } from '@/components/Themed';

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
  const r = Math.min(RADIUS, width / 2, base - top);
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
  const series = useThemeColor({}, 'chartSeries');
  const grid = useThemeColor({}, 'chartGrid');
  const axis = useThemeColor({}, 'chartAxis');
  const muted = useThemeColor({}, 'muted');

  if (bars.length === 0 || bars.every((b) => b.y === 0)) {
    return (
      <View style={[styles.empty, { height: height / 2, borderColor: grid }]}>
        <Text style={{ color: muted }}>{emptyText}</Text>
      </View>
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
    setSelected(Math.max(0, Math.min(bars.length - 1, index)));
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

            {bars.map((bar, i) =>
              bar.y > 0 ? (
                <Path
                  key={bar.x}
                  d={columnPath(
                    PAD.left + i * slot + (slot - barWidth) / 2,
                    toY(bar.y),
                    barWidth,
                    plotBottom
                  )}
                  fill={series}
                  opacity={selected == null || selected === i ? 1 : 0.4}
                />
              ) : null
            )}

            <SvgText x={PAD.left} y={height - 6} fontSize={11} fill={muted}>
              {formatX(bars[0].x)}
            </SvgText>
            {bars.length > 1 && (
              <SvgText x={plotRight} y={height - 6} fontSize={11} fill={muted} textAnchor="end">
                {formatX(last.x)}
              </SvgText>
            )}
          </Svg>
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
