import { FontSize, FontWeight, Radius, Space } from '@/constants/Design';
import { StyleSheet } from 'react-native';
import { Text, View, useThemeColor } from '@/components/Themed';
import type { Nutrients } from '@/db/nutrition';
import { formatNumber } from '@/lib/format';

export default function MacroPills({ values }: { values: Pick<Nutrients, 'proteinG' | 'carbsG' | 'fatG'> }) {
  const protein = useThemeColor({}, 'protein');
  const carbs = useThemeColor({}, 'carbs');
  const fat = useThemeColor({}, 'fat');
  const surface = useThemeColor({}, 'cardRaised');
  return <View style={styles.row}>{[
    ['Protein', values.proteinG, protein], ['Carbs', values.carbsG, carbs], ['Fat', values.fatG, fat],
  ].map(([name, value, color]) => <Text key={name} style={[styles.pill, { color: String(color), backgroundColor: surface }]}>{name} {formatNumber(Number(value))} g</Text>)}</View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }, pill: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, borderRadius: Radius.small, paddingHorizontal: Space.sm, paddingVertical: Space.xs } });
