// Generates Forge's app icon, splash image and Android adaptive icon layers: an orange
// dumbbell, tilted, on the app's near-black background. No dependencies.
//
// Usage: node scripts/generate-brand-assets.mjs
// Writes into assets/images/. Colors match constants/Colors.ts (dark).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createCanvas, encodePng, fillShape, hex } from './lib/raster.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');
const BACKGROUND = '#0A0A0C';
const ACCENT = '#FF6A1F';
const ACCENT_DARK = '#D94E0B';
const ANGLE = (-32 * Math.PI) / 180;

// Dumbbell parts in unit space (width ≈ 1, centered on 0,0): [cx, cy, w, h, radius].
const PARTS = [
  [0, 0, 0.6, 0.075, 0.03], // bar
  [-0.235, 0, 0.1, 0.44, 0.04], // inner plates
  [0.235, 0, 0.1, 0.44, 0.04],
  [-0.335, 0, 0.085, 0.31, 0.035], // outer plates
  [0.335, 0, 0.085, 0.31, 0.035],
  [-0.41, 0, 0.05, 0.12, 0.02], // collars
  [0.41, 0, 0.05, 0.12, 0.02],
];

function roundRectContains(px, py, [cx, cy, w, h, r]) {
  const qx = Math.max(Math.abs(px - cx) - (w / 2 - r), 0);
  const qy = Math.max(Math.abs(py - cy) - (h / 2 - r), 0);
  return qx * qx + qy * qy <= r * r;
}

// Draws the dumbbell centered at (cx, cy), `size` pixels wide before rotation.
function drawLogo(canvas, cx, cy, size, color, shade) {
  const cos = Math.cos(-ANGLE);
  const sin = Math.sin(-ANGLE);
  const toUnit = (x, y) => {
    const dx = (x - cx) / size;
    const dy = (y - cy) / size;
    return [dx * cos - dy * sin, dx * sin + dy * cos];
  };
  const bounds = [cx - size * 0.6, cy - size * 0.6, cx + size * 0.6, cy + size * 0.6];
  const contains = (parts, offsetY) => (x, y) => {
    const [u, v] = toUnit(x, y);
    return parts.some((p) => roundRectContains(u, v - offsetY, p));
  };
  // A darker copy of the plates just below them gives a little depth.
  if (shade) fillShape(canvas, contains(PARTS.slice(1, 5), 0.035), hex(shade), bounds);
  fillShape(canvas, contains(PARTS, 0), hex(color), bounds);
}

function write(name, canvas) {
  writeFileSync(join(OUT, name), encodePng(canvas));
  console.log(`wrote ${name}`);
}

// App icon: full-bleed dark square (iOS adds the rounded mask).
{
  const c = createCanvas(1024, 1024, hex(BACKGROUND));
  drawLogo(c, 512, 512, 760, ACCENT, ACCENT_DARK);
  write('icon.png', c);
}
// iOS 18+ home screen appearances (app.json ios.icon.dark / .tinted). Dark: the logo on a
// transparent background (iOS supplies the dark backdrop). Tinted: a grayscale logo that
// iOS colors with the user's tint; brightness carries the shading.
{
  const dark = createCanvas(1024, 1024);
  drawLogo(dark, 512, 512, 760, ACCENT, ACCENT_DARK);
  write('icon-dark.png', dark);

  const tinted = createCanvas(1024, 1024);
  drawLogo(tinted, 512, 512, 760, '#F2F2F2', '#9A9A9A');
  write('icon-tinted.png', tinted);
}
// Web favicon (48 × 48): solid background so it reads on light and dark browser tabs.
{
  const c = createCanvas(48, 48, hex(BACKGROUND));
  drawLogo(c, 24, 24, 40, ACCENT, ACCENT_DARK);
  write('favicon.png', c);
}
// Splash image: logo on transparent; the splash background color comes from app.json.
{
  const c = createCanvas(1024, 1024);
  drawLogo(c, 512, 512, 900, ACCENT, ACCENT_DARK);
  write('splash-icon.png', c);
}
// Android adaptive icon: foreground inside the 66% safe zone, solid background,
// and a single-color monochrome layer (Android tints it; only alpha matters).
{
  const fg = createCanvas(512, 512);
  drawLogo(fg, 256, 256, 300, ACCENT, ACCENT_DARK);
  write('android-icon-foreground.png', fg);

  write('android-icon-background.png', createCanvas(512, 512, hex(BACKGROUND)));

  const mono = createCanvas(432, 432);
  drawLogo(mono, 216, 216, 250, '#FFFFFF');
  write('android-icon-monochrome.png', mono);
}
