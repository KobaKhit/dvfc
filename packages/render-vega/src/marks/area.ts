import type { ChartSpec } from '@dvfc/core';
import { ACCENT, baseSpec } from './theme.js';
import { cartesianEncoding } from './channel.js';

export function areaToVegaLite(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    ...baseSpec(chart, values),
    mark: {
      type: 'area',
      line: { color: ACCENT, strokeWidth: 2.5 },
      color: {
        x1: 1,
        y1: 1,
        x2: 1,
        y2: 0,
        gradient: 'linear',
        stops: [
          { offset: 0, color: '#0b7f6e22' },
          { offset: 1, color: '#0b7f6eaa' },
        ],
      },
    },
    encoding: cartesianEncoding(chart),
  };
}
