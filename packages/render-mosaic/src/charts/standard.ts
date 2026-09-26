import type { ChartSpec } from '@dvfc/core';
import type { GeneratorContext } from '../generator.js';
import {
  buildFromClause,
  chartFilterVar,
  chartPublishVar,
  wrapChartRender,
} from './helpers.js';
import {
  TIP_OPTION,
  markTipOption,
  interactorsIncludeClickToggle,
  mosaicPlotSizeOptions,
  plotChromeOptions,
  primaryColor,
  stableFilterScaleOptions,
} from './theme.js';
import { buildSelectionInteractors } from './interaction.js';

/**
 * Generate overlay marks for analysis (mean, median, trend, moving average)
 */
function generateOverlayMarks(chart: ChartSpec, ctx: GeneratorContext): string[] {
  const filterBy = chartFilterVar(chart, ctx);
  if (!chart.overlays || !chart.encoding) return [];

  const marks: string[] = [];
  const yField = chart.encoding.y?.field;
  const xField = chart.encoding.x?.field;

  if (!yField) return marks;

  for (const overlay of chart.overlays) {
    const field = overlay.field || yField;
    const color = overlay.color || '#c53030';

    switch (overlay.type) {
      case 'mean':
        {
          const meanFromClause = buildFromClause(chart.dataSource || '', filterBy);

          marks.push(`vg.ruleY(
        ${meanFromClause},
        {
          y: vg.avg('${field}'),
          stroke: '${color}',
          strokeWidth: 1.5,
          strokeDasharray: '5 4'
        }
      )`);
        }
        break;

      case 'median':
        {
          const medianFromClause = buildFromClause(chart.dataSource || '', filterBy);

          marks.push(`vg.ruleY(
        ${medianFromClause},
        {
          y: vg.median('${field}'),
          stroke: '${color}',
          strokeWidth: 1.5,
          strokeDasharray: '5 4'
        }
      )`);
        }
        break;

      case 'trend':
        console.warn(`Trend overlay skipped for chart - precompute trend in SQL instead`);
        break;

      case 'moving_average':
        {
          const window = overlay.window || 7;
          const maColumnName = `${field}_ma${window}`;
          const fromClause = buildFromClause(chart.dataSource || '', filterBy);

          marks.push(`vg.lineY(
        ${fromClause},
        {
          x: '${xField}',
          y: '${maColumnName}',
          stroke: '${color}',
          strokeWidth: 2,
          curve: 'monotone-x',
          ${TIP_OPTION}
        }
      )`);
        }
        break;
    }
  }

  return marks;
}

function channelExpr(
  ch: { field: string; aggregate?: string } | undefined
): string | undefined {
  if (!ch) return undefined;
  return ch.aggregate ? `vg.${ch.aggregate}('${ch.field}')` : `'${ch.field}'`;
}

/**
 * Generate code for standard vgplot charts (line, bar, area, scatter, heatmap).
 */
export function generateStandardChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const { encoding, interaction } = chart;

  if (!encoding) {
    throw new Error(`Chart ${chart.id}: encoding is required for ${chart.type} charts`);
  }

  const mark =
    chart.type === 'line'
      ? 'lineY'
      : chart.type === 'bar'
        ? 'barY'
        : chart.type === 'area'
          ? 'areaY'
          : chart.type === 'scatter'
            ? 'dot'
            : chart.type === 'heatmap'
              ? 'cell'
              : 'barY';

  const primary = primaryColor(ctx);
  const xEncoding = channelExpr(encoding.x);
  const yEncoding = channelExpr(encoding.y);

  const colorObj =
    typeof encoding.color === 'object' && encoding.color ? encoding.color : undefined;
  const colorConstant = typeof encoding.color === 'string' ? encoding.color : undefined;
  const colorFieldExpr = colorObj?.field
    ? colorObj.aggregate
      ? `vg.${colorObj.aggregate}('${colorObj.field}')`
      : `'${colorObj.field}'`
    : undefined;

  const markOptions: string[] = [];
  if (xEncoding) markOptions.push(`x: ${xEncoding}`);
  if (yEncoding) markOptions.push(`y: ${yEncoding}`);

  if (chart.type === 'line') {
    markOptions.push(`stroke: ${colorFieldExpr || `'${colorConstant || primary}'`}`);
    markOptions.push('strokeWidth: 2.25');
    markOptions.push(`curve: 'monotone-x'`);
  } else if (chart.type === 'area') {
    const fill = colorFieldExpr || `'${colorConstant || primary}'`;
    markOptions.push(`fill: ${fill}`);
    markOptions.push('fillOpacity: 0.28');
    markOptions.push(`stroke: ${fill}`);
    markOptions.push('strokeWidth: 1.75');
    markOptions.push(`curve: 'monotone-x'`);
  } else if (chart.type === 'scatter') {
    markOptions.push(`fill: ${colorFieldExpr || `'${colorConstant || primary}'`}`);
    markOptions.push('r: 4.5');
    markOptions.push(`stroke: '#ffffff'`);
    markOptions.push('strokeWidth: 1');
    markOptions.push('fillOpacity: 0.88');
  } else if (chart.type === 'heatmap') {
    if (colorFieldExpr) markOptions.push(`fill: ${colorFieldExpr}`);
    markOptions.push('fillOpacity: 1');
  } else {
    markOptions.push(`fill: ${colorFieldExpr || `'${colorConstant || primary}'`}`);
    markOptions.push('fillOpacity: 0.92');
  }

  const dataSource = chart.dataSource || '';
  const filterBy = chartFilterVar(chart, ctx);
  const publishAs = chartPublishVar(chart, ctx);
  const fromClause = buildFromClause(dataSource, filterBy);

  const interactors = buildSelectionInteractors(chart, interaction, publishAs);

  // Sticky Plot tips steal the first pointerdown from Mosaic toggles
  const tip = markTipOption(interactorsIncludeClickToggle(interactors));
  if (tip) markOptions.push(tip);

  const marks: string[] = [
    `vg.${mark}(
        ${fromClause},
        {
          ${markOptions.join(',\n          ')}
        }
      )`,
  ];

  if (chart.type === 'line' && xEncoding && yEncoding) {
    const dotTip = tip ? `\n          ${tip},` : '';
    marks.push(`vg.dot(
        ${fromClause},
        {
          x: ${xEncoding},
          y: ${yEncoding},
          fill: ${colorFieldExpr || `'${colorConstant || primary}'`},
          r: 3.5,
          stroke: '#ffffff',
          strokeWidth: 1,${dotTip}
        }
      )`);
  }

  if (chart.overlays?.length) {
    marks.push(...generateOverlayMarks(chart, ctx));
  }

  const plotOptions: string[] = [
    ...plotChromeOptions(chart, { heatmap: chart.type === 'heatmap' }),
    ...stableFilterScaleOptions(chart),
  ];
  plotOptions.push(...interactors);
  if (encoding.x?.label) plotOptions.push(`vg.xLabel('${encoding.x.label}')`);
  // Heatmaps: y tick labels need the left margin; skip yLabel to avoid overlap
  if (encoding.y?.label && chart.type !== 'heatmap') {
    plotOptions.push(`vg.yLabel('${encoding.y.label}')`);
  }
  if (chart.type === 'heatmap' && colorObj?.label) {
    plotOptions.push(`vg.colorLabel('${colorObj.label}')`);
  }
  plotOptions.push(...mosaicPlotSizeOptions(chart));

  const plotOptionsStr =
    plotOptions.length > 0 ? ',\n      ' + plotOptions.join(',\n      ') : '';

  return wrapChartRender(
    chart.id,
    `      const chart${chart.id} = vg.plot(
        ${marks.join(',\n        ')}${plotOptionsStr}
      );
      container${chart.id}.appendChild(chart${chart.id});`
  );
}
