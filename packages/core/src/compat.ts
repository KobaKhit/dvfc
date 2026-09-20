/**
 * Legacy board.yaml → DashIR adapter
 */

import type { DashboardSpec, ChartSpec } from './types.js';
import type { ChartIR, DashIR } from './ir.js';
import { isDashChartRef } from './ir.js';

export interface BoardToDashOptions {
  /** Dash id (default: derived from meta.title slug or "board") */
  id?: string;
  /** Enable auto coordination when any brush selections exist */
  autoCoordination?: boolean;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'dash'
  );
}

function legacyChartToIR(chart: ChartSpec): ChartIR {
  const interaction = chart.interaction
    ? {
        ...chart.interaction,
        publishes: chart.interaction.selection ?? undefined,
      }
    : undefined;

  return {
    id: chart.id,
    type: chart.type,
    title: chart.title,
    dataSource: chart.dataSource,
    encoding: chart.encoding,
    content: chart.content,
    interaction,
    overlays: chart.overlays,
    width: chart.width,
    height: chart.height,
  };
}

/**
 * Convert a v0.5 DashboardSpec (board) into a DashIR with inline charts.
 */
export function boardToDash(board: DashboardSpec, options: BoardToDashOptions = {}): DashIR {
  const id =
    options.id ?? (board.meta?.title ? slugify(String(board.meta.title)) : 'board');

  const hasSelections = board.charts.some((c) => c.interaction?.selection);
  const auto = options.autoCoordination ?? hasSelections;

  return {
    id,
    title: board.meta?.title,
    description: board.meta?.description,
    version: board.meta?.version,
    meta: { ...board.meta },
    data: board.data,
    charts: board.charts.map(legacyChartToIR),
    layout: board.layout,
    theme: board.theme,
    coordination: auto ? { auto: true } : undefined,
  };
}

/**
 * Flatten dash chart entries that are inline ChartIR (refs left unresolved).
 */
export function listInlineCharts(dash: DashIR): ChartIR[] {
  return dash.charts.filter((c): c is ChartIR => !isDashChartRef(c));
}

/**
 * Convert a DashIR with only inline legacy-style charts (dataSource + dash.data)
 * back to DashboardSpec for the current Mosaic generator.
 * Throws if the dash uses chart refs or connector `data` bindings.
 */
export function dashToBoard(dash: DashIR): DashboardSpec {
  const refs = dash.charts.filter((c) => isDashChartRef(c));
  if (refs.length > 0) {
    throw new Error(
      `Dash '${dash.id}' has chart refs; resolve/compose before Mosaic preview/build (Phase 4+)`
    );
  }

  const inline = listInlineCharts(dash);
  for (const c of inline) {
    if (c.data && !c.dataSource) {
      throw new Error(
        `Chart '${c.id}' uses data connector; Mosaic preview still expects dataSource + dash.data (Phase 3+)`
      );
    }
    if (c.type === 'text') continue;
    if (!c.dataSource) {
      throw new Error(`Chart '${c.id}' missing dataSource for legacy Mosaic path`);
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
