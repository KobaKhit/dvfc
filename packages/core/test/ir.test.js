import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  boardToDash,
  parseSpecString,
  registerBuiltinChartTypes,
  clearChartTypes,
  listChartTypes,
  registerChartType,
  loadChartTypeModules,
  validateChartIR,
  validateDashIR,
  hasChartType,
  _resetBuiltinRegistrationForTests,
} from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('boardToDash compat', () => {
  it('converts legacy board to dash with inline charts', () => {
    const board = {
      meta: { title: 'Sales Board', version: '0.1.0' },
      data: [{ id: 'sales', type: 'dbt', model: 'sales_daily' }],
      charts: [
        {
          id: 'trend',
          type: 'line',
          dataSource: 'sales',
          encoding: { x: { field: 'date' }, y: { field: 'sales' } },
          interaction: { brush: true, selection: 'time' },
        },
        {
          id: 'by_region',
          type: 'bar',
          dataSource: 'sales',
          encoding: { x: { field: 'region' }, y: { field: 'sales' } },
          interaction: { filterBy: 'time' },
        },
      ],
    };

    const dash = boardToDash(board);
    assert.equal(dash.id, 'sales-board');
    assert.equal(dash.charts.length, 2);
    assert.equal(dash.coordination?.auto, true);
    assert.equal(dash.charts[0].interaction.publishes, 'time');
    assert.equal(dash.data?.[0].id, 'sales');
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
    assert.equal(parsed.chart.id, 'revenue_trend');
    assert.equal(parsed.chart.data.type, 'sql');
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
    data:
      type: data
      path: data/sales.csv
    encoding:
      x: { field: region, type: nominal }
      y: { field: sales, aggregate: sum }
`;
    const parsed = parseSpecString(yaml, { format: 'yaml', prefer: 'dash' });
    assert.equal(parsed.kind, 'dash');
    assert.equal(parsed.dash.charts.length, 2);
  });

  it('parses toml chart', () => {
    const toml = `
id = "kpi_revenue"
type = "number"
title = "Revenue"

[data]
type = "data"
path = "data.csv"
`;
    const parsed = parseSpecString(toml, { format: 'toml', prefer: 'chart' });
    assert.equal(parsed.kind, 'chart');
    assert.equal(parsed.chart.type, 'number');
  });
});

describe('chart type registry', () => {
  it('registers builtins', () => {
    clearChartTypes();
    _resetBuiltinRegistrationForTests();
    registerBuiltinChartTypes();
    assert.ok(hasChartType('line'));
    assert.ok(hasChartType('bar'));
    assert.ok(listChartTypes().length >= 13);
  });

  it('loads plugin module', async () => {
    clearChartTypes();
    _resetBuiltinRegistrationForTests();
    registerBuiltinChartTypes();
    const pluginPath = join(__dirname, 'fixtures/hello-chart-type.js');
    await loadChartTypeModules([pluginPath]);
    assert.ok(hasChartType('hello'));
  });
});

describe('validateChartIR / validateDashIR', () => {
  it('accepts valid chart with sql data', () => {
    clearChartTypes();
    _resetBuiltinRegistrationForTests();
    const result = validateChartIR({
      id: 't',
      type: 'line',
      data: { type: 'sql', sql: 'SELECT 1 AS x, 2 AS y' },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    });
    assert.equal(result.valid, true, JSON.stringify(result.errors));
  });

  it('rejects unknown chart type', () => {
    clearChartTypes();
    _resetBuiltinRegistrationForTests();
    const result = validateChartIR({
      id: 't',
      type: 'sankey',
      data: { type: 'data', path: 'x.csv' },
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.message.includes('Unknown chart type')));
  });

  it('validates dash filterBy against publishes', () => {
    clearChartTypes();
    _resetBuiltinRegistrationForTests();
    const result = validateDashIR({
      id: 'sales',
      charts: [
        {
          id: 'a',
          type: 'line',
          data: { type: 'data', path: 'a.csv' },
          encoding: { x: { field: 'd' }, y: { field: 'v' } },
          interaction: { brush: true, publishes: 'time' },
        },
        {
          id: 'b',
          type: 'bar',
          data: { type: 'data', path: 'a.csv' },
          encoding: { x: { field: 'c' }, y: { field: 'v' } },
          interaction: { filterBy: 'missing' },
        },
      ],
    });
    assert.equal(result.valid, false);
  });
});

describe('real board fixture via parse', async () => {
  it('interprets sales-board board.yaml as board→dash', async () => {
    const boardPath = join(__dirname, '../../../examples/sales-board/board.yaml');
    const content = await readFile(boardPath, 'utf-8');
    const parsed = parseSpecString(content, { path: boardPath, format: 'yaml' });
    assert.equal(parsed.kind, 'board');
    assert.ok(parsed.dash.charts.length >= 4);
    const dashResult = validateDashIR(parsed.dash);
    assert.equal(dashResult.valid, true, JSON.stringify(dashResult.errors, null, 2));
  });
});
