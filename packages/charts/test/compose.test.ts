/**
 * composeDash + extractChartsFromDash
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeDash, extractChartsFromDash } from '../dist/index.js';
import { normalizeToDashboard } from '@dvfc/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');

test('composeDash writes dash yaml from chart ids', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dvfc-compose-'));
  const outFile = join(dir, 'out.dash.yaml');
  const { dash, outPath } = await composeDash(projectRoot, {
    chartIds: ['dbt-jaffle__daily_revenue', 'dbt-jaffle__payment_mix'],
    title: 'My Compose',
    description: 'test compose',
    outFile,
  });
  assert.equal(outPath, outFile);
  assert.equal(dash.title, 'My Compose');
  assert.equal(dash.charts.length, 2);
  const text = await readFile(outFile, 'utf-8');
  assert.match(text, /daily_revenue/);
  assert.match(text, /payment_mix/);
  await rm(dir, { recursive: true, force: true });
});

test('composeDash → normalizeToDashboard succeeds', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dvfc-compose-norm-'));
  const outFile = join(dir, 'out.dash.yaml');
  await composeDash(projectRoot, {
    chartIds: ['dbt-jaffle__daily_revenue', 'dbt-jaffle__payment_mix'],
    title: 'Normalize Me',
    outFile,
  });
  const { parse } = await import('yaml');
  const result = await normalizeToDashboard(parse(await readFile(outFile, 'utf-8')), {
    projectRoot,
    specDir: dir,
    path: outFile,
  });
  assert.ok(result.spec.charts.length >= 2);
  assert.ok(result.spec.data.length >= 1);
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

test('composeDash throws when chart id is ambiguous', async () => {
  await assert.rejects(
    () =>
      composeDash(projectRoot, {
        chartIds: ['daily_revenue'],
        outFile: join(tmpdir(), 'ambig.dash.yaml'),
      }),
    /Ambiguous chart reference/
  );
});

test('composeDash emits path refs for atomic chart files', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dvfc-compose-atomic-'));
  const chartsDir = join(dir, 'charts');
  await mkdir(chartsDir, { recursive: true });
  await writeFile(
    join(chartsDir, 'solo.chart.yaml'),
    [
      'id: solo',
      'type: bar',
      'title: Solo',
      'data:',
      '  type: data',
      '  path: solo.csv',
      'encoding:',
      '  x: x',
      '  y: y',
      '',
    ].join('\n')
  );
  await writeFile(join(chartsDir, 'solo.csv'), 'x,y\na,1\nb,2\n');
  const outFile = join(dir, 'composed.dash.yaml');
  const { dash } = await composeDash(dir, {
    chartIds: ['solo'],
    outFile,
  });
  assert.equal(dash.charts.length, 1);
  assert.ok('chart' in dash.charts[0]);
  assert.match((dash.charts[0] as { chart: string }).chart, /solo\.chart\.yaml$/);

  const result = await normalizeToDashboard(
    (await import('yaml')).parse(await readFile(outFile, 'utf-8')),
    { projectRoot: dir, specDir: dir, path: outFile }
  );
  assert.equal(result.spec.charts.length, 1);
  assert.equal(result.spec.charts[0].id, 'solo');
  await rm(dir, { recursive: true, force: true });
});

test('extractChartsFromDash writes inline charts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dvfc-extract-'));
  const written = await extractChartsFromDash(
    join(projectRoot, 'examples/sales-dash/sales.dash.yaml'),
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
