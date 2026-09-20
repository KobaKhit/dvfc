import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  parseSpecString,
  registerBuiltinChartTypes,
  clearChartTypes,
  listChartTypes,
  loadChartTypeModules,
  validateChartIR,
  validateDashIR,
  hasChartType,
  _resetBuiltinRegistrationForTests,
  dashToDashboardSpec,
} from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('dashToDashboardSpec', () => {
  it('flattens inline dash charts for Mosaic', () => {
    const dash = {
      id: 'sales',
      title: 'Sales',
      version: '0.1.0',
      data: [{ id: 'sales', type: 'dbt' as const, model: 'sales_daily' }],
      charts: [
        {
          id: 'trend',
          type: 'line',
          dataSource: 'sales',
          encoding: { x: { field: 'date' }, y: { field: 'sales' } },
          interaction: { brush: true, publishes: 'time' },
        },
      ],
    };
    const spec = dashToDashboardSpec(dash);
    assert.equal(spec.meta.title, 'Sales');
    assert.equal(spec.charts[0].interaction?.selection, 'time');
  });
});

describe('parseSpecString', () => {
  it('parses chart yaml', () => {
    const yaml = `
id: revenue_trend
type: line
title: Revenue
data:
  type: sql
  sql: SELECT 1 AS x, 2 AS y
encoding:
  x: { field: x, type: quantitative }
  y: { field: y, type: quantitative }
`;
    const parsed = parseSpecString(yaml, { format: 'yaml', prefer: 'chart' });
    assert.equal(parsed.kind, 'chart');
    if (parsed.kind !== 'chart') throw new Error('expected chart');
    assert.equal(parsed.chart.id, 'revenue_trend');
    assert.equal(parsed.chart.data?.type, 'sql');
  });

  it('parses dash with ref + inline', () => {
    const yaml = `
id: sales
title: Sales
coordination:
  auto: true
charts:
  - chart: revenue_trend
  - id: by_region
    type: bar
    dataSource: sales
    encoding:
      x: { field: region }
      y: { field: sales }
`;
    const parsed = parseSpecString(yaml, { format: 'yaml', prefer: 'dash' });
    assert.equal(parsed.kind, 'dash');
  });

  it('rejects legacy board shape', () => {
    assert.throws(
      () =>
        parseSpecString(
          'meta:\n  title: x\ndata: []\ncharts: []\n',
          { format: 'yaml' }
        ),
      /Legacy board|removed|dash|chart/i
    );
  });

  it('rejects board.yaml path', () => {
    assert.throws(
      () =>
        parseSpecString('id: x\ncharts: []\n', {
          format: 'yaml',
          path: '/tmp/board.yaml',
        }),
      /Legacy board|removed/i
    );
  });

  it('parses sales.dash.yaml example', async () => {
    const dashPath = join(__dirname, '../../../examples/sales-dash/sales.dash.yaml');
    const content = await readFile(dashPath, 'utf-8');
    const parsed = parseSpecString(content, { path: dashPath });
    assert.equal(parsed.kind, 'dash');
    if (parsed.kind !== 'dash') throw new Error('expected dash');
    assert.ok(parsed.dash.charts.length >= 1);
  });
});

describe('chart type registry', () => {
  it('registers builtins', () => {
    clearChartTypes();
    _resetBuiltinRegistrationForTests();
    registerBuiltinChartTypes();
    assert.ok(hasChartType('line'));
    assert.ok(listChartTypes().length >= 10);
  });

  it('loads plugin module', async () => {
    clearChartTypes();
    _resetBuiltinRegistrationForTests();
    registerBuiltinChartTypes();
    const fixture = join(__dirname, 'fixtures/hello-chart-type.js');
    await loadChartTypeModules([fixture]);
    assert.ok(hasChartType('hello'));
  });
});

describe('validate IR', () => {
  it('validates chart', () => {
    registerBuiltinChartTypes();
    const result = validateChartIR({
      id: 'c',
      type: 'line',
      data: { type: 'sql', sql: 'SELECT 1' },
      encoding: { x: { field: 'a' }, y: { field: 'b' } },
    });
    assert.equal(result.valid, true);
  });

  it('validates dash', () => {
    registerBuiltinChartTypes();
    const result = validateDashIR({
      id: 'd',
      charts: [
        {
          id: 'c',
          type: 'bar',
          dataSource: 's',
          encoding: { x: { field: 'a' }, y: { field: 'b' } },
        },
      ],
      data: [{ id: 's', type: 'dbt', model: 'm' }],
    });
    assert.equal(result.valid, true);
  });
});
