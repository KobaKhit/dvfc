/**
 * Normalize + resolveDataRef coverage
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeFile,
  normalizeToDashboard,
  resolveDataRef,
  resolveDataSource,
  dataSourceToRef,
  filterSpecToChart,
  findDbtStubDir,
  findDbtModelCsv,
  extractSqlFileRefs,
} from '../dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const chartsDir = join(root, 'examples/charts');
const salesStub = join(root, 'examples/sales-dash/dbt-stub');

describe('extractSqlFileRefs', () => {
  it('collects csv/parquet/json/tsv literals', () => {
    const refs = extractSqlFileRefs(
      `SELECT * FROM 'a.csv' JOIN "b.parquet" ON 1; -- ignore 'x.txt'`
    );
    assert.deepEqual(refs.sort(), ['a.csv', 'b.parquet']);
  });
});

describe('findDbtStubDir / findDbtModelCsv', () => {
  it('finds stub via projectRoot examples', async () => {
    const stub = await findDbtStubDir({
      specDir: join(root, 'examples/dashes'),
      projectRoot: root,
    });
    assert.ok(stub);
    assert.match(stub!, /dbt-stub/);
  });

  it('honors explicit dbtStubDir', async () => {
    const stub = await findDbtStubDir({
      specDir: '/tmp/nowhere',
      dbtStubDir: salesStub,
    });
    assert.equal(stub, salesStub);
  });

  it('returns null when nothing exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-nostub-'));
    try {
      const stub = await findDbtStubDir({ specDir: dir, projectRoot: dir });
      assert.equal(stub, null);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('finds model CSV under stub', async () => {
    const csv = await findDbtModelCsv('sales_daily', {
      specDir: join(root, 'examples/sales-dash'),
      projectRoot: root,
      dbtStubDir: salesStub,
    });
    assert.ok(csv);
    assert.match(csv!, /sales_daily\.csv$/);
  });

  it('returns null for missing model', async () => {
    const csv = await findDbtModelCsv('no_such_model_xyz', {
      specDir: join(root, 'examples/sales-dash'),
      projectRoot: root,
      dbtStubDir: salesStub,
    });
    assert.equal(csv, null);
  });
});

describe('resolveDataRef', () => {
  it('resolves data path', async () => {
    const rel = await resolveDataRef(
      { type: 'data', path: '../sales-dash/dbt-stub/sales_daily.csv' },
      'sales',
      { specDir: chartsDir, projectRoot: root }
    );
    assert.equal(rel.id, 'sales');
    assert.equal(rel.assets.length, 1);
  });

  it('resolves data table without path', async () => {
    const rel = await resolveDataRef(
      { type: 'data', table: 'orders' },
      't',
      { specDir: chartsDir, projectRoot: root }
    );
    assert.equal(rel.source.type, 'sql');
    assert.match(rel.source.sql ?? '', /FROM orders/);
    assert.equal(rel.assets.length, 0);
  });

  it('resolves remote URL without assets', async () => {
    const rel = await resolveDataRef(
      { type: 'data', path: 'https://example.com/data.csv' },
      'remote',
      { specDir: chartsDir, projectRoot: root }
    );
    assert.equal(rel.source.type, 'url');
    assert.equal(rel.assets.length, 0);
  });

  it('throws when data file missing', async () => {
    await assert.rejects(
      () =>
        resolveDataRef(
          { type: 'data', path: 'missing-file.csv' },
          'x',
          { specDir: chartsDir, projectRoot: root }
        ),
      /Data file not found/
    );
  });

  it('throws when data has neither path nor table', async () => {
    await assert.rejects(
      () =>
        resolveDataRef({ type: 'data' }, 'x', {
          specDir: chartsDir,
          projectRoot: root,
        }),
      /path or table/
    );
  });

  it('resolves dbt model', async () => {
    const rel = await resolveDataRef(
      { type: 'dbt', model: 'sales_daily' },
      'm',
      {
        specDir: join(root, 'examples/sales-dash'),
        projectRoot: root,
        dbtStubDir: salesStub,
      }
    );
    assert.equal(rel.source.type, 'dbt');
    assert.equal(rel.assets.length, 1);
  });

  it('throws when dbt model CSV missing', async () => {
    await assert.rejects(
      () =>
        resolveDataRef(
          { type: 'dbt', model: 'nope_model' },
          'm',
          { specDir: chartsDir, projectRoot: root, dbtStubDir: salesStub }
        ),
      /dbt model CSV not found/
    );
  });

  it('resolves sql with file refs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-sql-'));
    try {
      await writeFile(join(dir, 't.csv'), 'a,b\n1,2\n');
      const rel = await resolveDataRef(
        { type: 'sql', sql: `SELECT * FROM 't.csv'` },
        'q',
        { specDir: dir, projectRoot: dir }
      );
      assert.equal(rel.source.type, 'sql');
      assert.ok(rel.assets.length >= 1);
      assert.match(rel.source.sql ?? '', /t\.csv/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('throws when sql file ref missing', async () => {
    await assert.rejects(
      () =>
        resolveDataRef(
          { type: 'sql', sql: `SELECT * FROM 'nope.csv'` },
          'q',
          { specDir: chartsDir, projectRoot: root }
        ),
      /SQL references missing file/
    );
  });

  it('resolves dbt_metric via fixture SQL', async () => {
    const rel = await resolveDataRef(
      { type: 'dbt_metric', metric: 'total_revenue' },
      'rev',
      { specDir: chartsDir, projectRoot: root }
    );
    assert.equal(rel.source.type, 'sql');
    assert.ok(rel.assets.length >= 1);
  });
});

describe('normalizeFile / normalizeToDashboard', () => {
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

  it('normalizes text chart without data assets', async () => {
    const result = await normalizeToDashboard(
      {
        id: 'note',
        type: 'text',
        content: 'Hello world',
      },
      { specDir: chartsDir, projectRoot: root, path: join(chartsDir, 'note.chart.yaml') }
    );
    assert.equal(result.kind, 'chart');
    assert.equal(result.spec.charts[0].type, 'text');
    assert.equal(result.assets.length, 0);
  });

  it('normalizes chart with dataSource only', async () => {
    const result = await normalizeToDashboard(
      {
        id: 'c',
        type: 'bar',
        dataSource: 'shared',
        encoding: { x: { field: 'a' }, y: { field: 'b' } },
      },
      { specDir: chartsDir, projectRoot: root }
    );
    assert.equal(result.spec.charts[0].dataSource, 'shared');
  });

  it('throws when chart lacks data and dataSource', async () => {
    await assert.rejects(
      () =>
        normalizeToDashboard(
          { id: 'c', type: 'line' },
          { specDir: chartsDir, projectRoot: root }
        ),
      /needs data or dataSource/
    );
  });
});

describe('dataSourceToRef / resolveDataSource', () => {
  it('maps dbt / sql / path sources', () => {
    assert.deepEqual(dataSourceToRef({ id: 'a', type: 'dbt', model: 'm' }), {
      type: 'dbt',
      model: 'm',
    });
    assert.deepEqual(dataSourceToRef({ id: 'b', type: 'sql', sql: 'SELECT 1' }), {
      type: 'sql',
      sql: 'SELECT 1',
    });
    assert.deepEqual(dataSourceToRef({ id: 'c', type: 'csv', path: 'x.csv' }), {
      type: 'data',
      path: 'x.csv',
    });
  });

  it('preserves declared id when resolving a csv source', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dvfc-ds-'));
    try {
      await writeFile(join(dir, 'sales.csv'), 'x,y\na,1\n');
      const resolved = await resolveDataSource(
        { id: 'sales', type: 'csv', path: 'sales.csv' },
        { specDir: dir, projectRoot: dir }
      );
      assert.equal(resolved.id, 'sales');
      assert.equal(resolved.source.id, 'sales');
      assert.equal(resolved.assets.length, 1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('filterSpecToChart', () => {
  it('narrows charts, data, and assets', () => {
    const spec = {
      meta: { title: 'T', version: '0.1.0' },
      data: [
        { id: 'a', type: 'csv' as const, path: 'a.csv' },
        { id: 'b', type: 'csv' as const, path: 'b.csv' },
      ],
      charts: [
        { id: 'c1', type: 'bar' as const, dataSource: 'a' },
        { id: 'c2', type: 'line' as const, dataSource: 'b' },
      ],
    };
    const assets = [
      { absPath: '/tmp/a.csv', destName: 'a.csv' },
      { absPath: '/tmp/b.csv', destName: 'b.csv' },
    ];
    const filtered = filterSpecToChart(spec, assets, 'c1');
    assert.equal(filtered.spec.charts.length, 1);
    assert.equal(filtered.spec.charts[0].id, 'c1');
    assert.deepEqual(filtered.spec.data.map((d) => d.id), ['a']);
    assert.deepEqual(filtered.assets.map((a) => a.destName), ['a.csv']);
  });

  it('does not pull in assets that merely share an id prefix', () => {
    const spec = {
      meta: { title: 'T', version: '0.1.0' },
      data: [{ id: 'sales', type: 'csv' as const, path: 'sales.csv' }],
      charts: [{ id: 'c1', type: 'bar' as const, dataSource: 'sales' }],
    };
    const assets = [
      { absPath: '/tmp/sales.csv', destName: 'sales.csv' },
      { absPath: '/tmp/sales_daily.csv', destName: 'sales_daily.csv' },
    ];
    const filtered = filterSpecToChart(spec, assets, 'c1');
    assert.deepEqual(filtered.assets.map((a) => a.destName), ['sales.csv']);
  });

  it('throws when chart id is missing', () => {
    assert.throws(
      () =>
        filterSpecToChart(
          { meta: { title: 'T', version: '0.1.0' }, data: [], charts: [] },
          [],
          'nope'
        ),
      /Chart 'nope' not found/
    );
  });
});
