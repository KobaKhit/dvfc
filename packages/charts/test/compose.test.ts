/**
 * composeDash + extractChartsFromDash
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeDash, extractChartsFromDash } from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');

test('composeDash writes dash yaml from chart ids', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dvfc-compose-'));
  const outFile = join(dir, 'out.dash.yaml');
  const { dash, outPath } = await composeDash(projectRoot, {
    chartIds: ['daily_revenue', 'dbt-jaffle__revenue_by_method'],
    title: 'My Compose',
    description: 'test compose',
    outFile,
  });
  assert.equal(outPath, outFile);
  assert.equal(dash.title, 'My Compose');
  assert.equal(dash.charts.length, 2);
  assert.ok(dash.charts.every((c) => 'chart' in c));
  const text = await readFile(outFile, 'utf-8');
  assert.match(text, /daily_revenue|revenue_by_method/);
  await rm(dir, { recursive: true, force: true });
});

test('composeDash throws when chart missing', async () => {
  await assert.rejects(
    () =>
      composeDash(projectRoot, {
        chartIds: ['definitely_not_a_chart_xyz_999'],
        outFile: join(tmpdir(), 'nope.dash.yaml'),
      }),
    /No chart found/
  );
});

test('extractChartsFromDash writes inline charts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dvfc-extract-'));
  const written = await extractChartsFromDash(
    join(projectRoot, 'examples/sales-board/sales.dash.yaml'),
    dir
  );
  assert.ok(written.length >= 1);
  const first = await readFile(written[0], 'utf-8');
  assert.match(first, /id:/);
  assert.match(first, /type:/);
  await rm(dir, { recursive: true, force: true });
});

test('extractChartsFromDash rejects non-dash', async () => {
  await assert.rejects(
    () =>
      extractChartsFromDash(
        join(projectRoot, 'examples/charts/revenue_trend.chart.yaml'),
        join(tmpdir(), 'x')
      ),
    /extract requires/
  );
});
