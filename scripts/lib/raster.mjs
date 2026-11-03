// Tiny anti-aliased rasterizer + PNG encoder (no dependencies), used by
// scripts/generate-brand-assets.mjs. Shapes are filled with 4×4 supersampling.
import { deflateSync } from 'node:zlib';

export function createCanvas(width, height, background = [0, 0, 0, 0]) {
  const data = new Float32Array(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set(background.map((c, k) => (k === 3 ? c / 255 : c / 255)), i * 4);
  return { width, height, data };
}

function blend(canvas, x, y, color, coverage) {
  if (coverage <= 0) return;
  const i = (y * canvas.width + x) * 4;
  const a = (color[3] ?? 255) / 255 * coverage;
  const d = canvas.data;
  const outA = a + d[i + 3] * (1 - a);
  for (let k = 0; k < 3; k++) {
    d[i + k] = outA === 0 ? 0 : (color[k] / 255 * a + d[i + k] * d[i + 3] * (1 - a)) / outA;
  }
  d[i + 3] = outA;
}

// Fills every pixel where inside(px, py) is true, sampled 4×4 per pixel, within bounds.
export function fillShape(canvas, inside, color, bounds) {
  const S = 4;
  const x0 = Math.max(0, Math.floor(bounds[0])), y0 = Math.max(0, Math.floor(bounds[1]));
  const x1 = Math.min(canvas.width - 1, Math.ceil(bounds[2])), y1 = Math.min(canvas.height - 1, Math.ceil(bounds[3]));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let hits = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        if (inside(x + (sx + 0.5) / S, y + (sy + 0.5) / S)) hits++;
      }
      blend(canvas, x, y, color, hits / (S * S));
    }
  }
}

export function fillPolygon(canvas, points, color) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const inside = (px, py) => {
    let hit = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i], [xj, yj] = points[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  fillShape(canvas, inside, color, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
}

export function fillEllipse(canvas, cx, cy, rx, ry, color) {
  fillShape(canvas, (px, py) => ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1, color, [cx - rx, cy - ry, cx + rx, cy + ry]);
}

export function fillRoundRect(canvas, x, y, w, h, r, color) {
  const inside = (px, py) => {
    const qx = Math.max(Math.abs(px - (x + w / 2)) - (w / 2 - r), 0);
    const qy = Math.max(Math.abs(py - (y + h / 2)) - (h / 2 - r), 0);
    return qx * qx + qy * qy <= r * r;
  };
  fillShape(canvas, inside, color, [x, y, x + w, y + h]);
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function encodePng(canvas) {
  const { width, height, data } = canvas;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, o = y * (width * 4 + 1) + 1 + x * 4;
      for (let k = 0; k < 4; k++) raw[o + k] = Math.round(Math.min(1, Math.max(0, data[i + k])) * 255);
    }
  }
  const chunk = (type, body) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
    const td = Buffer.concat([Buffer.from(type), body]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function hex(color, alpha = 255) {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
}
