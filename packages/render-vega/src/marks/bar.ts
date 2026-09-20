import type { ChartSpec } from '@dvfc/core';
import { baseSpec } from './theme.js';
import { cartesianEncoding } from './channel.js';

export function barToVegaLite(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    ...baseSpec(chart, values),
    mark: { type: 'bar', cornerRadiusEnd: 5 },
    encoding: cartesianEncoding(chart),
  };
}
