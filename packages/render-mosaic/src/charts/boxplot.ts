import type { ChartSpec } from '@dvfc/core';
import type { GeneratorContext } from '../generator.js';
import { buildFromClause, chartFilterVar, wrapChartRender } from './helpers.js';
import { mosaicPlotSizeOptions, plotChromeOptions, primaryColor, stableFilterScaleOptions } from './theme.js';

/**
 * Generate a boxplot chart (statistical distribution)
 */
export function generateBoxplotChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const { encoding, dataSource } = chart;

  if (!dataSource || !encoding || !encoding.y) {
    throw new Error(`Chart ${chart.id}: boxplot charts require dataSource and y encoding`);
  }

  const valueField = encoding.y.field;
  const categoryField = encoding.x?.field;
  const fill = primaryColor(ctx);

  const fromClause = buildFromClause(dataSource, chartFilterVar(chart, ctx));

  const plotOptions: string[] = [
    ...plotChromeOptions(chart),
    ...stableFilterScaleOptions(chart),
  ];
  if (encoding.x?.label) plotOptions.push(`vg.xLabel('${encoding.x.label}')`);
  if (encoding.y?.label) plotOptions.push(`vg.yLabel('${encoding.y.label}')`);
  plotOptions.push(...mosaicPlotSizeOptions(chart));

  const plotOptionsStr =
    plotOptions.length > 0 ? `,\n      ${plotOptions.join(',\n      ')}` : '';

  const boxOptions = categoryField
    ? `{ x: '${categoryField}', y: '${valueField}', fill: '${fill}' }`
    : `{ y: '${valueField}', fill: '${fill}' }`;

  return wrapChartRender(
    chart.id,
    `      const chart${chart.id} = vg.plot(
        vg.boxY(
          ${fromClause},
          ${boxOptions}
        )${plotOptionsStr}
      );
      container${chart.id}.appendChild(chart${chart.id});`
  );
}
