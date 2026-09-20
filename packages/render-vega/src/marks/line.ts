import type { ChartSpec } from '@dvfc/core';
import { baseSpec } from './theme.js';
import { cartesianEncoding } from './channel.js';

export function lineToVegaLite(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    ...baseSpec(chart, values),
    mark: {
      type: 'line',
      point: { filled: true, size: 52 },
      strokeWidth: 3,
      interpolate: 'monotone',
    },
    encoding: cartesianEncoding(chart),
  };
}
