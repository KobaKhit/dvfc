import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { resolveDataRef, findDbtStubDir } from '../dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

test('findDbtStubDir finds sales-board stub', async () => {
  const stub = await findDbtStubDir({
    specDir: join(root, 'examples/dashes'),
    projectRoot: root,
  });
  assert.ok(stub);
  assert.match(stub, /dbt-stub/);
});

test('resolveDataRef data path', async () => {
  const rel = await resolveDataRef(
    { type: 'data', path: '../sales-board/dbt-stub/sales_daily.csv' },
    'sales',
    { specDir: join(root, 'examples/charts'), projectRoot: root }
  );
  assert.equal(rel.id, 'sales');
  assert.equal(rel.assets.length, 1);
});

test('resolveDataRef dbt_metric from semantic SQL', async () => {
  const rel = await resolveDataRef(
    { type: 'dbt_metric', metric: 'total_revenue' },
    'rev',
    { specDir: join(root, 'examples/charts'), projectRoot: root }
  );
  assert.equal(rel.source.type, 'sql');
  assert.ok(rel.assets.length >= 1);
});
