import type { MuscleGroup } from '@/db/exerciseTags';

// Shapes for the stylized body diagram (components/body/BodyMap.tsx), in a 120 × 240
// viewBox per figure. Outlines are listed as control points for the left half of the image
// and smoothed into curves (closed Catmull-Rom spline, see outline()); mirrored shapes are
// reflected across x = 60. `center` shapes are drawn once; `joined` shapes are mirrored and
// merged into one outline (no seam down the middle).

export type Point = [number, number];
export type Poly = { points: Point[]; center?: boolean; joined?: boolean };
export type Ellipse = { cx: number; cy: number; rx: number; ry: number; center?: boolean };

export type BodyView = {
  /** Non-muscle parts: head, neck, torso, limbs, hands, feet. Drawn first, in the base color. */
  base: (Poly | Ellipse)[];
  muscles: { muscle: MuscleGroup; points: Point[] }[];
  /** Detail strokes (e.g. ab segments), drawn in the gap color over the muscles. Left half. */
  lines: Point[][];
};

export const VIEW_WIDTH = 120;
export const VIEW_HEIGHT = 240;
export const MIRROR_X = 60;

const BASE: (Poly | Ellipse)[] = [
  { cx: 60, cy: 15.5, rx: 9.5, ry: 11.5, center: true }, // head
  { points: [[55.5, 24], [64.5, 24], [66, 34], [54, 34]], center: true }, // neck
  // torso (one outline across both sides)
  {
    joined: true,
    points: [[60, 31], [53, 33], [46, 35.5], [39.5, 39], [41, 50], [42, 62], [42.5, 76], [44, 92], [43.5, 104], [46, 113], [60, 119]],
  },
  // arm
  {
    points: [[46, 36], [38, 38.5], [33, 43], [30.5, 52], [30, 64], [28.5, 78], [27.5, 92], [28.5, 105], [34.5, 105.5], [37.5, 96], [41, 84], [43.5, 70], [44.5, 56]],
  },
  { cx: 31, cy: 112, rx: 4.6, ry: 7.2 }, // hand
  // leg
  {
    points: [[43.5, 104], [52, 110], [59.5, 116], [59, 128], [57.5, 150], [56, 166], [53.5, 190], [52.5, 212], [44.5, 212], [42, 192], [40.5, 168], [40, 145], [40.5, 124]],
  },
  { cx: 48.5, cy: 218.5, rx: 6.5, ry: 4.2 }, // foot
];

const DELT: Point[] = [[47, 37], [40, 38.5], [35, 42], [32.5, 48], [32, 55], [34.5, 60.5], [38, 56], [42, 50], [46, 44]];
const FOREARM: Point[] = [[32.5, 83], [36, 80.5], [40, 82], [41, 88.5], [38.5, 97], [35.5, 103], [31.5, 103.5], [29.5, 96], [30, 88]];

export const FRONT: BodyView = {
  base: BASE,
  muscles: [
    { muscle: 'shoulders', points: DELT },
    { muscle: 'chest', points: [[59.2, 41], [52, 39], [46, 41], [43, 46], [42.5, 53], [45, 59], [51, 62.5], [59.2, 62]] },
    { muscle: 'biceps', points: [[35, 61.5], [38.5, 58.5], [41.5, 60], [43, 66], [42, 74], [38.5, 79], [34.5, 78], [32.5, 71]] },
    { muscle: 'forearms', points: FOREARM },
    // rectus abdominis, then obliques
    { muscle: 'abs', points: [[59.2, 66], [53, 66.5], [52, 76], [52, 88], [53.5, 99], [56, 106], [59.2, 108.5]] },
    { muscle: 'abs', points: [[50.6, 66.5], [46, 64], [43.5, 70], [43.5, 80], [45.5, 91], [50.6, 99], [50.6, 82]] },
    {
      muscle: 'quads',
      points: [[45.5, 111], [51, 114.5], [57.5, 122], [57.5, 135], [56.5, 150], [54, 161], [49.5, 164], [45.5, 160], [42.5, 148], [41.5, 130]],
    },
    { muscle: 'calves', points: [[44, 172], [48, 169], [51, 174], [51.5, 185], [49.5, 200], [46.5, 206], [43.5, 198], [42, 186]] },
  ],
  // Six-pack segment lines across the rectus.
  lines: [
    [[52.4, 76.5], [59.4, 76]],
    [[52.6, 87.5], [59.4, 87]],
    [[53.4, 97.5], [59.4, 97.5]],
  ],
};

export const BACK: BodyView = {
  base: BASE,
  muscles: [
    // traps / upper back, lats, lower back
    { muscle: 'back', points: [[60, 28.5], [55.5, 30], [50, 34], [46.5, 38], [50, 43], [55, 49], [60, 57]] },
    { muscle: 'back', points: [[48, 45], [44.5, 50], [43, 58], [43.5, 68], [46.5, 80], [52, 89], [59.2, 93], [59.2, 61], [54, 53]] },
    { muscle: 'back', points: [[59.2, 95.5], [53, 92], [51, 97], [51.5, 102], [59.2, 105.5]] },
    { muscle: 'shoulders', points: DELT },
    { muscle: 'triceps', points: [[34.5, 61], [39, 57], [42.5, 60], [43.5, 67], [41.5, 76], [37.5, 79.5], [33.5, 76], [32.5, 68]] },
    { muscle: 'forearms', points: FOREARM },
    { muscle: 'glutes', points: [[59.2, 107.5], [52, 104], [46, 106.5], [43.5, 113], [44.5, 121], [49, 127], [55, 128.5], [59.2, 126]] },
    {
      muscle: 'hamstrings',
      points: [[44.5, 127], [50, 131], [57.5, 131], [57.5, 142], [56.5, 153], [54, 162], [49, 164], [45, 158], [43, 146], [43, 135]],
    },
    { muscle: 'calves', points: [[43, 171], [47, 166.5], [51, 168], [53.5, 177], [52.5, 190], [49.5, 201], [46.5, 205], [43.5, 197], [41.5, 184]] },
  ],
  lines: [],
};

export function isEllipse(shape: Poly | Ellipse): shape is Ellipse {
  return 'cx' in shape;
}

export function mirror(points: Point[]): Point[] {
  return points.map(([x, y]) => [2 * MIRROR_X - x, y]);
}

// Left half + its reflection as one closed outline (skipping the duplicated midline points).
export function joinMirrored(points: Point[]): Point[] {
  const right = mirror(points)
    .reverse()
    .filter(([x]) => Math.abs(x - MIRROR_X) > 0.01);
  return [...points, ...right];
}

// Smooth closed outline through the control points: a centripetal-free (uniform)
// Catmull-Rom spline, sampled `steps` times per segment. Returns points for <Polygon>.
export function outline(points: Point[], steps = 6): Point[] {
  const n = points.length;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (k: 0 | 1) =>
        0.5 *
        (2 * p1[k] +
          (-p0[k] + p2[k]) * t +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([Math.round(at(0) * 100) / 100, Math.round(at(1) * 100) / 100]);
    }
  }
  return out;
}

// Every polygon to draw for a base shape (smoothed, mirrored or joined as needed).
export function baseOutlines(shape: Poly): Point[][] {
  if (shape.center) return [outline(shape.points)];
  if (shape.joined) return [outline(joinMirrored(shape.points))];
  return [outline(shape.points), outline(mirror(shape.points))];
}
