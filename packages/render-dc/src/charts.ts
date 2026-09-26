/**
 * ChartSpec → dc.js chart setup code (runs in browser after crossfilter is ready).
 */

import type { ChartSpec } from '@dvfc/core';
import { publishedName } from '@dvfc/core';
import {
  chartVar,
  dimVar,
  esc,
  grpVar,
  wantsBrush,
  type DcMarkContext,
} from './marks/shared.js';
import { generateBarMark } from './marks/bar.js';
import { generateLineMark } from './marks/line.js';
import { generatePieMark } from './marks/pie.js';
import { generateScatterMark } from './marks/scatter.js';
import { generateHeatmapMark } from './marks/heatmap.js';
import { generateHistogramMark } from './marks/histogram.js';
import { generateNumberMark } from './marks/number.js';
import { generateTableMark } from './marks/table.js';

type MarkGenerator = (ctx: DcMarkContext) => string;

const MARK_GENERATORS: Record<string, MarkGenerator> = {
  bar: generateBarMark,
  line: generateLineMark,
  area: generateLineMark,
  pie: generatePieMark,
  donut: generatePieMark,
  scatter: generateScatterMark,
  heatmap: generateHeatmapMark,
  histogram: generateHistogramMark,
  number: generateNumberMark,
  table: generateTableMark,
};

/**
 * Generate JS that creates dimension/group + dc chart for one ChartSpec.
 * Assumes `cf_<dataSource>` crossfilter and `dc` / `d3` globals.
 */
export function generateDcChartCode(chart: ChartSpec): string {
  if (chart.type === 'text') {
    return `  // text chart ${chart.id}: rendered as static HTML`;
  }

  const ds = chart.dataSource;
  if (!ds) return `  console.warn('Chart ${chart.id}: missing dataSource');`;

  const cf = `cf_${ds.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const el = `#dc-${chart.id}`;
  const w = chart.width || 420;
  const h = chart.height || 260;
  const dim = dimVar(chart.id);
  const grp = grpVar(chart.id);
  const ch = chartVar(chart.id);
  const x = chart.encoding?.x?.field;
  const y = chart.encoding?.y?.field;
  const yAgg = chart.encoding?.y?.aggregate || 'sum';
  const color = typeof chart.encoding?.color === 'object' ? chart.encoding.color?.field : undefined;
  const brush = wantsBrush(chart);
  const pub = publishedName(chart);
  const xLabel = esc(chart.encoding?.x?.label || x || '');
  const yLabel = esc(chart.encoding?.y?.label || y || 'Value');

  const reduce = (() => {
    if (!y) return `.group().reduceCount()`;
    if (yAgg === 'count') return `.group().reduceCount()`;
    if (yAgg === 'avg') {
      return `.group().reduce(
      (p, v) => { p.count++; p.total += +v['${esc(y)}'] || 0; p.avg = p.count ? p.total / p.count : 0; return p; },
      (p, v) => { p.count--; p.total -= +v['${esc(y)}'] || 0; p.avg = p.count ? p.total / p.count : 0; return p; },
      () => ({ count: 0, total: 0, avg: 0 })
    )`;
    }
    return `.group().reduceSum((d) => +d['${esc(y)}'] || 0)`;
  })();

  const valueAccessor =
    yAgg === 'avg'
      ? `.valueAccessor((d) => d.value.avg)`
      : '';

  const valueExpr = yAgg === 'avg' ? 'd.value.avg' : 'd.value';
  const titleValue = `d3.format(',')(${valueExpr} ?? 0)`;

  const ctx: DcMarkContext = {
    chart,
    ds,
    cf,
    el,
    w,
    h,
    dim,
    grp,
    ch,
    x,
    y,
    yAgg,
    color,
    brush,
    pub,
    xLabel,
    yLabel,
    reduce,
    valueAccessor,
    valueExpr,
    titleValue,
  };

  if (chart.type === 'density' || chart.type === 'boxplot') {
    return `
  document.querySelector('${el}').innerHTML =
    '<p style="padding:1rem;color:#607078;font-size:0.85rem;">Chart type <code>${chart.type}</code> is not mapped in the dc.js renderer yet. Use <code>--format html</code> (Mosaic) for this mark.</p>';`;
  }

  const gen = MARK_GENERATORS[chart.type];
  if (!gen) {
    return `  console.warn('Unsupported dc chart type: ${chart.type}');`;
  }
  return gen(ctx);
}
