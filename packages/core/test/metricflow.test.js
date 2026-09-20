import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractSqlFromMetricFlowOutput,
  compileDbtMetricSql,
  invokeMetricFlow,
} from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fakeMf = join(__dirname, 'fixtures/fake-mf.sh');

describe('MetricFlow SQL extract', () => {
  it('parses SELECT from explain-style output', () => {
    const sql = extractSqlFromMetricFlowOutput(
      '⠋ Initiating…\n🔎 SQL:\nSELECT a, b FROM t\n'
    );
    assert.match(sql, /^SELECT/i);
    assert.match(sql, /FROM t/i);
  });
});

describe('compileDbtMetricSql', () => {
  it('prefers fixture over invoke', async () => {
    const { sql, source } = await compileDbtMetricSql(
      { type: 'dbt_metric', metric: 'total_revenue' },
      {
        specDir: join(__dirname, '../../../examples/charts'),
        projectRoot: join(__dirname, '../../..'),
        skipInvoke: true,
      }
    );
    assert.equal(source, 'fixture');
    assert.match(sql, /sales_daily/i);
  });

  it('invokes MetricFlow when fixture missing', async () => {
    await chmod(fakeMf, 0o755);
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-mf-'));
    try {
      process.env.DVFC_METRICFLOW_BIN = fakeMf;
      process.env.DVFC_METRICFLOW_MODE = 'mf';
      delete process.env.DVFC_METRICFLOW_SKIP;
      const { sql, source } = await compileDbtMetricSql(
        { type: 'dbt_metric', metric: 'orders' },
        { specDir: dir, projectRoot: dir }
      );
      assert.equal(source, 'metricflow');
      assert.match(sql, /SELECT/i);
      assert.match(sql, /orders/i);
    } finally {
      delete process.env.DVFC_METRICFLOW_BIN;
      delete process.env.DVFC_METRICFLOW_MODE;
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('invokeMetricFlow', () => {
  it('runs fake mf binary', async () => {
    await chmod(fakeMf, 0o755);
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-mf2-'));
    await writeFile(join(dir, 'dbt_project.yml'), 'name: test\n');
    try {
      process.env.DVFC_METRICFLOW_BIN = fakeMf;
      const sql = await invokeMetricFlow(
        { type: 'dbt_metric', metric: 'revenue', group_by: ['metric_time'] },
        { specDir: dir, dbtProjectDir: dir }
      );
      assert.match(sql, /revenue/i);
    } finally {
      delete process.env.DVFC_METRICFLOW_BIN;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
