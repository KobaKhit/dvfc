/**
 * Golden SVG smoke test — export fixture and assert SVG shape/size.
 * Full pixel golden files are optional; this guards regressions in export path.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { exportStatic } from '../dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const chart = join(root, 'examples/charts/revenue_trend.chart.yaml');

test('exportStatic produces SVG with vg/svg root and sensible size', async () => {
  const outDir = join(root, 'packages/render-vega/test/out');
  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, 'revenue_trend.svg');
  const path = await exportStatic(chart, {
    format: 'svg',
    outFile,
    projectRoot: root,
  });
  const svg = await readFile(path, 'utf-8');
  assert.match(svg, /<svg[\s>]/i);
  assert.ok(svg.length > 2000, `expected substantial SVG, got ${svg.length} bytes`);
  // Stable-ish golden: store byte length band (Vega may tweak markup)
  assert.ok(svg.length < 200_000, 'SVG unexpectedly large');
});
