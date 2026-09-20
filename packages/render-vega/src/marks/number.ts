import type { ChartSpec } from '@dvfc/core';
import { ACCENT, baseSpec } from './theme.js';

export function numberToVegaLite(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  const y = chart.encoding?.y;
  if (!y) {
    return {
      ...baseSpec(chart, values),
      mark: { type: 'point' },
      encoding: {},
    };
  }

  return {
    ...baseSpec(chart, values),
    mark: {
      type: 'text',
      fontSize: 56,
      fontWeight: 700,
      color: ACCENT,
      font: 'Inter, system-ui, sans-serif',
    },
    encoding: {
      text: {
        field: y.field,
        aggregate: y.aggregate ?? 'sum',
        type: 'quantitative',
      },
    },
    width: chart.width ?? 320,
    height: chart.height ?? 120,
  };
}
