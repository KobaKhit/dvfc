/**
 * Vega-Lite brush/filter wiring (html-static, no DuckDB).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChartSpec, DashboardSpec } from '@dvfc/core';
import {
  planVegaPublishParams,
  applyVegaInteraction,
  filterParamNamesForChart,
  dashToLinkedVegaLite,
} from '../dist/index.js';

test('planVegaPublishParams uses per-chart names when multiple publishers share a selection', () => {
  const charts: ChartSpec[] = [
    {
      id: 'timeline',
      type: 'area',
      dataSource: 'w',
      encoding: {
        x: { field: 'year', type: 'ordinal' },
        y: { field: 'n', type: 'quantitative', aggregate: 'count' },
      },
      interaction: { brush: true, selection: 'era', filterBy: 'era' },
    },
    {
      id: 'scatter',
      type: 'scatter',
      dataSource: 'w',
      encoding: {
        x: { field: 'a', type: 'quantitative' },
        y: { field: 'b', type: 'quantitative' },
      },
      interaction: { selection: 'era', select: 'auto', filterBy: 'era' },
    },
    {
      id: 'kpi',
      type: 'number',
      dataSource: 'w',
      encoding: { y: { field: 'n', aggregate: 'count' } },
      interaction: { filterBy: 'era' },
    },
  ];

  const pubs = planVegaPublishParams(charts);
  assert.equal(pubs.length, 2);
  assert.ok(pubs.some((p) => p.name === 'era__timeline'));
  assert.ok(pubs.some((p) => p.name === 'era__scatter'));

  const kpiFilters = filterParamNamesForChart(charts[2], pubs);
  assert.deepEqual(kpiFilters.sort(), ['era__scatter', 'era__timeline'].sort());

  const timelineFilters = filterParamNamesForChart(charts[0], pubs);
  assert.deepEqual(timelineFilters, ['era__scatter']);
});

test('dashToLinkedVegaLite wires params and filter transforms', () => {
  const spec: DashboardSpec = {
    meta: { title: 'Linked', version: '0.1.0' },
    data: [{ id: 'w', type: 'csv', path: 'w.csv' }],
    layout: { type: 'grid', columns: 2 },
    charts: [
      {
        id: 'timeline',
        type: 'area',
        dataSource: 'w',
        encoding: {
          x: { field: 'year', type: 'ordinal' },
          y: { field: 'n', type: 'quantitative', aggregate: 'count' },
        },
        interaction: { brush: true, publishes: 'era', filterBy: 'era' },
      },
      {
        id: 'kpi',
        type: 'number',
        dataSource: 'w',
        encoding: { y: { field: 'n', aggregate: 'count' } },
        interaction: { filterBy: 'era' },
      },
    ],
  };

  const values = [
    { year: 2010, n: 1 },
    { year: 2011, n: 2 },
  ];
  const vl = dashToLinkedVegaLite(spec, new Map([['w', values]]));
  assert.match(String(vl.$schema), /vega-lite/);
  assert.ok(vl.hconcat || vl.vconcat);

  const flat = JSON.stringify(vl);
  assert.match(flat, /"name":"era"/);
  assert.match(flat, /"filter":\{"param":"era"\}/);
  assert.match(flat, /"type":"interval"/);
});

test('applyVegaInteraction prepends filters before existing transforms', () => {
  const chart: ChartSpec = {
    id: 'kpi',
    type: 'number',
    dataSource: 'w',
    encoding: { y: { field: 'n', aggregate: 'sum' } },
    interaction: { filterBy: 'brush' },
  };
  const pubs = [
    {
      name: 'brush',
      logical: 'brush',
      chartId: 'timeline',
      select: { type: 'interval', encodings: ['x'] },
    },
  ];
  const unit = applyVegaInteraction(
    { transform: [{ density: 'n' }], mark: { type: 'text' } },
    chart,
    pubs
  );
  const transforms = unit.transform as Array<Record<string, unknown>>;
  assert.deepEqual(transforms[0], { filter: { param: 'brush' } });
  assert.ok(transforms[1].density);
});
