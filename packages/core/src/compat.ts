/**
 * Internal Mosaic runtime shape helpers.
 * DashboardSpec remains the normalized Mosaic generator input (not a user-facing "board" file).
 */

import type { DashboardSpec, ChartSpec } from './types.js';
import type { ChartIR, DashIR } from './ir.js';
import { isDashChartRef } from './ir.js';

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'dash'
  );
}

/**
 * Flatten dash chart entries that are inline ChartIR (refs left unresolved).
 */
export function listInlineCharts(dash: DashIR): ChartIR[] {
  return dash.charts.filter((c): c is ChartIR => !isDashChartRef(c));
}

/**
 * Convert a DashIR with only inline charts (dataSource + dash.data)
 * to DashboardSpec for the Mosaic generator.
 */
export function dashToDashboardSpec(dash: DashIR): DashboardSpec {
  const refs = dash.charts.filter((c) => isDashChartRef(c));
  if (refs.length > 0) {
    throw new Error(
      `Dash '${dash.id}' has chart refs; resolve them before Mosaic preview/build`
    );
  }

  const inline = listInlineCharts(dash);
  for (const c of inline) {
    if (c.data && !c.dataSource) {
      throw new Error(
        `Chart '${c.id}' uses data connector; normalize connectors before Mosaic path`
      );
    }
    if (c.type === 'text') continue;
    if (!c.dataSource) {
      throw new Error(`Chart '${c.id}' missing dataSource for Mosaic path`);
    }
  }

  return {
    meta: {
      title: dash.title ?? dash.meta?.title ?? dash.id,
      description: dash.description ?? dash.meta?.description,
      version: dash.version ?? (typeof dash.meta?.version === 'string' ? dash.meta.version : '0.1.0'),
    },
    data: dash.data ?? [],
    charts: inline.map((c) => ({
      id: c.id,
      type: c.type as ChartSpec['type'],
      dataSource: c.dataSource,
      title: c.title,
      encoding: c.encoding,
      content: c.content,
      interaction: c.interaction
        ? {
            brush: c.interaction.brush,
            brushAxis: c.interaction.brushAxis,
            selection: c.interaction.publishes ?? c.interaction.selection,
            filterBy: c.interaction.filterBy,
          }
        : undefined,
      overlays: c.overlays,
      width: c.width,
      height: c.height,
    })),
    layout: dash.layout,
    theme: dash.theme,
  };
}

/** @deprecated Use dashToDashboardSpec */
export const dashToBoard = dashToDashboardSpec;

/** Suggest a dash id from a title */
export function suggestDashId(title: string): string {
  return slugify(title);
}
