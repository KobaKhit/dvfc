/**
 * Smoke tests for @dvfc/build scaffold + mutate helpers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  scaffoldBlankDashYaml,
  scaffoldDashFromManifest,
  addChartToSpecFile,
  updateChartInSpecFile,
  explainCoordination,
} from '../dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

test('scaffoldBlankDashYaml produces a dash with charts', () => {
  const yaml = scaffoldBlankDashYaml();
  assert.match(yaml, /id:/);
  assert.match(yaml, /charts:/);
  assert.match(yaml, /trend/);
});

test('scaffoldDashFromManifest reads jaffle stub', async () => {
  const manifest = join(root, 'examples/dbt-jaffle/dbt-stub/manifest.json');
  const { yaml, projectName, modelCount } = await scaffoldDashFromManifest(manifest);
  assert.ok(projectName.length > 0);
  assert.ok(modelCount >= 1);
  assert.match(yaml, /charts:/);
});

test('addChartToSpecFile + updateChartInSpecFile on dash IR', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dvfc-mutate-'));
  const path = join(dir, 'test.dash.yaml');
  await writeFile(
    path,
    `id: test
title: Test
version: 0.1.0
data:
  - id: sales
    type: csv
    path: sales.csv
charts:
  - id: existing
    type: bar
    dataSource: sales
    encoding:
      x: { field: a, type: nominal }
      y: { field: b, type: quantitative }
`
  );

  await addChartToSpecFile(path, {
    id: 'new_line',
    type: 'line',
    dataSource: 'sales',
    encoding: {
      x: { field: 'date', type: 'temporal' },
      y: { field: 'v', type: 'quantitative' },
    },
  });

  let body = await readFile(path, 'utf-8');
  assert.match(body, /new_line/);

  await updateChartInSpecFile(path, 'new_line', { title: 'Updated Title' });
  body = await readFile(path, 'utf-8');
  assert.match(body, /Updated Title/);

  const explanation = await explainCoordination(path);
  assert.match(explanation, /Coordination/);

  await rm(dir, { recursive: true, force: true });
});
