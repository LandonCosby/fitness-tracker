import { Radius } from '@/constants/Design';
import { SymbolView } from 'expo-symbols';
import { Text, View, useThemeColor } from '@/components/Themed';
import type { FoodCategory } from '@/db/types';

const ICONS = { ingredient: { ios: 'carrot.fill', android: 'nutrition', web: 'nutrition' }, fast_food: { ios: 'takeoutbag.and.cup.and.straw.fill', android: 'fastfood', web: 'fastfood' }, meal: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }, custom: { ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' } } as const;
export default function FoodIcon({ category, brand }: { category: FoodCategory; brand?: string | null }) {
  const color = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'tintSoft');
  return <View style={{ width: 44, height: 44, borderRadius: Radius.input, backgroundColor, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {brand ? <Text variant="headline" style={{ color }}>{brand.slice(0, 1)}</Text> : <SymbolView name={ICONS[category]} size={22} tintColor={color} />}
  </View>;
}
