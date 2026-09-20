/**
 * IR helpers + compat + schema stubs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDashChartRef,
  isChartIR,
  isDashIR,
  createEmptyChart,
  createEmptyDash,
  listInlineCharts,
  dashToDashboardSpec,
  suggestDashId,
  validateDashboardSpecShape,
  isDashboardSpec,
  createEmptySpec,
  detectKindFromPath,
  detectKindFromObject,
  formatFromPath,
  parseSpecContent,
} from '../dist/index.js';

describe('IR helpers', () => {
  it('isDashChartRef / isChartIR / isDashIR', () => {
    assert.equal(isDashChartRef({ chart: 'x' }), true);
    assert.equal(isDashChartRef({ id: 'a', type: 'line', chart: 'x' }), false);
    assert.equal(isChartIR({ id: 'a', type: 'line' }), true);
    assert.equal(isChartIR({ id: 'a', charts: [] }), false);
    assert.equal(isChartIR(null), false);
    assert.equal(isDashIR({ id: 'd', charts: [] }), true);
    assert.equal(isDashIR({ id: 'd' }), false);
  });

  it('createEmptyChart / createEmptyDash', () => {
    const c = createEmptyChart('c1');
    assert.equal(c.id, 'c1');
    assert.equal(c.type, 'line');
    const d = createEmptyDash('d1');
    assert.equal(d.id, 'd1');
    assert.deepEqual(d.charts, []);
  });
});

describe('compat helpers', () => {
  it('listInlineCharts skips refs', () => {
    const dash = {
      id: 'd',
      charts: [{ chart: 'ref' }, { id: 'inline', type: 'bar', dataSource: 's' }],
    };
    const inline = listInlineCharts(dash);
    assert.equal(inline.length, 1);
    assert.equal(inline[0].id, 'inline');
  });

  it('dashToDashboardSpec maps filterBy and brushAxis', () => {
    const spec = dashToDashboardSpec({
      id: 'd',
      title: 'T',
      data: [{ id: 's', type: 'sql', sql: 'SELECT 1' }],
      charts: [
        {
          id: 'a',
          type: 'line',
          dataSource: 's',
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
          interaction: {
            brush: true,
            brushAxis: 'x',
            publishes: 'sel',
            filterBy: 'other',
          },
        },
      ],
      layout: { type: 'grid', columns: 2 },
      theme: { colors: ['#111'] },
    });
    assert.equal(spec.charts[0].interaction?.selection, 'sel');
    assert.equal(spec.charts[0].interaction?.filterBy, 'other');
    assert.equal(spec.layout?.type, 'grid');
  });

  it('suggestDashId slugifies titles', () => {
    assert.equal(suggestDashId('Hello World!'), 'hello-world');
    assert.ok(suggestDashId('!!!').length > 0);
  });
});

describe('schema + types stubs', () => {
  it('validateDashboardSpecShape', () => {
    assert.equal(validateDashboardSpecShape(null).valid, false);
    assert.equal(
      validateDashboardSpecShape({ meta: {}, data: [], charts: [] }).valid,
      true
    );
    assert.ok((validateDashboardSpecShape({}).errors?.length ?? 0) >= 2);
  });

  it('isDashboardSpec / createEmptySpec', () => {
    const empty = createEmptySpec();
    assert.ok(isDashboardSpec(empty));
    assert.equal(isDashboardSpec({}), false);
  });
});

describe('parse helpers', () => {
  it('detectKindFromPath / formatFromPath', () => {
    assert.equal(detectKindFromPath('a.chart.yaml'), 'chart');
    assert.equal(detectKindFromPath('a.dash.yml'), 'dash');
    assert.equal(detectKindFromPath('a.json'), 'unknown');
    assert.equal(formatFromPath('a.toml'), 'toml');
    assert.equal(formatFromPath('a.json'), 'json');
    assert.equal(formatFromPath('a.yaml'), 'yaml');
  });

  it('detectKindFromObject', () => {
    assert.equal(detectKindFromObject({ id: 'c', type: 'line' }), 'chart');
    assert.equal(detectKindFromObject({ id: 'd', charts: [] }), 'dash');
    assert.equal(detectKindFromObject({}), 'unknown');
  });

  it('parseSpecContent json/yaml', () => {
    assert.deepEqual(parseSpecContent('{"a":1}', 'json'), { a: 1 });
    assert.equal(
      (parseSpecContent('a: 1\n', 'yaml') as { a: number }).a,
      1
    );
  });
});
