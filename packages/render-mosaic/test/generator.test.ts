/**
 * Smoke: Mosaic generateMainScript produces loadData + chart code.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMainScript, generateHTML } from '../dist/index.js';
import type { GeneratorContext } from '../dist/index.js';

const ctx: GeneratorContext = {
  spec: {
    meta: { title: 'Smoke', version: '0.1.0' },
    data: [{ id: 'sales', type: 'csv', path: 'sales.csv' }],
    charts: [
      {
        id: 'trend',
        type: 'line',
        dataSource: 'sales',
        title: 'Trend',
        encoding: {
          x: { field: 'date', type: 'temporal' },
          y: { field: 'amount', type: 'quantitative', aggregate: 'sum' },
        },
        interaction: { brush: true, selection: 'timeBrush' },
        width: 400,
        height: 200,
      },
      {
        id: 'by_cat',
        type: 'bar',
        dataSource: 'sales',
        encoding: {
          x: { field: 'category', type: 'nominal' },
          y: { field: 'amount', type: 'quantitative', aggregate: 'sum' },
        },
        interaction: { filterBy: 'timeBrush' },
        width: 400,
        height: 200,
      },
    ],
  },
  dataDir: '/tmp',
  outputDir: '/tmp',
  base: '/',
};

test('generateMainScript includes DuckDB load and chart ids', () => {
  const code = generateMainScript(ctx);
  assert.match(code, /@uwdata\/vgplot/);
  assert.match(code, /read_csv_auto/);
  assert.match(code, /sales/);
  assert.match(code, /trend/);
  assert.match(code, /timeBrush/);
  assert.match(code, /tip:\s*true/);
  assert.match(code, /#1e3a5f|stroke:/);
  assert.match(code, /Selection\.crossfilter/);
  assert.match(code, /intervalX/);
});

test('bar and heatmap publishers emit toggle interactors', () => {
  const rich: GeneratorContext = {
    ...ctx,
    spec: {
      ...ctx.spec,
      charts: [
        {
          id: 'by_region',
          type: 'bar',
          dataSource: 'sales',
          encoding: {
            x: { field: 'region', type: 'nominal' },
            y: { field: 'amount', type: 'quantitative', aggregate: 'sum' },
          },
          interaction: { selection: 'salesBrush', select: 'auto', filterBy: 'salesBrush' },
        },
        {
          id: 'heat',
          type: 'heatmap',
          dataSource: 'sales',
          encoding: {
            x: { field: 'region', type: 'nominal' },
            y: { field: 'product', type: 'nominal' },
            color: { field: 'amount', type: 'quantitative', aggregate: 'sum' },
          },
          interaction: { selection: 'salesBrush', select: 'auto', filterBy: 'salesBrush' },
        },
        {
          id: 'scatter',
          type: 'scatter',
          dataSource: 'sales',
          encoding: {
            x: { field: 'units', type: 'quantitative' },
            y: { field: 'amount', type: 'quantitative' },
          },
          interaction: { selection: 'salesBrush', select: 'auto', filterBy: 'salesBrush' },
        },
      ],
    },
  };
  const code = generateMainScript(rich);
  assert.match(code, /toggleX/);
  assert.match(code, /toggle\(\s*\{\s*as:\s*salesBrush__heat,\s*channels:\s*\['x',\s*'y'\]/);
  assert.match(code, /intervalXY\(\s*\{\s*as:\s*salesBrush__scatter/);
  assert.match(code, /Selection\.crossfilter\(\{\s*include:/);
});

test('bar and heatmap publishers omit sticky tip so toggle gets the first click', () => {
  const rich: GeneratorContext = {
    ...ctx,
    spec: {
      ...ctx.spec,
      charts: [
        {
          id: 'by_region',
          type: 'bar',
          dataSource: 'sales',
          encoding: {
            x: { field: 'region', type: 'nominal' },
            y: { field: 'amount', type: 'quantitative', aggregate: 'sum' },
          },
          interaction: { selection: 'salesBrush', select: 'auto', filterBy: 'salesBrush' },
        },
        {
          id: 'heat',
          type: 'heatmap',
          dataSource: 'sales',
          encoding: {
            x: { field: 'region', type: 'nominal' },
            y: { field: 'product', type: 'nominal' },
            color: { field: 'amount', type: 'quantitative', aggregate: 'sum' },
          },
          interaction: { selection: 'salesBrush', select: 'auto', filterBy: 'salesBrush' },
        },
      ],
    },
  };
  const code = generateMainScript(rich);
  assert.match(code, /toggleX/);
  assert.doesNotMatch(code, /tip:\s*true/);
});

test('pie charts publish clausePoint clicks when publishes is set', () => {
  const pieCtx: GeneratorContext = {
    ...ctx,
    spec: {
      ...ctx.spec,
      charts: [
        {
          id: 'mix',
          type: 'donut',
          dataSource: 'sales',
          encoding: {
            x: { field: 'category', type: 'nominal' },
            y: { field: 'amount', type: 'quantitative', aggregate: 'sum' },
          },
          interaction: { selection: 'salesBrush', select: 'auto', filterBy: 'salesBrush' },
        },
        {
          id: 'kpi',
          type: 'number',
          dataSource: 'sales',
          encoding: { y: { field: 'amount', aggregate: 'sum' } },
          interaction: { filterBy: 'salesBrush' },
        },
      ],
    },
  };
  const code = generateMainScript(pieCtx);
  assert.match(code, /clausePoint/);
  assert.match(code, /from '@uwdata\/mosaic-core'/);
  assert.match(code, /selectSlice/);
  assert.match(code, /const salesBrush = vg\.Selection\.crossfilter/);
});

test('pie and number charts reactively apply selection predicates', () => {
  const kpiCtx: GeneratorContext = {
    ...ctx,
    spec: {
      ...ctx.spec,
      charts: [
        {
          id: 'trend',
          type: 'line',
          dataSource: 'sales',
          encoding: {
            x: { field: 'date', type: 'temporal' },
            y: { field: 'amount', type: 'quantitative', aggregate: 'sum' },
          },
          interaction: { brush: true, selection: 'timeBrush', filterBy: 'timeBrush' },
        },
        {
          id: 'kpi',
          type: 'number',
          dataSource: 'sales',
          encoding: { y: { field: 'amount', aggregate: 'sum' } },
          interaction: { filterBy: 'timeBrush' },
        },
        {
          id: 'mix',
          type: 'pie',
          dataSource: 'sales',
          encoding: {
            x: { field: 'category', type: 'nominal' },
            y: { field: 'amount', type: 'quantitative', aggregate: 'sum' },
          },
          interaction: { filterBy: 'timeBrush' },
        },
      ],
    },
  };
  const code = generateMainScript(kpiCtx);
  assert.match(code, /timeBrush\.predicate\(\)/);
  assert.match(code, /timeBrush\.addEventListener\('value'/);
  assert.match(code, /render_kpi/);
  assert.match(code, /render_mix/);
  assert.doesNotMatch(code, /timeBrush\.sql/);
});

test('generateMainScript uses read_parquet for parquet sources', () => {
  const parquetCtx: GeneratorContext = {
    ...ctx,
    spec: {
      ...ctx.spec,
      data: [{ id: 'events', type: 'parquet', path: 'events.parquet' }],
      charts: [
        {
          id: 'hist',
          type: 'histogram',
          dataSource: 'events',
          encoding: { x: { field: 'value', type: 'quantitative' } },
        },
      ],
    },
  };
  const code = generateMainScript(parquetCtx);
  assert.match(code, /read_parquet/);
  assert.match(code, /events\.parquet/);
  assert.doesNotMatch(code, /read_csv_auto\('\$\{window\.location\.origin\}\$\{dataPath\}events/);
});

test('generateMainScript uses remote URL for url sources', () => {
  const urlCtx: GeneratorContext = {
    ...ctx,
    spec: {
      ...ctx.spec,
      data: [{ id: 'remote', type: 'url', path: 'https://example.com/data.csv' }],
      charts: [
        {
          id: 'bars',
          type: 'bar',
          dataSource: 'remote',
          encoding: {
            x: { field: 'x', type: 'nominal' },
            y: { field: 'y', type: 'quantitative' },
          },
        },
      ],
    },
  };
  const code = generateMainScript(urlCtx);
  assert.match(code, /https:\/\/example\.com\/data\.csv/);
  assert.match(code, /read_csv_auto/);
});

test('plots use Fixed domains for stable crossfilter scales', () => {
  const code = generateMainScript(ctx);
  assert.match(code, /xDomain\(vg\.Fixed\)/);
  assert.match(code, /yDomain\(vg\.Fixed\)/);
});

test('generateHTML includes title and chart containers', () => {
  const html = generateHTML(ctx);
  assert.match(html, /Smoke/);
  assert.match(html, /chart-trend/);
  assert.match(html, /chart-container/);
});
