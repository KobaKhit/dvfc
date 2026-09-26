/**
 * Multi-chart Vega HTML: one Vega-Lite view per cell, laid out with the
 * same CSS grid Mosaic and dc.js use (`layout.rows` / column spans).
 * Brush and point selections are shared across views in a small script
 * because separate Vega views cannot see each other's params.
 */

import type { ChartSpec, DashboardSpec } from '@dvfc/core';
import { embedRowTracks, escapeHtml, resolveGridLayout } from '@dvfc/core';
import { chartToVegaLiteBuiltin } from './marks/index.js';
import {
  buildPublishSelect,
  filterParamNamesForChart,
  planVegaPublishParams,
  type VlPublishParam,
} from './interaction.js';

const FALLBACK_PALETTE = ['#1e3a5f', '#7ba3c9', '#a89b8c', '#4a7c9b', '#c4b5a0'];

interface GridPublish {
  name: string;
  kind: 'interval' | 'point';
  field: string;
}

interface GridLegendItem {
  label: string;
  color: string;
}

interface GridCell {
  id: string;
  spec: Record<string, unknown> | null;
  dataName: string | null;
  rows: Record<string, unknown>[];
  filters: string[];
  publish: GridPublish | null;
  legend: GridLegendItem[] | null;
}

function markdownBlock(escaped: string): string {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function paintArea(unit: Record<string, unknown>, color: string): void {
  const mark = unit.mark;
  if (!mark || typeof mark !== 'object') return;
  unit.mark = {
    ...(mark as Record<string, unknown>),
    line: { color, strokeWidth: 2.5 },
    color: {
      x1: 1,
      y1: 1,
      x2: 1,
      y2: 0,
      gradient: 'linear',
      stops: [
        { offset: 0, color: `${color}22` },
        { offset: 1, color: `${color}aa` },
      ],
    },
  };
}

function uniqueLabels(values: Record<string, unknown>[], field: string): string[] {
  const labels: string[] = [];
  for (const row of values) {
    const label = String(row[field] ?? '');
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

function publishFor(
  chart: ChartSpec,
  params: VlPublishParam[]
): GridPublish | null {
  const mine = params.find((p) => p.chartId === chart.id);
  const select = mine?.select ?? buildPublishSelect(chart);
  if (!mine || !select || typeof select.type !== 'string') return null;
  const kind = select.type === 'interval' ? 'interval' : 'point';
  const encodings = Array.isArray(select.encodings) ? select.encodings : [];
  const field =
    kind === 'point' && (chart.type === 'pie' || chart.type === 'donut')
      ? chart.encoding?.x?.field
      : encodings.includes('y') && !encodings.includes('x')
        ? chart.encoding?.y?.field
        : chart.encoding?.x?.field;
  if (!field) return null;
  return { name: mine.name, kind, field };
}

function unitForCell(
  chart: ChartSpec,
  values: Record<string, unknown>[],
  palette: string[],
  mine: VlPublishParam | null
): Record<string, unknown> {
  const unit = chartToVegaLiteBuiltin(chart, values);
  delete unit.$schema;
  delete unit.background;
  unit.config = {
    view: { stroke: null },
    axis: { grid: false },
    range: { category: palette },
    title: { anchor: 'start', font: 'system-ui, sans-serif', fontSize: 13, color: '#102129' },
  };
  delete unit.title;
  unit.data = { name: 'rows', values };
  unit.width = 'container';
  unit.height = chart.type === 'number' ? 64 : 'container';
  unit.background = 'transparent';
  if (chart.type === 'area') paintArea(unit, palette[0] || '#1e3a5f');
  if (chart.type === 'pie' || chart.type === 'donut') {
    const encoding = unit.encoding as { color?: Record<string, unknown> } | undefined;
    if (encoding?.color) encoding.color = { ...encoding.color, legend: null };
  }
  if (mine) unit.params = [{ name: mine.name, select: mine.select }];
  return unit;
}

function legendItems(
  chart: ChartSpec,
  values: Record<string, unknown>[],
  palette: string[]
): GridLegendItem[] | null {
  if (chart.type !== 'pie' && chart.type !== 'donut') return null;
  const field = chart.encoding?.x?.field;
  if (!field) return null;
  return uniqueLabels(values, field)
    .sort((a, b) => a.localeCompare(b))
    .map((label, i) => ({
    label,
    color: palette[i % palette.length] || '#1e3a5f',
  }));
}

export function buildVegaGridPage(
  spec: DashboardSpec,
  valuesBySource: Map<string, Record<string, unknown>[]>
): string {
  const palette = spec.theme?.colors?.length ? spec.theme.colors : FALLBACK_PALETTE;
  const charts = spec.charts;
  const publishParams = planVegaPublishParams(charts.filter((c) => c.type !== 'text' && c.type !== 'table'));
  const grid = resolveGridLayout(spec.layout);
  const gap = spec.layout?.gap ?? 16;
  const rowTracks = embedRowTracks(spec.layout, charts);
  const spanRules =
    grid.spans
      ?.map((span, i) => `.charts > :nth-child(${i + 1}) { grid-column: span ${span}; }`)
      .join('\n    ') ?? '';

  const cells: GridCell[] = [];
  const slots: string[] = [];

  charts.forEach((chart, index) => {
    const compact = chart.type === 'number' || chart.type === 'text';
    const span = grid.spans ? ` style="grid-column: span ${grid.spans[index]}"` : '';
    if (chart.type === 'text') {
      slots.push(
        `<div class="chart-container chart-container--compact"${span}><div class="text-body"><p>${markdownBlock(escapeHtml(chart.content || ''))}</p></div></div>`
      );
      return;
    }
    const values = chart.dataSource ? valuesBySource.get(chart.dataSource) ?? [] : [];
    const mine = publishParams.find((p) => p.chartId === chart.id) ?? null;
    let vl: Record<string, unknown> | null = null;
    try {
      vl = unitForCell(chart, values, palette, mine);
    } catch {
      vl = null;
    }
    const legend = legendItems(chart, values, palette);
    const publish = publishFor(chart, publishParams);
    cells.push({
      id: chart.id,
      spec: vl,
      dataName: vl ? 'rows' : null,
      rows: values,
      filters: filterParamNamesForChart(chart, publishParams),
      publish,
      legend,
    });
    const title = chart.title ? `<h3>${escapeHtml(chart.title)}</h3>` : '';
    const legendHtml = legend
      ? `<div class="vg-legend" data-for="${escapeHtml(chart.id)}">${legend
          .map(
            (item) =>
              `<button type="button" class="vg-leg" data-chart="${escapeHtml(chart.id)}" data-label="${escapeHtml(item.label)}"><i style="background:${item.color}"></i><span>${escapeHtml(item.label)}</span></button>`
          )
          .join('')}</div>`
      : '';
    slots.push(
      `<div class="chart-container${compact ? ' chart-container--compact' : ''}"${span}>${title}<div id="vg-${escapeHtml(chart.id)}" class="vg-plot"></div>${legendHtml}</div>`
    );
  });

  const title = spec.meta?.title || 'Dashboard';
  const cellJson = JSON.stringify(cells);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
  <style>
    :root { --ink: #102129; --muted: #607078; --line: #e4eaee; --navy: #1e3a5f; }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      color: var(--ink);
      background: #f7f8fa;
      padding: clamp(0.85rem, 2.2vw, 1.75rem);
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid rgba(16, 33, 41, 0.08);
      border-radius: 4px;
      padding: clamp(1.15rem, 2.4vw, 2rem);
      min-height: 100%;
      display: flex;
      flex-direction: column;
    }
    h1 {
      font-family: Georgia, "Iowan Old Style", serif;
      font-size: clamp(1.55rem, 2.8vw, 2.05rem);
      margin: 0 0 0.75rem;
    }
    .charts {
      display: grid;
      grid-template-columns: repeat(${grid.columns}, minmax(0, 1fr));
      grid-template-rows: ${rowTracks};
      gap: ${gap}px;
      flex: 1;
      min-height: 0;
    }
    ${spanRules}
    .chart-container {
      min-width: 0;
      min-height: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .chart-container--compact { height: auto; justify-content: center; }
    .chart-container h3 {
      margin: 0 0 0.35rem;
      font-size: 0.88rem;
      font-weight: 650;
    }
    .chart-container--compact h3 { text-align: center; }
    .text-body { padding: 0.15rem 0.1rem; line-height: 1.55; font-size: 0.92rem; }
    .text-body p { margin: 0; }
    .vg-plot { flex: 1; min-height: 0; width: 100%; }
    .chart-container--compact .vg-plot { min-height: 4.25rem; flex: none; height: 4.25rem; }
    .vg-legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.35rem 0.85rem;
      padding: 0.15rem 0 0.2rem;
      flex-shrink: 0;
    }
    .vg-leg {
      appearance: none;
      border: 0;
      background: transparent;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--ink);
      cursor: pointer;
      padding: 0;
    }
    .vg-leg i {
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 2px;
      display: inline-block;
      flex-shrink: 0;
    }
    .vg-leg.is-off { opacity: 0.35; }
    html.is-embedded, html.is-embedded body { height: 100%; background: #fff; }
    html.is-embedded body { padding: 0; }
    html.is-embedded h1, html.is-embedded footer { display: none; }
    html.is-embedded .container {
      max-width: none;
      height: 100%;
      border: 0;
      border-radius: 0;
      padding: 0.35rem 0.45rem 0.4rem;
    }
    @media (max-width: 768px) {
      .charts { grid-template-columns: 1fr !important; }
      .charts > * { grid-column: auto !important; }
    }
  </style>
  <script>
    if (new URLSearchParams(location.search).get('embed') === '1') {
      document.documentElement.classList.add('is-embedded');
    }
  </script>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(title)}</h1>
    <div class="charts">
      ${slots.join('\n      ')}
    </div>
  </div>
  <script>
    const CELLS = ${cellJson};
    const views = {};
    const state = {};

    function readSelection(kind, value) {
      if (!value || typeof value !== 'object') return null;
      if (kind === 'interval') {
        const field = Object.keys(value).find((key) => Array.isArray(value[key]) && value[key].length === 2);
        if (!field) return null;
        const [a, b] = value[field];
        return { kind: 'interval', field, min: a < b ? a : b, max: a < b ? b : a };
      }
      const field = Object.keys(value).find((key) => key !== 'vlPoint');
      if (!field) return null;
      let raw = value[field];
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) raw = Object.keys(raw);
      const values = (Array.isArray(raw) ? raw : [raw]).filter((v) => v != null && v !== false);
      if (!values.length) return null;
      return { kind: 'point', field, values: values.map(String) };
    }

    function matches(row, sel) {
      if (!sel) return true;
      const value = row[sel.field];
      if (sel.kind === 'interval') return value >= sel.min && value <= sel.max;
      return sel.values.includes(String(value));
    }

    function paintLegend() {
      document.querySelectorAll('.vg-leg').forEach((btn) => {
        const cell = CELLS.find((c) => c.id === btn.getAttribute('data-chart'));
        const sel = cell && cell.publish ? state[cell.publish.name] : null;
        const label = btn.getAttribute('data-label');
        const active = sel && sel.kind === 'point' && sel.values.includes(label);
        const any = sel && sel.kind === 'point';
        btn.classList.toggle('is-off', Boolean(any && !active));
      });
    }

    async function refresh() {
      for (const cell of CELLS) {
        const view = views[cell.id];
        if (!view || !cell.dataName) continue;
        let rows = cell.rows;
        for (const name of cell.filters) {
          if (state[name]) rows = rows.filter((row) => matches(row, state[name]));
        }
        await view.data(cell.dataName, rows).runAsync();
      }
      paintLegend();
    }

    async function boot() {
      for (const cell of CELLS) {
        if (!cell.spec) continue;
        const host = document.getElementById('vg-' + cell.id);
        if (!host) continue;
        const spec = cell.spec;
        if (spec.mark && spec.mark.type === 'arc') {
          const side = Math.max(80, Math.min(host.clientWidth || 280, host.clientHeight || 240));
          const outer = Math.round(side * 0.34);
          spec.mark.outerRadius = outer;
          if (spec.mark.innerRadius) spec.mark.innerRadius = Math.round(outer * 0.58);
        }
        const result = await vegaEmbed(host, spec, { actions: false, renderer: 'canvas' });
        views[cell.id] = result.view;
        if (cell.publish) {
          result.view.addSignalListener(cell.publish.name, (_name, value) => {
            const next = readSelection(cell.publish.kind, value);
            if (next) state[cell.publish.name] = next;
            else if (value == null || (typeof value === 'object' && Object.keys(value).length === 0)) {
              state[cell.publish.name] = null;
            }
            refresh();
          });
        }
      }
      document.querySelectorAll('.vg-leg').forEach((btn) => {
        btn.addEventListener('click', () => {
          const cell = CELLS.find((c) => c.id === btn.getAttribute('data-chart'));
          const view = cell && views[cell.id];
          if (!cell || !cell.publish || !view) return;
          const label = btn.getAttribute('data-label');
          const current = state[cell.publish.name];
          const on = current && current.kind === 'point' && current.values.length === 1 && current.values[0] === label;
          state[cell.publish.name] = on
            ? null
            : { kind: 'point', field: cell.publish.field, values: [label] };
          refresh();
        });
      });
    }

    boot().catch((err) => console.error(err));
  </script>
</body>
</html>
`;
}
