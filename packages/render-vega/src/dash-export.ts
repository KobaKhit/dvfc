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

const NAVY = '#1e3a5f';
const FALLBACK_PALETTE = ['#1e3a5f', '#7ba3c9', '#a89b8c', '#4a7c9b', '#c4b5a0'];

function textUnit(chart: ChartSpec): Record<string, unknown> {
  const plain = (chart.content || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .trim();
  const lines = plain.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const rows = (lines.length ? lines : ['']).map((line, i) => ({ i, line }));
  return {
    data: { values: rows },
    mark: {
      type: 'text',
      align: 'left',
      baseline: 'middle',
      fontSize: 13,
      font: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      color: '#102129',
    },
    encoding: {
      x: { value: 0 },
      y: { field: 'i', type: 'ordinal', axis: null, scale: { padding: 0.2 } },
      text: { field: 'line', type: 'nominal' },
    },
    width: 220,
    height: Math.max(72, rows.length * 22),
    padding: { left: 0, top: 4, right: 12, bottom: 0 },
    background: 'transparent',
    config: { view: { stroke: null } },
  };
}

/** Keep the category key inside the donut cell instead of a floating Vega legend. */
function pinArcLegend(
  unit: Record<string, unknown>,
  palette: string[]
): Record<string, unknown> {
  const mark = unit.mark as { type?: string } | undefined;
  const encoding = unit.encoding as Record<string, { field?: string; legend?: unknown }> | undefined;
  const rows = (unit.data as { values?: Record<string, unknown>[] } | undefined)?.values;
  const field = encoding?.color?.field;
  if (mark?.type !== 'arc' || !encoding?.color || !field || !rows) return unit;

  const labels: string[] = [];
  for (const row of rows) {
    const label = String(row[field] ?? '');
    if (label && !labels.includes(label)) labels.push(label);
  }
  if (labels.length === 0) return unit;

  encoding.color = { ...encoding.color, legend: null };
  const width = typeof unit.width === 'number' ? unit.width : 280;
  const gap = 10;
  const each = Math.max(64, Math.floor((width - gap * (labels.length - 1)) / labels.length));
  const legend = {
    hconcat: labels.map((label, i) => ({
      data: { values: [{ t: label }] },
      width: each,
      height: 16,
      padding: 0,
      background: 'transparent',
      mark: {
        type: 'text',
        align: 'left',
        baseline: 'middle',
        fontSize: 11,
        font: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        color: palette[i % palette.length],
      },
      encoding: {
        x: { value: 0 },
        text: { field: 't', type: 'nominal' },
      },
    })),
    spacing: gap,
  };
  return { vconcat: [unit, legend], spacing: 4 };
}

function sizeCell(unit: Record<string, unknown>, width: number): Record<string, unknown> {
  const rows = unit.vconcat as Record<string, unknown>[] | undefined;
  if (!rows) return { ...unit, width };
  const [plot, legend] = rows;
  const nextPlot = plot ? { ...plot, width } : plot;
  const legendSpec = legend as { hconcat?: Record<string, unknown>[]; spacing?: number } | undefined;
  if (!legendSpec?.hconcat) return { ...unit, vconcat: rows, width };
  const spacing = legendSpec.spacing ?? 0;
  const each = Math.max(
    48,
    Math.floor((width - spacing * (legendSpec.hconcat.length - 1)) / legendSpec.hconcat.length)
  );
  return {
    ...unit,
    vconcat: [
      nextPlot,
      { ...legendSpec, hconcat: legendSpec.hconcat.map((item) => ({ ...item, width: each })) },
    ],
  };
}

function paintArea(unit: Record<string, unknown>, color: string): void {
  const mark = unit.mark;
  if (!mark || typeof mark !== 'object') return;
  const next = { ...(mark as Record<string, unknown>) };
  next.line = { color, strokeWidth: 2.5 };
  next.color = {
    x1: 1,
    y1: 1,
    x2: 1,
    y2: 0,
    gradient: 'linear',
    stops: [
      { offset: 0, color: `${color}22` },
      { offset: 1, color: `${color}aa` },
    ],
  };
  unit.mark = next;
}

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
  const charts = spec.charts.filter((c) => c.type !== 'table');
  if (charts.length === 0) {
    throw new Error('No Vega-Lite-capable charts in dash');
  }

  const palette = spec.theme?.colors?.length ? spec.theme.colors : FALLBACK_PALETTE;
  const publishParams = planVegaPublishParams(charts.filter((c) => c.type !== 'text'));
  const units: Record<string, unknown>[] = [];

  for (const chart of charts) {
    if (chart.type === 'text') {
      units.push(textUnit(chart));
      continue;
    }
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
    const compact = chart.type === 'number';
    unit.height = compact ? (typeof unit.height === 'number' ? unit.height : 88) : (chart.height ?? 240);
    if (compact && chart.title) {
      unit.title = {
        text: chart.title,
        anchor: 'middle',
        font: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: 13,
        fontWeight: 650,
        color: '#102129',
        offset: 4,
      };
    }
    if (chart.type === 'area') paintArea(unit, palette[0] || NAVY);
    units.push(pinArcLegend(unit, palette));
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

  const gap = spec.layout?.gap ?? 16;
  const rowSizes = spec.layout?.rows?.length
    ? spec.layout.rows
    : Array.from(
        { length: Math.ceil(units.length / Math.max(1, spec.layout?.columns ?? 2)) },
        () => Math.max(1, spec.layout?.columns ?? 2)
      );
  const rowWidth = 920;
  const fitRow = (slice: Record<string, unknown>[]) => {
    const each = Math.max(
      160,
      Math.floor((rowWidth - gap * Math.max(0, slice.length - 1)) / slice.length) - 28
    );
    const sized = slice.map((unit) => sizeCell(unit, each));
    return sized.length === 1
      ? sized[0]
      : { hconcat: sized, spacing: gap, resolve: { legend: { color: 'independent' } } };
  };
  const rows: Record<string, unknown>[] = [];
  let offset = 0;
  for (const n of rowSizes) {
    const slice = units.slice(offset, offset + n);
    offset += n;
    if (slice.length === 0) break;
    rows.push(fitRow(slice));
  }
  if (offset < units.length) {
    rows.push(fitRow(units.slice(offset)));
  }

  const composed =
    rows.length === 1
      ? rows[0]
      : { vconcat: rows, spacing: gap, resolve: { legend: { color: 'independent' } } };

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    background: 'transparent',
    config: {
      ...themeConfig,
      range: { category: palette },
    },
    ...composed,
  };
}

/** Expose publish plan for tests. */
export function _planPublishParamsForTests(charts: ChartSpec[]): VlPublishParam[] {
  return planVegaPublishParams(charts);
}
