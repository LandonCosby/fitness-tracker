import type { MuscleGroup } from '@/db/exerciseTags';

// Shapes for the stylized body diagram (components/body/BodyMap.tsx), in a 120 × 240
// viewBox per figure. Each polygon is the left half of the image; it's mirrored across
// x = 60 for the right half. `center` shapes are drawn once, unmirrored.

export type Point = [number, number];
export type Poly = { points: Point[]; center?: boolean };
export type Ellipse = { cx: number; cy: number; rx: number; ry: number; center?: boolean };

export type BodyView = {
  /** Non-muscle parts: head, hands, joints. Drawn first, in the base color. */
  base: (Poly | Ellipse)[];
  muscles: { muscle: MuscleGroup; points: Point[] }[];
};

export const VIEW_WIDTH = 120;
export const VIEW_HEIGHT = 240;
export const MIRROR_X = 60;

const BASE: (Poly | Ellipse)[] = [
  { cx: 60, cy: 16, rx: 10, ry: 12, center: true }, // head
  { points: [[55, 26], [65, 26], [66, 36], [54, 36]], center: true }, // neck
  // torso
  { points: [[60, 34], [47, 36], [37, 40], [40, 58], [42, 80], [44, 100], [43, 110], [60, 117]] },
  // arm
  {
    points: [[45, 37], [35, 41], [31, 50], [30, 63], [28, 80], [27, 95], [28, 106], [35, 106], [38, 96], [42, 80], [44, 64]],
  },
  { cx: 30.5, cy: 113, rx: 4.5, ry: 7.5 }, // hand
  // leg
  { points: [[43, 104], [60, 113], [60, 121], [58.5, 128], [57, 166], [53, 213], [44, 213], [41, 190], [40, 166], [40, 130]] },
  { cx: 48, cy: 219, rx: 6.5, ry: 4.5 }, // foot
];

const DELT: Point[] = [[46, 37], [38, 39], [33, 45], [32, 55], [35, 60], [40, 54], [45, 46]];
const FOREARM: Point[] = [[32, 83], [39, 80], [40.5, 88], [36.5, 102], [31, 103], [29, 94]];
const UPPER_ARM: Point[] = [[34, 62], [40, 57], [42.5, 64], [41, 76], [36, 80], [32, 73]];

export const FRONT: BodyView = {
  base: BASE,
  muscles: [
    { muscle: 'shoulders', points: DELT },
    { muscle: 'chest', points: [[59, 41], [49, 39], [44, 45], [42, 55], [46, 61], [53, 63.5], [59, 63]] },
    { muscle: 'biceps', points: UPPER_ARM },
    { muscle: 'forearms', points: FOREARM },
    // rectus abdominis, then obliques
    { muscle: 'abs', points: [[59, 66], [52.5, 66], [51.5, 82], [52.5, 98], [55, 107], [59, 109]] },
    { muscle: 'abs', points: [[50.5, 66], [45, 63.5], [43, 76], [45, 91], [50.5, 99], [50, 82]] },
    { muscle: 'quads', points: [[45, 110], [52, 115.5], [58, 123], [57, 148], [54, 162], [47, 163], [43, 150], [42, 128]] },
    { muscle: 'calves', points: [[44, 172], [50, 170], [52, 180], [50, 203], [46, 206], [42, 190]] },
  ],
};

export const BACK: BodyView = {
  base: BASE,
  muscles: [
    // traps / upper back, lats, lower back
    { muscle: 'back', points: [[60, 29], [55, 31], [47, 37], [50, 43], [55, 49], [60, 57]] },
    { muscle: 'back', points: [[48, 46], [44, 52], [43, 66], [46, 80], [52, 89], [59, 93], [59, 61], [54, 53]] },
    { muscle: 'back', points: [[59, 96], [52, 92], [50.5, 102], [59, 105.5]] },
    { muscle: 'shoulders', points: DELT },
    { muscle: 'triceps', points: UPPER_ARM },
    { muscle: 'forearms', points: FOREARM },
    { muscle: 'glutes', points: [[59, 108], [50, 104.5], [44, 111], [44, 122], [50, 128], [59, 126]] },
    { muscle: 'hamstrings', points: [[44, 126], [51, 131], [58, 130], [57, 152], [54, 163], [47, 163], [43, 150]] },
    { muscle: 'calves', points: [[43, 170], [50, 166], [53, 178], [51, 196], [47, 204], [42, 190]] },
  ],
};

export function isEllipse(shape: Poly | Ellipse): shape is Ellipse {
  return 'cx' in shape;
}

export function mirror(points: Point[]): Point[] {
  return points.map(([x, y]) => [2 * MIRROR_X - x, y]);
}
