import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeFile } from '../dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

describe('normalizeFile', () => {
  it('normalizes chart with data path', async () => {
    const result = await normalizeFile(
      join(root, 'examples/charts/revenue_trend.chart.yaml'),
      root
    );
    assert.equal(result.kind, 'chart');
    assert.equal(result.spec.charts.length, 1);
    assert.ok(result.assets.length >= 1);
    assert.equal(result.spec.charts[0].dataSource, result.spec.data[0].id);
  });

  it('normalizes dash with chart ref + dbt', async () => {
    const result = await normalizeFile(
      join(root, 'examples/dashes/sales.dash.yaml'),
      root
    );
    assert.equal(result.kind, 'dash');
    assert.ok(result.spec.charts.length >= 2);
    assert.ok(result.assets.length >= 1);
  });
});
