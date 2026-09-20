import type { ChartSpec } from '@dvfc/core';
import { ACCENT, baseSpec } from './theme.js';

export function histogramToVegaLite(
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
    mark: { type: 'bar', cornerRadiusTopLeft: 3, cornerRadiusTopRight: 3 },
    encoding: {
      x: {
        field: x.field,
        type: 'quantitative',
        bin: { maxbins: 18 },
        title: x.label,
      },
      y: {
        aggregate: 'count',
        type: 'quantitative',
        title: y?.label ?? 'Observations',
      },
      color: { value: ACCENT },
      tooltip: [{ aggregate: 'count', type: 'quantitative', title: 'Observations' }],
    },
  };
}
