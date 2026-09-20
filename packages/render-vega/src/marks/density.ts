import type { ChartSpec } from '@dvfc/core';
import { ACCENT, baseSpec } from './theme.js';

export function densityToVegaLite(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  const x = chart.encoding?.x;
  const y = chart.encoding?.y;
  if (!x) {
    return {
      ...baseSpec(chart, values),
      mark: { type: 'point' },
      encoding: {},
    };
  }

  return {
    ...baseSpec(chart, values),
    transform: [{ density: x.field, as: [x.field, 'density'] }],
    mark: {
      type: 'area',
      interpolate: 'monotone',
      line: { color: ACCENT, strokeWidth: 2.5 },
      color: {
        x1: 1,
        y1: 1,
        x2: 1,
        y2: 0,
        gradient: 'linear',
        stops: [
          { offset: 0, color: '#0b7f6e22' },
          { offset: 1, color: '#0b7f6ecc' },
        ],
      },
    },
    encoding: {
      x: { field: x.field, type: 'quantitative', title: x.label },
      y: { field: 'density', type: 'quantitative', title: y?.label ?? 'Density' },
      tooltip: [
        { field: x.field, type: 'quantitative', format: ',.2f' },
        { field: 'density', type: 'quantitative', format: '.4f' },
      ],
    },
  };
}
