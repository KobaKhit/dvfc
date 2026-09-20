import type { ChartSpec } from '@dvfc/core';
import { baseSpec } from './theme.js';
import { cartesianEncoding } from './channel.js';

export function scatterToVegaLite(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    ...baseSpec(chart, values),
    mark: { type: 'point', filled: true, size: 90, opacity: 0.78 },
    encoding: cartesianEncoding(chart),
  };
}
