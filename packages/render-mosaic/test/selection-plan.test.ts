import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DashboardSpec } from '@dvfc/core';
import { buildSelectionPlan } from '../src/selection-plan.js';
import { generateMainScript } from '../src/generator.js';
import type { GeneratorContext } from '../src/generator.js';

test('multiple publishers on one logical name use crossfilter include composite', () => {
  const spec: DashboardSpec = {
    meta: { title: 'T', version: '0.1.0' },
    data: [{ id: 'w', type: 'csv', path: 'w.csv' }],
    charts: [
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
    ],
  };

  const plan = buildSelectionPlan(spec);
  assert.equal(plan.publishVar(spec.charts[0]), 'era__timeline');
  assert.equal(plan.publishVar(spec.charts[1]), 'era__scatter');
  assert.equal(plan.filterVar(spec.charts[2]), 'era');
  assert.match(plan.declarations, /era__timeline = vg\.Selection\.crossfilter/);
  assert.match(plan.declarations, /era__scatter = vg\.Selection\.crossfilter/);
  assert.match(
    plan.declarations,
    /era = vg\.Selection\.crossfilter\(\{ include: \[era__timeline, era__scatter\] \}\)/
  );
});

test('saveStateToURL is scoped inside createDashboard after selections', () => {
  const ctx: GeneratorContext = {
    spec: {
      meta: { title: 'T', version: '0.1.0' },
      data: [{ id: 's', type: 'csv', path: 's.csv' }],
      charts: [
        {
          id: 't',
          type: 'line',
          dataSource: 's',
          encoding: {
            x: { field: 'd', type: 'temporal' },
            y: { field: 'v', type: 'quantitative' },
          },
          interaction: { brush: true, selection: 'brush', filterBy: 'brush' },
        },
      ],
    },
    dataDir: '/tmp',
    outputDir: '/tmp',
  };
  const code = generateMainScript(ctx);
  assert.doesNotMatch(code, /^function saveStateToURL/m);
  assert.match(code, /function saveStateToURL\(\)[\s\S]*if \(brush\.value\)/);
  const createIdx = code.indexOf('async function createDashboard');
  const saveIdx = code.indexOf('function saveStateToURL');
  const brushDecl = code.indexOf('const brush = vg.Selection.crossfilter()');
  assert.ok(createIdx >= 0 && saveIdx > brushDecl && brushDecl > createIdx);
});
