import { Space } from '@/constants/Design';
import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text, View, useThemeColor } from '@/components/Themed';
import { formatCalories } from '@/lib/format';

export default function CalorieRing({ eaten, target }: { eaten: number; target: number | null }) {
  const tint = useThemeColor({}, 'tint');
  const danger = useThemeColor({}, 'danger');
  const track = useThemeColor({}, 'cardRaised');
  const muted = useThemeColor({}, 'muted');
  const id = useId();
  const remaining = target == null ? null : target - eaten;
  const fraction = target != null && target > 0 ? Math.max(0, Math.min(1, eaten / target)) : 0;
  const circumference = 2 * Math.PI * 65;
  return <View style={styles.layout} accessible accessibilityLabel={`${formatCalories(eaten)} calories eaten${target ? ` of ${target}, ${Math.abs(remaining!)} ${remaining! < 0 ? 'over' : 'left'}` : ', no target set'}`}>
    <View style={styles.ring}>
      <Svg width={152} height={152} viewBox="0 0 152 152" aria-hidden>
        <Circle cx={76} cy={76} r={65} fill="none" stroke={track} strokeWidth={10} />
        <Circle key={id} cx={76} cy={76} r={65} fill="none" stroke={remaining != null && remaining < 0 ? danger : tint} strokeWidth={10} strokeLinecap="round" strokeDasharray={[circumference * fraction, circumference]} rotation={-90} origin="76,76" />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text variant="title" maxFontSizeMultiplier={1.5}>{formatCalories(Math.abs(remaining ?? eaten))}</Text>
        <Text variant="caption" maxFontSizeMultiplier={1.5} style={{ color: muted }}>{remaining == null ? 'kcal eaten' : remaining < 0 ? 'kcal over' : 'kcal left'}</Text>
      </View>
    </View>
    <View style={styles.detail}><Text variant="display">{formatCalories(eaten)}</Text><Text variant="caption" style={{ color: muted }}>kcal eaten</Text><Text variant="bodyStrong" style={{ color: muted }}>{target == null ? 'Set a daily target' : `${formatCalories(target)} kcal goal`}</Text></View>
  </View>;
}
const styles = StyleSheet.create({ layout: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Space.lg }, ring: { width: 152, height: 152 }, center: { position: 'absolute', top: 44, left: 12, right: 12, alignItems: 'center' }, detail: { flexGrow: 1, flexBasis: 100, gap: Space.xs } });
