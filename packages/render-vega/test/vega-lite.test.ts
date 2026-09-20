/**
 * chartToVegaLite mark/encoding coverage
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChartSpec } from '@dvfc/core';
import {
  chartToVegaLite,
  chartToVegaLiteBuiltin,
  attachBuiltinVegaRenderers,
} from '../dist/index.js';

const values: Record<string, unknown>[] = [
  { x: 'a', y: 1, cat: 'A' },
  { x: 'b', y: 2, cat: 'B' },
];

test('chartToVegaLiteBuiltin covers mark types and color', () => {
  attachBuiltinVegaRenderers();
  for (const type of ['line', 'bar', 'area', 'scatter'] as const) {
    const vl = chartToVegaLiteBuiltin(
      {
        id: type,
        type,
        title: type,
        dataSource: 'd',
        encoding: {
          x: { field: 'x', type: 'nominal' },
          y: { field: 'y', type: 'quantitative', aggregate: 'sum' },
          color: { field: 'cat', type: 'nominal' },
        },
      } as ChartSpec,
      values
    );
    assert.equal(String(vl.$schema).includes('vega-lite'), true);
    const enc = vl.encoding as Record<string, unknown>;
    assert.ok(enc.x);
    assert.ok(enc.y);
    assert.ok(enc.color);
  }

  const num = chartToVegaLiteBuiltin(
    {
      id: 'kpi',
      type: 'number',
      dataSource: 'd',
      encoding: { y: { field: 'y', aggregate: 'sum' } },
    } as ChartSpec,
    values
  );
  assert.equal((num.mark as { type: string }).type, 'text');

  const colored = chartToVegaLiteBuiltin(
    {
      id: 'c',
      type: 'bar',
      dataSource: 'd',
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
        color: 'steelblue',
      },
    } as ChartSpec,
    values
  );
  assert.deepEqual((colored.encoding as { color: unknown }).color, { value: 'steelblue' });
});

test('chartToVegaLiteBuiltin produces native statistical and radial specs', () => {
  const xy = {
    x: { field: 'x', type: 'nominal' as const, label: 'Group' },
    y: { field: 'y', type: 'quantitative' as const, label: 'Value' },
  };

  for (const type of ['pie', 'donut'] as const) {
    const spec = chartToVegaLiteBuiltin(
      { id: type, type, dataSource: 'd', encoding: xy } as ChartSpec,
      values
    );
    assert.equal((spec.mark as { type: string }).type, 'arc');
    assert.ok((spec.encoding as Record<string, unknown>).theta);
  }

  const histogram = chartToVegaLiteBuiltin(
    {
      id: 'histogram',
      type: 'histogram',
      dataSource: 'd',
      encoding: { x: { field: 'y', type: 'quantitative' } },
    } as ChartSpec,
    values
  );
  assert.ok(
    ((histogram.encoding as { x: { bin: unknown } }).x.bin)
  );

  const density = chartToVegaLiteBuiltin(
    {
      id: 'density',
      type: 'density',
      dataSource: 'd',
      encoding: { x: { field: 'y', type: 'quantitative' } },
    } as ChartSpec,
    values
  );
  assert.ok(Array.isArray(density.transform));

  const heatmap = chartToVegaLiteBuiltin(
    {
      id: 'heatmap',
      type: 'heatmap',
      dataSource: 'd',
      encoding: { ...xy, color: { field: 'y', type: 'quantitative' } },
    } as ChartSpec,
    values
  );
  assert.equal((heatmap.mark as { type: string }).type, 'rect');

  const boxplot = chartToVegaLiteBuiltin(
    { id: 'boxplot', type: 'boxplot', dataSource: 'd', encoding: xy } as ChartSpec,
    values
  );
  assert.equal((boxplot.mark as { type: string }).type, 'boxplot');
});

test('chartToVegaLite routes through registry and rejects text', () => {
  attachBuiltinVegaRenderers();
  const vl = chartToVegaLite(
    {
      id: 'l',
      type: 'line',
      dataSource: 'd',
      encoding: {
        x: { field: 'x', type: 'temporal' },
        y: { field: 'y', type: 'quantitative' },
      },
    } as ChartSpec,
    values
  );
  assert.ok(vl.mark);
  assert.throws(
    () =>
      chartToVegaLite(
        { id: 't', type: 'text', content: 'hi', dataSource: 'd' } as ChartSpec,
        []
      ),
    /does not support Vega-Lite/
  );
});
