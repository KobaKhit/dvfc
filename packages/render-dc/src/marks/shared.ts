/**
 * Shared helpers for dc.js mark code generators.
 */

import type { ChartSpec } from '@dvfc/core';

export function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function wantsBrush(chart: ChartSpec): boolean {
  return Boolean(chart.interaction?.brush);
}

export function dimVar(chartId: string): string {
  return `dim_${chartId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

export function grpVar(chartId: string): string {
  return `grp_${chartId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

export function chartVar(chartId: string): string {
  return `chart_${chartId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

/** Resolve chart pixel size from the host element (falls back to spec width/height). */
export function sizePrelude(el: string, ch: string, w: number, h: number): string {
  return `  const _sz_${ch} = (typeof dvfcSize === 'function')
    ? dvfcSize('${el}', ${w}, ${h})
    : { w: Math.max(240, (document.querySelector('${el}') || {}).clientWidth || ${w}), h: ${h} };
`;
}

/** Year / ordinal numeric fields should not use d3 time scales. */
export function isTemporalField(chart: ChartSpec): boolean {
  const t = chart.encoding?.x?.type;
  if (t === 'temporal') return true;
  if (t === 'ordinal' || t === 'nominal' || t === 'quantitative') return false;
  const f = (chart.encoding?.x?.field || '').toLowerCase();
  return /date|time|timestamp/.test(f) && !/year|yr\b/.test(f);
}

export interface TipHitLayerOpts {
  /** Event name suffix after `pretransition.${ch}_` (e.g. `hits`, `raise`). */
  eventSuffix: string;
  /** SVG group class (e.g. `dvfc-tip-hits`, `dvfc-scatter-hits`). */
  className: string;
  radius: number;
  /** Line charts filter null keys and cache scales; scatter binds all group rows. */
  mode: 'line' | 'scatter';
}

/** Transparent hit-circle layer so native `<title>` tooltips work above brushes. */
export function tipHitLayerCode(ch: string, opts: TipHitLayerOpts): string {
  if (opts.mode === 'scatter') {
    return `  ${ch}.on('pretransition.${ch}_${opts.eventSuffix}', (chart) => {
    const root = chart.select('g');
    let layer = root.select('g.${opts.className}');
    if (layer.empty()) layer = root.append('g').attr('class', '${opts.className}');
    const titleFn = chart.title();
    const nodes = layer.selectAll('circle').data(chart.group().all(), (d) => String(d.key));
    nodes.exit().remove();
    nodes.enter().append('circle')
      .attr('r', ${opts.radius})
      .attr('fill', 'transparent')
      .attr('stroke', 'none')
      .merge(nodes)
      .attr('cx', (d) => chart.x()(chart.keyAccessor()(d)))
      .attr('cy', (d) => chart.y()(chart.valueAccessor()(d)))
      .each(function (d) {
        const sel = d3.select(this);
        sel.select('title').remove();
        sel.append('title').text(titleFn(d));
      });
    layer.raise();
  });`;
  }

  return `  ${ch}.on('pretransition.${ch}_${opts.eventSuffix}', (chart) => {
    const root = chart.select('g');
    let layer = root.select('g.${opts.className}');
    if (layer.empty()) layer = root.append('g').attr('class', '${opts.className}');
    const data = chart.group().all().filter((d) => d.key != null);
    const xScale = chart.x();
    const yScale = chart.y();
    const ka = chart.keyAccessor();
    const va = chart.valueAccessor();
    const titleFn = chart.title();
    const nodes = layer.selectAll('circle').data(data, (d) => String(ka(d)));
    nodes.exit().remove();
    nodes.enter().append('circle')
      .attr('r', ${opts.radius})
      .attr('fill', 'transparent')
      .attr('stroke', 'none')
      .merge(nodes)
      .attr('cx', (d) => xScale(ka(d)))
      .attr('cy', (d) => yScale(va(d)))
      .each(function (d) {
        const sel = d3.select(this);
        sel.select('title').remove();
        sel.append('title').text(titleFn(d));
      });
    layer.raise();
  });`;
}

/** Context derived once in generateDcChartCode and passed to mark modules. */
export interface DcMarkContext {
  chart: ChartSpec;
  ds: string;
  cf: string;
  el: string;
  w: number;
  h: number;
  dim: string;
  grp: string;
  ch: string;
  x: string | undefined;
  y: string | undefined;
  yAgg: string;
  color: string | undefined;
  brush: boolean;
  pub: string | undefined;
  xLabel: string;
  yLabel: string;
  reduce: string;
  valueAccessor: string;
  valueExpr: string;
  titleValue: string;
}
