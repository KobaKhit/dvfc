import type { ChartSpec } from '@dvfc/core';
import { pieToVegaLite } from './pie.js';

export function donutToVegaLite(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  return pieToVegaLite(chart, values, { innerRadius: 72 });
}
