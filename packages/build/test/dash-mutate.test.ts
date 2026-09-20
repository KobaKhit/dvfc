/**
 * IR-only dash mutate helpers (temp copies — never mutates repo fixtures).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  addChartToSpecFile,
  updateChartInSpecFile,
  explainCoordination,
  applyFilterPlan,
} from '../dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const salesFixture = join(root, 'examples/sales-dash/sales.dash.yaml');

async function copySalesFixtureToTmp(): Promise<{ dir: string; path: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'dvfc-dash-mutate-'));
  const path = join(dir, 'sales.dash.yaml');
  await copyFile(salesFixture, path);
  await cp(join(root, 'examples/sales-dash/dbt-stub'), join(dir, 'dbt-stub'), {
    recursive: true,
  });
  return { dir, path };
}

test('addChartToSpecFile rejects duplicate id and unknown dataSource', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dvfc-mutate-add-'));
  const path = join(dir, 'mini.dash.yaml');
  await copyFile(
    join(root, 'examples/dashes/sales.dash.yaml'),
    path
  );

  await assert.rejects(
    () =>
      addChartToSpecFile(path, {
        id: 'by_region',
        type: 'bar',
        dataSource: 'sales_daily',
        encoding: {
          x: { field: 'region', type: 'nominal' },
          y: { field: 'sales', type: 'quantitative' },
        },
      }),
    /already exists/
  );

  await assert.rejects(
    () =>
      addChartToSpecFile(path, {
        id: 'extra',
        type: 'line',
        dataSource: 'missing_data',
        encoding: {
          x: { field: 'date', type: 'temporal' },
          y: { field: 'sales', type: 'quantitative' },
        },
      }),
    /not found/
  );

  await rm(dir, { recursive: true, force: true });
});

test('addChartToSpecFile + updateChartInSpecFile on sales dash copy', async () => {
  const { dir, path } = await copySalesFixtureToTmp();

  await addChartToSpecFile(path, {
    id: 'mutate_test_bar',
    type: 'bar',
    dataSource: 'sales_daily',
    title: 'Mutate test',
    encoding: {
      x: { field: 'region', type: 'nominal' },
      y: { field: 'sales', type: 'quantitative', aggregate: 'sum' },
    },
  });

  let body = await readFile(path, 'utf-8');
  assert.match(body, /mutate_test_bar/);

  await updateChartInSpecFile(path, 'mutate_test_bar', { title: 'Mutate updated' });
  body = await readFile(path, 'utf-8');
  assert.match(body, /Mutate updated/);

  await rm(dir, { recursive: true, force: true });
});

test('explainCoordination on sales dash copy mentions brush selections', async () => {
  const { dir, path } = await copySalesFixtureToTmp();
  const explanation = await explainCoordination(path);
  assert.match(explanation, /Coordination/);
  assert.match(explanation, /salesBrush|Brush Selections/);
  await rm(dir, { recursive: true, force: true });
});

test('applyFilterPlan wires brush and filterBy on inline charts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dvfc-filter-plan-'));
  const path = join(dir, 'coord.dash.yaml');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(
    path,
    `id: coord-test
title: Coord test
version: 0.1.0
data:
  - id: sales
    type: csv
    path: sales.csv
charts:
  - id: brush_chart
    type: line
    dataSource: sales
    encoding:
      x: { field: date, type: temporal }
      y: { field: v, type: quantitative }
  - id: filtered_a
    type: bar
    dataSource: sales
    encoding:
      x: { field: region, type: nominal }
      y: { field: v, type: quantitative }
  - id: filtered_b
    type: bar
    dataSource: sales
    encoding:
      x: { field: product, type: nominal }
      y: { field: v, type: quantitative }
`
  );

  await applyFilterPlan(path, {
    brushChart: 'brush_chart',
    selectionName: 'testBrush',
    filteredCharts: ['filtered_a', 'filtered_b'],
  });

  const updated = await readFile(path, 'utf-8');
  assert.match(updated, /publishes: testBrush/);
  assert.match(updated, /filterBy: testBrush/);

  await rm(dir, { recursive: true, force: true });
});
