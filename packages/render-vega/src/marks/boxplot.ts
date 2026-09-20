import type { ChartSpec } from '@dvfc/core';
import { baseSpec } from './theme.js';
import { channelType } from './channel.js';

export function boxplotToVegaLite(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  const x = chart.encoding?.x;
  const y = chart.encoding?.y;
  const color = chart.encoding?.color;
  if (!x || !y) {
    return {
      ...baseSpec(chart, values),
      mark: { type: 'point' },
      encoding: {},
    };
  }

  return {
    ...baseSpec(chart, values),
    mark: {
      type: 'boxplot',
      extent: 'min-max',
      size: 34,
      median: { color: '#c47a1a', strokeWidth: 2 },
      box: { fill: '#36a18f', opacity: 0.75 },
    },
    encoding: {
      x: { field: x.field, type: channelType(x) ?? 'nominal', title: x.label },
      y: { field: y.field, type: 'quantitative', title: y.label },
      color:
        color && typeof color !== 'string'
          ? { field: color.field, type: channelType(color) ?? 'nominal' }
          : undefined,
    },
  };
}
