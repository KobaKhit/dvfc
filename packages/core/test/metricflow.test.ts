/**
 * MetricFlow compile / invoke / extract coverage
 */
import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, writeFile, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractSqlFromMetricFlowOutput,
  compileDbtMetricSql,
  invokeMetricFlow,
  findMetricFixtureSql,
  findDbtProjectRoot,
} from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fakeMf = join(__dirname, 'fixtures/fake-mf.sh');
const chartsDir = join(__dirname, '../../../examples/charts');
const projectRoot = join(__dirname, '../../..');

const ENV_KEYS = [
  'DVFC_METRICFLOW_BIN',
  'DVFC_METRICFLOW_MODE',
  'DVFC_METRICFLOW_SKIP',
  'DVFC_METRICFLOW_CACHE',
  'DVFC_DBT_PROJECT',
] as const;

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe('MetricFlow SQL extract', () => {
  it('parses SELECT from explain-style output', () => {
    const sql = extractSqlFromMetricFlowOutput(
      '⠋ Initiating…\n🔎 SQL:\nSELECT a, b FROM t\n'
    );
    assert.match(sql, /^SELECT/i);
    assert.match(sql, /FROM t/i);
  });

  it('prefers fenced sql blocks', () => {
    const sql = extractSqlFromMetricFlowOutput(
      'noise\n```sql\nSELECT 1 AS x\n```\nmore'
    );
    assert.equal(sql, 'SELECT 1 AS x');
  });

  it('throws when no SQL present', () => {
    assert.throws(
      () => extractSqlFromMetricFlowOutput('no sql here'),
      /Could not parse SQL/
    );
  });
});

describe('findMetricFixtureSql / findDbtProjectRoot', () => {
  it('loads total_revenue fixture', async () => {
    const sql = await findMetricFixtureSql('total_revenue', {
      specDir: chartsDir,
      projectRoot,
    });
    assert.ok(sql);
    assert.match(sql!, /sales_daily/i);
  });

  it('returns null when missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-nofixture-'));
    try {
      const sql = await findMetricFixtureSql('missing_metric', {
        specDir: dir,
        projectRoot: dir,
      });
      assert.equal(sql, null);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('finds dbt_project.yml walking parents', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-dbtproj-'));
    try {
      await writeFile(join(dir, 'dbt_project.yml'), 'name: t\n');
      const nested = join(dir, 'a', 'b');
      await mkdir(nested, { recursive: true });
      const found = await findDbtProjectRoot(nested);
      assert.equal(found, dir);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('returns null without dbt_project.yml', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-nodbt-'));
    try {
      assert.equal(await findDbtProjectRoot(dir), null);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('compileDbtMetricSql', () => {
  it('prefers fixture over invoke', async () => {
    const { sql, source } = await compileDbtMetricSql(
      { type: 'dbt_metric', metric: 'total_revenue' },
      {
        specDir: chartsDir,
        projectRoot,
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
      const { sql, source } = await compileDbtMetricSql(
        { type: 'dbt_metric', metric: 'orders' },
        { specDir: dir, projectRoot: dir }
      );
      assert.equal(source, 'metricflow');
      assert.match(sql, /SELECT/i);
      assert.match(sql, /orders/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('caches compiled SQL when requested', async () => {
    await chmod(fakeMf, 0o755);
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-mf-cache-'));
    try {
      process.env.DVFC_METRICFLOW_BIN = fakeMf;
      process.env.DVFC_METRICFLOW_MODE = 'mf';
      const { source } = await compileDbtMetricSql(
        { type: 'dbt_metric', metric: 'cached_metric' },
        { specDir: dir, projectRoot: dir, cache: true }
      );
      assert.equal(source, 'metricflow');
      const cached = await readFile(
        join(dir, 'semantic', 'cached_metric.sql'),
        'utf-8'
      );
      assert.match(cached, /cached_metric/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('wraps errors when fixture and invoke both fail', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-mf-fail-'));
    try {
      process.env.DVFC_METRICFLOW_BIN = '/nonexistent/mf-binary';
      process.env.DVFC_METRICFLOW_MODE = 'mf';
      await assert.rejects(
        () =>
          compileDbtMetricSql(
            { type: 'dbt_metric', metric: 'gone' },
            { specDir: dir, projectRoot: dir }
          ),
        /dbt_metric 'gone' not resolved/
      );
    } finally {
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
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('supports dbt-sl mode args', async () => {
    await chmod(fakeMf, 0o755);
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-dbtsl-'));
    await writeFile(join(dir, 'dbt_project.yml'), 'name: test\n');
    try {
      process.env.DVFC_METRICFLOW_BIN = fakeMf;
      process.env.DVFC_METRICFLOW_MODE = 'dbt-sl';
      const sql = await invokeMetricFlow(
        {
          type: 'dbt_metric',
          metric: 'rev',
          group_by: ['day'],
          where: "region = 'US'",
        },
        { specDir: dir, dbtProjectDir: dir }
      );
      assert.match(sql, /rev/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('throws when skipInvoke / DVFC_METRICFLOW_SKIP', async () => {
    process.env.DVFC_METRICFLOW_SKIP = '1';
    await assert.rejects(
      () =>
        invokeMetricFlow(
          { type: 'dbt_metric', metric: 'x' },
          { specDir: chartsDir, skipInvoke: true }
        ),
      /skipped/i
    );
  });
});
