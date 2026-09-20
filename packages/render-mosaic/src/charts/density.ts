import type { ChartSpec } from '@dvfc/core';
import type { GeneratorContext } from '../generator.js';
import {
  buildFromClause,
  chartFilterVar,
  chartPublishVar,
  wrapChartRender,
} from './helpers.js';
import {
  buildHighlightInteractor,
  buildSelectionInteractors,
} from './interaction.js';
import { TIP_OPTION, plotChromeOptions, primaryColor, stableFilterScaleOptions } from './theme.js';

/**
 * Generate a density chart (kernel density estimation)
 */
export function generateDensityChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const { encoding, dataSource, interaction } = chart;

  if (!dataSource || !encoding || !encoding.x) {
    throw new Error(`Chart ${chart.id}: density charts require dataSource and x encoding`);
  }

  const field = encoding.x.field;
  const fill = primaryColor(ctx);
  const fromClause = buildFromClause(dataSource, chartFilterVar(chart, ctx));

  const publishAs = chartPublishVar(chart, ctx);
  const interactors = buildSelectionInteractors(chart, interaction, publishAs);
  const highlight = buildHighlightInteractor(interaction, publishAs, chart.type);
  if (highlight) interactors.push(highlight);

  const plotOptions: string[] = [
    ...plotChromeOptions(chart),
    ...stableFilterScaleOptions(chart),
    ...interactors,
  ];
  if (encoding.x?.label) plotOptions.push(`vg.xLabel('${encoding.x.label}')`);
  plotOptions.push(`vg.yLabel('Density')`);
  if (chart.width) plotOptions.push(`vg.width(${chart.width})`);
  if (chart.height) plotOptions.push(`vg.height(${chart.height})`);

  const plotOptionsStr =
    plotOptions.length > 0 ? `,\n      ${plotOptions.join(',\n      ')}` : '';

  return wrapChartRender(
    chart.id,
    `      const chart${chart.id} = vg.plot(
        vg.areaY(
          ${fromClause},
          vg.densityX('${field}'),
          { y: 'density', fill: '${fill}', fillOpacity: 0.45, stroke: '${fill}', strokeWidth: 1.5, ${TIP_OPTION} }
        )${plotOptionsStr}
      );
      container${chart.id}.appendChild(chart${chart.id});`
  );
}
