/**
 * Internal Mosaic runtime shape helpers.
 * DashboardSpec remains the normalized Mosaic generator input (not a user-facing "board" file).
 */

import type { DashboardSpec, ChartSpec, InteractionConfig } from './types.js';
import type { ChartIR, DashIR, ChartInteraction } from './ir.js';
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
 * Map ChartIR / InteractionSpec publishes onto Mosaic runtime InteractionConfig.selection.
 */
export function interactionToRuntime(
  interaction: ChartInteraction | InteractionConfig | undefined | null
): ChartSpec['interaction'] | undefined {
  if (!interaction) return undefined;
  const publishes =
    'publishes' in interaction
      ? (interaction as ChartInteraction).publishes
      : undefined;
  const selection =
    publishes ??
    ('selection' in interaction ? interaction.selection : undefined);
  return {
    brush: interaction.brush,
    brushAxis: interaction.brushAxis,
    select: 'select' in interaction ? interaction.select : undefined,
    selection,
    filterBy: interaction.filterBy,
  };
}

/**
 * Flatten ChartIR → Mosaic ChartSpec.
 * Pass `dataSource` when normalize has resolved a connector to a relation id.
 */
export function chartIRToChartSpec(
  chart: ChartIR,
  overrides?: { dataSource?: string }
): ChartSpec {
  const dataSource =
    chart.type === 'text'
      ? undefined
      : overrides && 'dataSource' in overrides
        ? overrides.dataSource || undefined
        : chart.dataSource;

  return {
    id: chart.id,
    type: chart.type as ChartSpec['type'],
    dataSource,
    title: chart.title,
    encoding: chart.encoding,
    content: chart.content,
    interaction: interactionToRuntime(chart.interaction),
    overlays: chart.overlays,
    width: chart.width,
    height: chart.height,
  };
}

/**
 * Flatten dash chart entries that are inline ChartIR (refs left unresolved).
 */
export function listInlineCharts(dash: DashIR): ChartIR[] {
  return dash.charts.filter((c): c is ChartIR => !isDashChartRef(c));
}

/**
 * Convert a standalone ChartIR to a minimal DashboardSpec for discovery listing.
 * Does not resolve data connectors (use normalizeFile for that).
 */
export function chartIRToDashboardSpec(chart: ChartIR): DashboardSpec {
  return {
    meta: {
      title: chart.title || chart.id,
      description: chart.description,
      version: '0.1.0',
    },
    data: [],
    charts: [chartIRToChartSpec(chart)],
  };
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
    charts: inline.map((c) => chartIRToChartSpec(c)),
    layout: dash.layout,
    theme: dash.theme,
  };
}

/** Suggest a dash id from a title */
export function suggestDashId(title: string): string {
  return slugify(title);
}
