import type { ChartSpec } from '@dvfc/core';
import { vlAggregate } from './channel.js';
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

  const agg = vlAggregate(y.aggregate) ?? 'sum';
  const format = agg === 'mean' ? '.2f' : ',';
  return {
    ...baseSpec(chart, values),
    mark: {
      type: 'text',
      fontSize: 40,
      fontWeight: 700,
      color: ACCENT,
      font: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      align: 'center',
      baseline: 'middle',
    },
    encoding: {
      text: {
        field: y.field,
        aggregate: agg,
        type: 'quantitative',
        format,
      },
    },
    width: chart.width ?? 220,
    height: chart.height ?? 88,
  };
}
