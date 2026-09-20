import type { ChartSpec } from '@dvfc/core';
import { lineToVegaLite } from './line.js';
import { barToVegaLite } from './bar.js';
import { areaToVegaLite } from './area.js';
import { scatterToVegaLite } from './scatter.js';
import { pieToVegaLite } from './pie.js';
import { donutToVegaLite } from './donut.js';
import { histogramToVegaLite } from './histogram.js';
import { densityToVegaLite } from './density.js';
import { heatmapToVegaLite } from './heatmap.js';
import { boxplotToVegaLite } from './boxplot.js';
import { numberToVegaLite } from './number.js';
import { baseSpec } from './theme.js';
import { cartesianEncoding } from './channel.js';

export { themeConfig, ACCENT, baseSpec } from './theme.js';
export { channelType, cartesianEncoding } from './channel.js';

/**
 * Builtin ChartSpec → Vega-Lite conversion for supported mark types.
 */
export function chartToVegaLiteBuiltin(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  switch (chart.type) {
    case 'line':
      return lineToVegaLite(chart, values);
    case 'bar':
      return barToVegaLite(chart, values);
    case 'area':
      return areaToVegaLite(chart, values);
    case 'scatter':
      return scatterToVegaLite(chart, values);
    case 'pie':
      return pieToVegaLite(chart, values);
    case 'donut':
      return donutToVegaLite(chart, values);
    case 'histogram':
      return histogramToVegaLite(chart, values);
    case 'density':
      return densityToVegaLite(chart, values);
    case 'heatmap':
      return heatmapToVegaLite(chart, values);
    case 'boxplot':
      return boxplotToVegaLite(chart, values);
    case 'number':
      return numberToVegaLite(chart, values);
    default:
      return {
        ...baseSpec(chart, values),
        mark: { type: 'point' },
        encoding: cartesianEncoding(chart),
      };
  }
}
