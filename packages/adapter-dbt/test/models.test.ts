/**
 * adapter-dbt: listDbtModels + DbtResolver smoke tests
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listDbtModels,
  listModelsForScaffold,
  createDbtResolver,
  type DbtManifest,
} from '../dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const manifestPath = join(root, 'examples/sales-dash/dbt-stub/manifest.json');

async function loadManifest(): Promise<DbtManifest> {
  return JSON.parse(await readFile(manifestPath, 'utf-8')) as DbtManifest;
}

test('listDbtModels returns models from sales-dash stub manifest', async () => {
  const models = listDbtModels(await loadManifest());
  const names = models.map((m) => m.name).sort();
  assert.deepEqual(names, ['flights_summary', 'sales_daily']);
  const sales = models.find((m) => m.name === 'sales_daily');
  assert.ok(sales);
  assert.equal(sales!.schema, 'marts');
  assert.equal(typeof sales!.path, 'string');
});

test('listModelsForScaffold prefers mart models', async () => {
  const scaffold = listModelsForScaffold(await loadManifest(), 3);
  assert.ok(scaffold.length >= 1);
  assert.ok(scaffold.every((m) => m.schema.includes('mart') || m.path.includes('mart')));
});

test('createDbtResolver resolves known models and throws on missing', async () => {
  const resolver = await createDbtResolver(await loadManifest(), {
    dataDir: join(root, 'examples/sales-dash/dbt-stub'),
  });
  assert.equal(resolver.ref('sales_daily'), join(root, 'examples/sales-dash/dbt-stub') + '/sales_daily.csv');
  assert.deepEqual(resolver.listModels().sort(), ['flights_summary', 'sales_daily']);
  assert.throws(() => resolver.ref('no_such_model'), /not found/);
  assert.equal(resolver.getModelInfo('no_such_model'), undefined);
});
