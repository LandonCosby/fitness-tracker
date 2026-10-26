export type WeightUnit = 'lb' | 'kg';

export const WEIGHT_UNITS: readonly WeightUnit[] = ['lb', 'kg'];
export const DEFAULT_WEIGHT_UNIT: WeightUnit = 'lb';

const LB_PER_KG = 2.20462262;

export function isWeightUnit(value: unknown): value is WeightUnit {
  return value === 'lb' || value === 'kg';
}

// Sets keep the unit they were logged in; convert only for display and comparison.
export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight;
  return from === 'kg' ? weight * LB_PER_KG : weight / LB_PER_KG;
}

export function formatWeight(weight: number, unit: WeightUnit): string {
  const rounded = Math.round(weight * 10) / 10;
  return `${rounded} ${unit}`;
}
