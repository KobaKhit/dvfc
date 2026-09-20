/**
 * Map ChartSpec interaction → Vega-Lite params / filter transforms (no DuckDB).
 */

import type { ChartSpec, InteractionConfig } from '@dvfc/core';

export interface VlPublishParam {
  /** Param name used in VL (logical or logical__chartId). */
  name: string;
  /** Logical selection name from the dash (publishes / selection). */
  logical: string;
  chartId: string;
  select: Record<string, unknown>;
}

function publishedName(chart: ChartSpec): string | undefined {
  const i = chart.interaction;
  if (!i) return undefined;
  return i.selection ?? i.publishes;
}

function xIsCategorical(chart: ChartSpec): boolean {
  const t = chart.encoding?.x?.type;
  return t === 'nominal' || t === 'ordinal';
}

function yIsCategorical(chart: ChartSpec): boolean {
  const t = chart.encoding?.y?.type;
  return t === 'nominal' || t === 'ordinal';
}

/** Whether this chart should publish a VL selection param. */
export function chartPublishesSelection(chart: ChartSpec): boolean {
  return buildPublishSelect(chart) != null;
}

/**
 * Build Vega-Lite `select` config for a publishing chart, or undefined if none.
 */
export function buildPublishSelect(chart: ChartSpec): Record<string, unknown> | undefined {
  const interaction = chart.interaction;
  if (!interaction || !publishedName(chart)) return undefined;

  const type = chart.type;
  const select = interaction.select as
    | boolean
    | 'auto'
    | 'x'
    | 'y'
    | 'xy'
    | undefined;

  if (interaction.brush) {
    if (
      interaction.brushAxis === 'xy' ||
      (type === 'scatter' && interaction.brushAxis !== 'x' && interaction.brushAxis !== 'y')
    ) {
      return { type: 'interval', encodings: ['x', 'y'] };
    }
    if (interaction.brushAxis === 'y') {
      return { type: 'interval', encodings: ['y'] };
    }
    if (type === 'bar' && xIsCategorical(chart)) {
      return { type: 'point', encodings: ['x'] };
    }
    return { type: 'interval', encodings: ['x'] };
  }

  const autoClick =
    type === 'bar' ||
    type === 'heatmap' ||
    type === 'scatter' ||
    type === 'histogram' ||
    type === 'pie' ||
    type === 'donut';
  const wantsSelect =
    select === true ||
    select === 'auto' ||
    select === 'x' ||
    select === 'y' ||
    select === 'xy' ||
    (select !== false && !interaction.brush && autoClick);

  if (!wantsSelect) return undefined;

  if (type === 'pie' || type === 'donut') {
    return { type: 'point', encodings: ['color'] };
  }
  if (type === 'heatmap' || select === 'xy') {
    return { type: 'point', encodings: ['x', 'y'] };
  }
  if (type === 'scatter') {
    return { type: 'interval', encodings: ['x', 'y'] };
  }
  if (select === 'y' || (type === 'bar' && yIsCategorical(chart) && !xIsCategorical(chart))) {
    return { type: 'point', encodings: ['y'] };
  }
  return { type: 'point', encodings: ['x'] };
}

/**
 * Plan VL publish params for a dash: one param per publisher.
 * Multiple publishers sharing a logical name get `logical__chartId`.
 */
export function planVegaPublishParams(charts: ChartSpec[]): VlPublishParam[] {
  const byLogical = new Map<string, ChartSpec[]>();
  for (const chart of charts) {
    const logical = publishedName(chart);
    if (!logical || !chartPublishesSelection(chart)) continue;
    const list = byLogical.get(logical) ?? [];
    list.push(chart);
    byLogical.set(logical, list);
  }

  const out: VlPublishParam[] = [];
  for (const [logical, pubs] of byLogical) {
    for (const chart of pubs) {
      const select = buildPublishSelect(chart);
      if (!select) continue;
      const name = pubs.length === 1 ? logical : `${logical}__${chart.id}`;
      out.push({ name, logical, chartId: chart.id, select });
    }
  }
  return out;
}

/**
 * Filter transform param names for a chart with filterBy (excludes its own publish param).
 */
export function filterParamNamesForChart(
  chart: ChartSpec,
  publishParams: VlPublishParam[]
): string[] {
  const logical = chart.interaction?.filterBy;
  if (!logical) return [];
  return publishParams
    .filter((p) => p.logical === logical && p.chartId !== chart.id)
    .map((p) => p.name);
}

/** Apply params + filter transforms onto a unit VL view. */
export function applyVegaInteraction(
  unit: Record<string, unknown>,
  chart: ChartSpec,
  publishParams: VlPublishParam[]
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...unit, name: chart.id };

  const mine = publishParams.find((p) => p.chartId === chart.id);
  if (mine) {
    const existing = Array.isArray(next.params) ? [...(next.params as unknown[])] : [];
    existing.push({ name: mine.name, select: mine.select });
    next.params = existing;
  }

  const filterNames = filterParamNamesForChart(chart, publishParams);
  if (filterNames.length > 0) {
    const existing = Array.isArray(next.transform)
      ? [...(next.transform as unknown[])]
      : [];
    const filters = filterNames.map((name) => ({ filter: { param: name } }));
    // Filters first so density/window transforms see the brushed subset
    next.transform = [...filters, ...existing];
  }

  return next;
}

/** @internal test helper */
export function _publishedNameForTests(chart: ChartSpec): string | undefined {
  return publishedName(chart);
}

export type { InteractionConfig };
