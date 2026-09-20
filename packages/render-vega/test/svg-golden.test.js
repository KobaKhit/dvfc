/**
 * Golden SVG test — structural hash + size bounds.
 * Set UPDATE_GOLDEN=1 to refresh fixtures/revenue_trend.golden.svg and .sha256.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { exportStatic } from '../dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const chart = join(root, 'examples/charts/revenue_trend.chart.yaml');
const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const goldenSvg = join(fixtures, 'revenue_trend.golden.svg');
const goldenHash = join(fixtures, 'revenue_trend.sha256');

/** Strip volatile attrs (ids, aria) for stable comparison */
function normalizeSvg(svg) {
  return svg
    .replace(/\s+/g, ' ')
    .replace(/\s(id|aria-label|aria-hidden)="[^"]*"/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
}

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

test('exportStatic produces SVG matching golden hash', async () => {
  const outDir = join(root, 'packages/render-vega/test/out');
  await mkdir(outDir, { recursive: true });
  await mkdir(fixtures, { recursive: true });
  const outFile = join(outDir, 'revenue_trend.svg');
  const path = await exportStatic(chart, {
    format: 'svg',
    outFile,
    projectRoot: root,
  });
  const svg = await readFile(path, 'utf-8');
  assert.match(svg, /<svg[\s>]/i);
  assert.ok(svg.length > 2000, `expected substantial SVG, got ${svg.length} bytes`);
  assert.ok(svg.length < 200_000, 'SVG unexpectedly large');

  const normalized = normalizeSvg(svg);
  const hash = sha256(normalized);

  if (process.env.UPDATE_GOLDEN === '1') {
    await writeFile(goldenSvg, svg);
    await writeFile(goldenHash, hash + '\n');
    console.log(`Updated golden → ${goldenSvg} (${hash})`);
    return;
  }

  const expected = (await readFile(goldenHash, 'utf-8')).trim();
  assert.equal(hash, expected, 'SVG structural hash mismatch — run UPDATE_GOLDEN=1 if intentional');
});

test('html-static page embeds VL schema and vegaEmbed', async () => {
  const outDir = join(root, 'packages/render-vega/test/out');
  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, 'revenue_trend.static.html');
  const path = await exportStatic(chart, {
    format: 'html-static',
    outFile,
    projectRoot: root,
  });
  const html = await readFile(path, 'utf-8');
  assert.match(html, /vega-embed/i);
  assert.match(html, /vega\.github\.io\/schema\/vega-lite/);
  assert.match(html, /vegaEmbed\s*\(/);
  assert.ok(html.length > 500);
});
