/**
 * dc.js renderer smoke tests
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DashboardSpec } from '@dvfc/core';
import {
  generateDcHtml,
  generateDcChartCode,
  generateDcWasmMainScript,
  generateDcWasmHTML,
} from '../dist/index.js';

const values = [
  { region: 'East', sales: 100, product: 'A', date: '2024-01-01' },
  { region: 'West', sales: 200, product: 'B', date: '2024-01-02' },
];

const smokeSpec: DashboardSpec = {
  meta: { title: 'DC Smoke', version: '0.1.0' },
  data: [{ id: 'sales', type: 'csv', path: 'sales.csv' }],
  layout: { type: 'grid', columns: 2 },
  charts: [
    {
      id: 'by_region',
      type: 'bar',
      title: 'By region',
      dataSource: 'sales',
      encoding: {
        x: { field: 'region', type: 'nominal' },
        y: { field: 'sales', type: 'quantitative', aggregate: 'sum' },
      },
    },
    {
      id: 'mix',
      type: 'pie',
      dataSource: 'sales',
      encoding: {
        x: { field: 'product', type: 'nominal' },
        y: { field: 'sales', type: 'quantitative', aggregate: 'sum' },
      },
    },
  ],
};

test('generateDcChartCode emits barChart for bar specs', () => {
  const code = generateDcChartCode({
    id: 'by_region',
    type: 'bar',
    dataSource: 'sales',
    encoding: {
      x: { field: 'region', type: 'nominal' },
      y: { field: 'sales', type: 'quantitative', aggregate: 'sum' },
    },
    interaction: { publishes: 'brush', select: 'auto' },
  });
  assert.match(code, /dc\.BarChart/);
  assert.match(code, /transitionDuration\(750\)/);
  assert.match(code, /cf_sales/);
});

test('generateDcHtml embeds data and dc CDN (static mode)', () => {
  const html = generateDcHtml(smokeSpec, new Map([['sales', values]]));
  assert.match(html, /dc@4/);
  assert.match(html, /crossfilter/);
  assert.match(html, /d3@7/);
  assert.match(html, /dc\.renderAll/);
  assert.match(html, /"region":"East"/);
  assert.match(html, /id="dc-by_region"/);
  assert.match(html, /BarChart/);
  assert.match(html, /PieChart/);
  assert.match(html, /dc\.config\.defaultColors/);
  assert.match(html, /dc\.js · static/);
  assert.match(html, /CDN \+ inlined CSV/);
});

test('generateDcWasmMainScript uses DuckDB-WASM then crossfilter', () => {
  const main = generateDcWasmMainScript({ spec: smokeSpec, base: '/' });
  assert.match(main, /@duckdb\/duckdb-wasm/);
  assert.match(main, /AsyncDuckDB/);
  assert.match(main, /read_csv_auto/);
  assert.match(main, /crossfilter\(/);
  assert.match(main, /import \* as dc from 'dc'/);
  assert.match(main, /import \* as d3 from 'd3'/);
  assert.doesNotMatch(main, /const DATA = \{/);
  assert.doesNotMatch(main, /"region":"East"/);
  assert.match(main, /dc\.renderAll/);
  assert.match(main, /BarChart/);
});

test('generateDcWasmHTML is Vite shell without inlined rows', () => {
  const html = generateDcWasmHTML({ spec: smokeSpec });
  assert.match(html, /type="module" src="\/main\.ts"/);
  assert.match(html, /DuckDB-WASM/);
  assert.doesNotMatch(html, /"region":"East"/);
  assert.match(html, /id="dc-by_region"/);
});
