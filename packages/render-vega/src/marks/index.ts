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
 *
 * When a palette is supplied (usually `spec.theme.colors`), it overrides the
 * default categorical range so single-chart static exports honor the dash theme.
 */
export function chartToVegaLiteBuiltin(
  chart: ChartSpec,
  values: Record<string, unknown>[],
  palette?: readonly string[]
): Record<string, unknown> {
  let vl: Record<string, unknown>;
  switch (chart.type) {
    case 'line':
      vl = lineToVegaLite(chart, values);
      break;
    case 'bar':
      vl = barToVegaLite(chart, values);
      break;
    case 'area':
      vl = areaToVegaLite(chart, values);
      break;
    case 'scatter':
      vl = scatterToVegaLite(chart, values);
      break;
    case 'pie':
      vl = pieToVegaLite(chart, values);
      break;
    case 'donut':
      vl = donutToVegaLite(chart, values);
      break;
    case 'histogram':
      vl = histogramToVegaLite(chart, values);
      break;
    case 'density':
      vl = densityToVegaLite(chart, values);
      break;
    case 'heatmap':
      vl = heatmapToVegaLite(chart, values);
      break;
    case 'boxplot':
      vl = boxplotToVegaLite(chart, values);
      break;
    case 'number':
      vl = numberToVegaLite(chart, values);
      break;
    default:
      vl = {
        ...baseSpec(chart, values),
        mark: { type: 'point' },
        encoding: cartesianEncoding(chart),
      };
  }
  if (palette?.length) {
    const prev = (vl.config ?? {}) as Record<string, unknown>;
    vl.config = { ...prev, range: { category: [...palette] } };
  }
  return vl;
}
