/**
 * Broader validateChartIR / validateDashIR coverage
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  registerBuiltinChartTypes,
  clearChartTypes,
  _resetBuiltinRegistrationForTests,
  validateChartIR,
  validateDashIR,
  loadChartTypeModules,
} from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function reset(): void {
  clearChartTypes();
  _resetBuiltinRegistrationForTests();
  registerBuiltinChartTypes();
}

describe('validateChartIR errors', () => {
  it('rejects non-object', () => {
    reset();
    const r = validateChartIR(null);
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /object/i.test(e.message)));
  });

  it('rejects unknown chart type', () => {
    reset();
    const r = validateChartIR({
      id: 'c',
      type: 'not-a-real-type',
      data: { type: 'sql', sql: 'SELECT 1' },
    });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /Unknown chart type/i.test(e.message)));
  });

  it('requires data or dataSource for non-text', () => {
    reset();
    const r = validateChartIR({ id: 'c', type: 'line' });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => e.path === '/data'));
  });

  it('requires content for text charts', () => {
    reset();
    const r = validateChartIR({ id: 't', type: 'text' });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => e.path === '/content'));
  });

  it('accepts text with content', () => {
    reset();
    const r = validateChartIR({ id: 't', type: 'text', content: 'Hello' });
    assert.equal(r.valid, true);
  });

  it('validates dbt_metric / dbt / sql / data refs', () => {
    reset();
    assert.ok(
      validateChartIR({
        id: 'a',
        type: 'line',
        data: { type: 'dbt_metric' },
      }).errors.some((e) => /metric/i.test(e.message))
    );
    assert.ok(
      validateChartIR({
        id: 'b',
        type: 'line',
        data: { type: 'dbt' },
      }).errors.some((e) => /model/i.test(e.message))
    );
    assert.ok(
      validateChartIR({
        id: 'c',
        type: 'line',
        data: { type: 'sql' },
      }).errors.some((e) => /sql/i.test(e.message))
    );
    assert.ok(
      validateChartIR({
        id: 'd',
        type: 'line',
        data: { type: 'data' },
      }).errors.some((e) => /path or table/i.test(e.message))
    );
  });

  it('detects multi-measure grain mismatches', () => {
    reset();
    const mix = validateChartIR({
      id: 'm',
      type: 'line',
      measures: [
        { id: 'a', field: 'x' },
        { id: 'b', data: { type: 'sql', sql: 'SELECT 1' } },
      ],
    });
    assert.ok(mix.errors.some((e) => /Grain mismatch/i.test(e.message)));

    const kinds = validateChartIR({
      id: 'm2',
      type: 'line',
      dataSource: 's',
      measures: [
        { id: 'a', data: { type: 'sql', sql: 'SELECT 1' } },
        { id: 'b', data: { type: 'dbt', model: 'm' } },
      ],
    });
    assert.ok(kinds.errors.some((e) => /incompatible connector/i.test(e.message)));

    const grain = validateChartIR({
      id: 'm3',
      type: 'line',
      dataSource: 's',
      measures: [
        {
          id: 'a',
          data: { type: 'dbt_metric', metric: 'revenue', group_by: ['day'] },
        },
        {
          id: 'b',
          data: { type: 'dbt_metric', metric: 'orders', group_by: ['week'] },
        },
      ],
    });
    assert.ok(grain.errors.some((e) => /group_by/i.test(e.message)));
  });

  it('runs plugin validate hooks', async () => {
    reset();
    await loadChartTypeModules([join(__dirname, 'fixtures/hello-chart-type.js')]);
    const bad = validateChartIR({
      id: 'h',
      type: 'hello',
      data: { type: 'sql', sql: 'SELECT 1' },
      options: { message: 123 },
    });
    assert.ok(bad.errors.some((e) => /message must be a string/i.test(e.message)));
  });

  it('formats ajv-like errors when ajv is passed', () => {
    reset();
    const fakeAjv = {
      compile() {
        const fn = Object.assign(() => false, {
          errors: [
            {
              instancePath: '',
              keyword: 'required',
              params: { missingProperty: 'id' },
              message: 'required',
            },
            {
              instancePath: '/type',
              keyword: 'enum',
              params: { allowedValues: ['line'] },
              message: 'enum',
            },
            {
              instancePath: '/x',
              keyword: 'type',
              params: { type: 'string' },
              message: 'type',
            },
            {
              instancePath: '/charts/0',
              keyword: 'oneOf',
              message: 'oneOf',
            },
          ],
        });
        return fn;
      },
    };
    const r = validateChartIR(
      { id: 'c', type: 'line', data: { type: 'sql', sql: 'x' } },
      { ajv: fakeAjv }
    );
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /Missing required field: id/.test(e.message)));
    assert.ok(r.errors.some((e) => /Must be one of/.test(e.message)));
    assert.ok(r.errors.some((e) => /Expected type string/.test(e.message)));
    assert.ok(r.errors.some((e) => /exactly one allowed/.test(e.message)));
  });
});

describe('validateDashIR errors', () => {
  it('rejects non-object', () => {
    reset();
    const r = validateDashIR('nope');
    assert.equal(r.valid, false);
  });

  it('flags missing dataSource and unpublished filterBy', () => {
    reset();
    const r = validateDashIR({
      id: 'd',
      data: [{ id: 'sales', type: 'dbt', model: 'm' }],
      charts: [
        {
          id: 'a',
          type: 'line',
          dataSource: 'missing',
          encoding: { x: { field: 'd' }, y: { field: 'v' } },
          interaction: { brush: true, publishes: 'time' },
        },
        {
          id: 'b',
          type: 'bar',
          dataSource: 'sales',
          encoding: { x: { field: 'r' }, y: { field: 'v' } },
          interaction: { filterBy: 'other' },
        },
      ],
    });
    assert.ok(r.errors.some((e) => /not found in dash.data/.test(e.message)));
    assert.ok(r.errors.some((e) => /not published/.test(e.message)));
  });

  it('flags empty chart refs', () => {
    reset();
    const r = validateDashIR({
      id: 'd',
      charts: [{ chart: '' }],
    });
    assert.ok(r.errors.some((e) => /Chart ref requires/.test(e.message)));
  });

  it('accepts refs without requiring published selections', () => {
    reset();
    const r = validateDashIR({
      id: 'd',
      charts: [
        { chart: 'revenue_trend' },
        {
          id: 'b',
          type: 'bar',
          data: { type: 'sql', sql: 'SELECT 1 AS r, 2 AS v' },
          encoding: { x: { field: 'r' }, y: { field: 'v' } },
          interaction: { filterBy: 'time' },
        },
      ],
    });
    assert.equal(r.valid, true);
  });
});
