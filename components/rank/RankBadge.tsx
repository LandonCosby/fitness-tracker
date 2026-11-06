import Svg, { Circle, Polygon } from 'react-native-svg';

import { TIER_COLORS, type RankTier } from '@/db/strength';

import { badgeParts, divisionPips, shade, type BadgePart, type Paint } from './badgeGeometry';

// The badge for a strength rank: tier shape in the tier color, with III/II/I shown as pips
// (1–3) under divided tiers. `level` is 0 (Bronze III) … 17 (Olympian), as in db/strength.ts.
export default function RankBadge({
  tier,
  level,
  size = 56,
  showDivision = true,
  dimmed = false,
}: {
  tier: RankTier;
  level: number;
  size?: number;
  /** Pips under the badge (hidden in compact uses). */
  showDivision?: boolean;
  /** Greyed-out, e.g. for ranks not reached yet. */
  dimmed?: boolean;
}) {
  const color = TIER_COLORS[tier];
  const paint: Record<Paint, string> = {
    base: color,
    dark: shade(color, 0.45),
    light: '#FFFFFF',
  };
  // Levels 0–14 are five tiers of three divisions; III is the lowest.
  const division = level < 15 ? ((3 - (level % 3)) as 1 | 2 | 3) : null;
  const parts: BadgePart[] = [...badgeParts(tier), ...(showDivision ? divisionPips(division) : [])];

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      opacity={dimmed ? 0.35 : 1}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {parts.map((part, index) =>
        part.kind === 'circle' ? (
          <Circle
            key={index}
            cx={part.cx}
            cy={part.cy}
            r={part.r}
            fill={paint[part.paint]}
            fillOpacity={part.opacity ?? 1}
          />
        ) : (
          <Polygon
            key={index}
            points={part.points.map(([x, y]) => `${x},${y}`).join(' ')}
            fill={paint[part.paint]}
            fillOpacity={part.opacity ?? 1}
            strokeLinejoin="round"
          />
        )
      )}
    </Svg>
  );
}
