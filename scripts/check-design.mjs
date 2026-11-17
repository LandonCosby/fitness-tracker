import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
function dataModule(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  new Function('exports', outputText)(exports);
  return exports;
}
const colors = dataModule('constants/Colors.ts').default.dark;
function rgb(hex) { return hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255); }
function luminance(color) {
  return rgb(color).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
for (const foreground of ['text', 'muted', 'textSecondary', 'tint', 'danger', 'success', 'protein', 'carbs', 'fat']) {
  for (const surface of ['background', 'card', 'cardRaised']) {
    const ratio = contrast(colors[foreground], colors[surface]);
    assert(ratio >= 4.5, `${foreground} on ${surface}: ${ratio.toFixed(2)}:1 (requires 4.5:1)`);
  }
}
assert(contrast(colors.background, colors.tint) >= 4.5, 'Primary button text contrast');
function files(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(folder, entry.name);
    return entry.isDirectory() ? files(name) : /\.tsx?$/.test(name) ? [name] : [];
  });
}
for (const file of [...files(path.join(root, 'app')), ...files(path.join(root, 'components'))]) {
  const source = fs.readFileSync(file, 'utf8');
  assert(!/fontSize:\s*\d|fontWeight:\s*['"]\d|fontSize=\{\d|fontWeight=['"]\d/.test(source), `Use Design tokens in ${path.relative(root, file)}`);
}
console.log('Design checks passed: shared typography and WCAG AA dark text pairs.');
