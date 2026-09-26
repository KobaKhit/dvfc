import type { ChartSpec } from '@dvfc/core';
import type { GeneratorContext } from '../generator.js';
import {
  buildFromClause,
  chartFilterVar,
  chartPublishVar,
  wrapChartRender,
} from './helpers.js';
import { buildSelectionInteractors } from './interaction.js';
import { markTipOption, interactorsIncludeClickToggle, mosaicPlotSizeOptions, plotChromeOptions, primaryColor, stableFilterScaleOptions } from './theme.js';

/**
 * Generate a histogram chart (frequency distribution)
 */
export function generateHistogramChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const { encoding, dataSource, interaction } = chart;

  if (!dataSource || !encoding || !encoding.x) {
    throw new Error(`Chart ${chart.id}: histogram charts require dataSource and x encoding`);
  }

  const field = encoding.x.field;
  const bins = encoding.x.bins || 20;
  const fill = primaryColor(ctx);

  const fromClause = buildFromClause(dataSource, chartFilterVar(chart, ctx));

  const publishAs = chartPublishVar(chart, ctx);
  const interactors = buildSelectionInteractors(chart, interaction, publishAs);

  const tip = markTipOption(interactorsIncludeClickToggle(interactors));
  const tipPart = tip ? `, ${tip}` : '';

  const plotOptions: string[] = [
    ...plotChromeOptions(chart),
    ...stableFilterScaleOptions(chart),
    ...interactors,
  ];
  if (encoding.x?.label) plotOptions.push(`vg.xLabel('${encoding.x.label}')`);
  plotOptions.push(`vg.yLabel('Frequency')`);
  plotOptions.push(...mosaicPlotSizeOptions(chart));

  const plotOptionsStr =
    plotOptions.length > 0 ? `,\n      ${plotOptions.join(',\n      ')}` : '';

  return wrapChartRender(
    chart.id,
    `      const chart${chart.id} = vg.plot(
        vg.rectY(
          ${fromClause},
          vg.bin('${field}', { thresholds: ${bins} }),
          { y: vg.count(), fill: '${fill}', fillOpacity: 0.9${tipPart} }
        )${plotOptionsStr}
      );
      container${chart.id}.appendChild(chart${chart.id});`
  );
}
