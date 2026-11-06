// Geometry for the strength-rank badges (components/rank/RankBadge.tsx), in a 100 × 100
// box. Pure data so it can also be rendered outside React Native for previews. Original
// shapes: each tier gets a more elaborate silhouette, from a plain medallion (Bronze) to a
// twelve-point sunburst (Olympian).

export type BadgeTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'elite'
  | 'worldClass'
  | 'olympian';

type Pt = [number, number];
/** base = tier color, dark = shaded tier color, light = highlight/mark. */
export type Paint = 'base' | 'dark' | 'light';
export type BadgePart =
  | { kind: 'polygon'; points: Pt[]; paint: Paint; opacity?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; paint: Paint; opacity?: number };

const CX = 50;
const CY = 46;

function regular(sides: number, r: number, rotationDeg = -90, cx = CX, cy = CY): Pt[] {
  return Array.from({ length: sides }, (_, i) => {
    const a = ((rotationDeg + (360 / sides) * i) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

function star(points: number, outer: number, inner: number, rotationDeg = -90): Pt[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((rotationDeg + (180 / points) * i) * Math.PI) / 180;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  });
}

function scale(points: Pt[], k: number): Pt[] {
  return points.map(([x, y]) => [CX + (x - CX) * k, CY + (y - CY) * k]);
}

const SHIELD: Pt[] = [
  [50, 8], [62, 12], [76, 14], [80, 18], [80, 42], [76, 58], [66, 71], [50, 82],
  [34, 71], [24, 58], [20, 42], [20, 18], [24, 14], [38, 12],
];

// An upward chevron centered at (CX, y).
function chevron(y: number, w = 16, h = 7, t = 4.5): Pt[] {
  return [
    [CX - w, y + h], [CX, y - h + t], [CX + w, y + h], [CX + w, y + h + t], [CX, y + t], [CX - w, y + h + t],
  ];
}

const MARK_STAR = star(5, 11, 4.6);

export function badgeParts(tier: BadgeTier): BadgePart[] {
  switch (tier) {
    case 'bronze':
      return [
        { kind: 'circle', cx: CX, cy: CY, r: 34, paint: 'base' },
        { kind: 'circle', cx: CX, cy: CY, r: 26, paint: 'dark' },
        { kind: 'polygon', points: chevron(CY - 4), paint: 'light' },
      ];
    case 'silver':
      return [
        { kind: 'polygon', points: SHIELD, paint: 'base' },
        { kind: 'polygon', points: scale(SHIELD, 0.74), paint: 'dark' },
        { kind: 'polygon', points: chevron(CY - 10), paint: 'light' },
        { kind: 'polygon', points: chevron(CY + 2), paint: 'light' },
      ];
    case 'gold':
      return [
        { kind: 'polygon', points: regular(6, 38), paint: 'base' },
        { kind: 'polygon', points: regular(6, 28), paint: 'dark' },
        { kind: 'polygon', points: MARK_STAR, paint: 'light' },
      ];
    case 'platinum':
      return [
        { kind: 'polygon', points: regular(8, 38, -67.5), paint: 'base' },
        { kind: 'polygon', points: regular(8, 29, -67.5), paint: 'dark' },
        { kind: 'polygon', points: regular(8, 22, -67.5), paint: 'base', opacity: 0.35 },
        { kind: 'polygon', points: MARK_STAR, paint: 'light' },
      ];
    case 'diamond': {
      const gem: Pt[] = [[50, 6], [80, 40], [50, 86], [20, 40]];
      return [
        { kind: 'polygon', points: gem, paint: 'base' },
        // facets: a darker lower half and a bright upper-left face
        { kind: 'polygon', points: [[20, 40], [80, 40], [50, 86]], paint: 'dark' },
        { kind: 'polygon', points: [[50, 6], [35, 40], [20, 40]], paint: 'light', opacity: 0.55 },
        { kind: 'polygon', points: [[50, 6], [65, 40], [50, 40]], paint: 'light', opacity: 0.25 },
        { kind: 'polygon', points: [[35, 40], [50, 86], [50, 40]], paint: 'base', opacity: 0.35 },
      ];
    }
    case 'elite':
      return [
        { kind: 'polygon', points: star(6, 42, 27), paint: 'base' },
        { kind: 'polygon', points: regular(6, 23, -60), paint: 'dark' },
        { kind: 'polygon', points: MARK_STAR, paint: 'light' },
      ];
    case 'worldClass':
      return [
        { kind: 'polygon', points: star(8, 44, 31, -90), paint: 'base' },
        { kind: 'circle', cx: CX, cy: CY, r: 26, paint: 'dark' },
        { kind: 'circle', cx: CX, cy: CY, r: 21, paint: 'base', opacity: 0.3 },
        { kind: 'polygon', points: star(5, 13, 5.4), paint: 'light' },
      ];
    case 'olympian':
      return [
        { kind: 'polygon', points: star(12, 45, 35, -90), paint: 'base' },
        { kind: 'circle', cx: CX, cy: CY, r: 31, paint: 'light', opacity: 0.9 },
        { kind: 'circle', cx: CX, cy: CY, r: 28, paint: 'dark' },
        { kind: 'circle', cx: CX, cy: CY, r: 22, paint: 'base', opacity: 0.3 },
        { kind: 'polygon', points: star(5, 15, 6.2), paint: 'light' },
      ];
  }
}

// Division pips under the badge for tiers with III/II/I: III = 1 pip … I = 3 pips.
export function divisionPips(division: 1 | 2 | 3 | null): BadgePart[] {
  if (division == null) return [];
  const count = 4 - division;
  const spacing = 9;
  const start = CX - ((count - 1) * spacing) / 2;
  return Array.from({ length: count }, (_, i) => ({
    kind: 'circle' as const,
    cx: start + i * spacing,
    cy: 94,
    r: 3.4,
    paint: 'base' as const,
  }));
}

// Darken a #RRGGBB color by `amount` (0–1).
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - amount)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
