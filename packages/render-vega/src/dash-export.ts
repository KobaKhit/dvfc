/**
 * Multi-chart Vega-Lite dash with linked brush/filter (no DuckDB-WASM).
 */

import type { ChartSpec, DashboardSpec } from '@dvfc/core';
import { chartToVegaLiteBuiltin } from './marks/index.js';
import {
  applyVegaInteraction,
  planVegaPublishParams,
  type VlPublishParam,
} from './interaction.js';
import { themeConfig } from './marks/theme.js';

function stripTopLevelChrome(unit: Record<string, unknown>): Record<string, unknown> {
  const { $schema: _s, config: _c, background: _b, ...rest } = unit;
  return rest;
}

/**
 * Build a linked multi-view Vega-Lite spec for a dash.
 * Charts that cannot render as Vega-Lite (e.g. text) are skipped.
 */
export function dashToLinkedVegaLite(
  spec: DashboardSpec,
  valuesBySource: Map<string, Record<string, unknown>[]>
): Record<string, unknown> {
  const charts = spec.charts.filter((c) => c.type !== 'text' && c.type !== 'table');
  if (charts.length === 0) {
    throw new Error('No Vega-Lite-capable charts in dash');
  }

  const publishParams = planVegaPublishParams(charts);
  const units: Record<string, unknown>[] = [];

  for (const chart of charts) {
    const ds = chart.dataSource;
    if (!ds) continue;
    const values = valuesBySource.get(ds);
    if (!values) {
      throw new Error(`Missing values for data source '${ds}' (chart ${chart.id})`);
    }
    let unit: Record<string, unknown>;
    try {
      unit = chartToVegaLiteBuiltin(chart, values);
    } catch (e) {
      console.warn(
        `Skipping chart ${chart.id} for Vega dash: ${e instanceof Error ? e.message : String(e)}`
      );
      continue;
    }
    unit = applyVegaInteraction(stripTopLevelChrome(unit), chart, publishParams);
    units.push(unit);
  }

  if (units.length === 0) {
    throw new Error('No charts could be converted to Vega-Lite');
  }

  if (units.length === 1) {
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      background: 'transparent',
      config: themeConfig,
      title: spec.meta?.title,
      ...units[0],
    };
  }

  const columns = Math.max(1, spec.layout?.columns ?? 2);
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < units.length; i += columns) {
    const slice = units.slice(i, i + columns);
    rows.push(slice.length === 1 ? slice[0] : { hconcat: slice, spacing: 16 });
  }

  const composed = rows.length === 1 ? rows[0] : { vconcat: rows, spacing: 20 };

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    background: 'transparent',
    config: themeConfig,
    title: spec.meta?.title,
    ...composed,
  };
}

/** Expose publish plan for tests. */
export function _planPublishParamsForTests(charts: ChartSpec[]): VlPublishParam[] {
  return planVegaPublishParams(charts);
}
