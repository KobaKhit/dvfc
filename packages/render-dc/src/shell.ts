/**
 * Shared dc.js dashboard HTML shell (static CDN + DuckDB-WASM).
 */

import type { ChartSpec, DashboardSpec } from '@dvfc/core';
import { embedRowTracks, escapeHtml, resolveGridLayout } from '@dvfc/core';
import { DVFC_TIP_CSS } from './tips.js';

export { escapeHtml };

/** Same small markdown subset Mosaic uses for text charts. Input must already be escaped. */
function markdownBlock(escaped: string): string {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

export function chartSlot(chart: ChartSpec): string {
  const compact = chart.type === 'number' || chart.type === 'text' ? ' chart-container--compact' : '';
  if (chart.type === 'text') {
    return `<div class="chart-container chart-text${compact}" id="dc-${escapeHtml(chart.id)}">
      <div class="text-body"><p>${markdownBlock(escapeHtml(chart.content || ''))}</p></div>
    </div>`;
  }
  const title = chart.title
    ? `<h3>${escapeHtml(chart.title)}</h3>`
    : '';
  const kpi = chart.type === 'number' ? ' dvfc-kpi' : '';
  return `<div class="chart-container${compact}">
      ${title}
      <div id="dc-${escapeHtml(chart.id)}" class="dc-chart${kpi}"></div>
    </div>`;
}

/** Full contents of the shared `<style>` block (includes tip CSS). */
export function buildDcPageCss(spec: DashboardSpec): string {
  const grid = resolveGridLayout(spec.layout);
  const columns = grid.columns;
  const gap = spec.layout?.gap ?? 16;
  const isFlex = spec.layout?.type === 'flex';
  const bordered = spec.theme?.chartBorders === true;
  const rowTracks = embedRowTracks(spec.layout, spec.charts);
  const spanRules =
    grid.spans
      ?.map(
        (span, i) =>
          `.charts > :nth-child(${i + 1}) { grid-column: span ${span}; }`
      )
      .join('\n    ') ?? '';

  return `
    :root {
      --ink: #102129;
      --muted: #607078;
      --line: #e4eaee;
      --navy: #1e3a5f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      color: var(--ink);
      background: #f7f8fa;
      padding: clamp(0.85rem, 2.2vw, 1.75rem);
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid rgba(16,33,41,0.08);
      border-radius: 4px;
      padding: clamp(1.15rem, 2.4vw, 2rem);
    }
    h1 {
      font-family: Georgia, "Iowan Old Style", serif;
      font-size: clamp(1.55rem, 2.8vw, 2.05rem);
      margin: 0 0 0.3rem;
      letter-spacing: -0.02em;
    }
    .subtitle { color: var(--muted); font-size: 0.92rem; margin-bottom: 0.75rem; }
    #status, .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      font-weight: 650;
      color: var(--navy);
      background: rgba(30,58,95,0.07);
      border: 1px solid rgba(30,58,95,0.14);
      border-radius: 4px;
      padding: 0.3rem 0.55rem;
      margin-bottom: 1rem;
    }
    .charts {
      display: ${isFlex ? 'flex' : 'grid'};
      ${isFlex ? 'flex-wrap: wrap;' : `grid-template-columns: repeat(${columns}, minmax(0, 1fr));`}
      gap: ${gap}px;
    }
    ${spanRules}
    ${isFlex ? `.charts > * { flex: 1 1 calc(50% - ${gap / 2}px); min-width: 280px; }` : ''}
    @media (max-width: 768px) {
      .charts { grid-template-columns: 1fr !important; }
      .charts > * { grid-column: auto !important; }
    }
    .chart-container {
      border: ${bordered ? '1px solid var(--line)' : '0'};
      border-radius: 4px;
      padding: ${bordered ? '1rem 1rem 0.75rem' : '0.35rem 0.45rem 0.2rem'};
      background: #fff;
      min-width: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .text-body {
      padding: 0.35rem 0.15rem 0.25rem;
      line-height: 1.55;
      color: var(--ink);
      font-size: 0.92rem;
    }
    .text-body p { margin: 0; }
    .chart-container h3 {
      margin: 0 0 0.55rem;
      font-size: 0.88rem;
      font-weight: 650;
    }
    .chart-container--compact h3 {
      text-align: center;
    }
    .dc-chart {
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 8rem;
    }
    .dc-chart svg {
      overflow: visible;
      display: block;
      margin: 0 auto;
      max-width: 100%;
    }
    .dvfc-scatter-legend {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.55rem 0.9rem;
      margin-top: 0.55rem;
      font-size: 0.78rem;
      color: var(--ink);
      line-height: 1.3;
    }
    .dvfc-legend-item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--ink);
    }
    .dvfc-legend-item i {
      width: 0.65rem;
      height: 0.65rem;
      border-radius: 2px;
      display: inline-block;
      flex-shrink: 0;
    }
    .dvfc-kpi,
    .dvfc-kpi .number-display,
    .dvfc-kpi > span {
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: clamp(1.9rem, 3.2vw, 2.7rem);
      font-weight: 700;
      color: var(--navy);
      letter-spacing: -0.04em;
      line-height: 1;
      text-align: center;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 4.5rem;
    }
    .dc-chart text {
      font-size: 11px;
      fill: var(--muted);
    }
    .dc-legend-item text {
      fill: var(--ink);
      font-size: 11px;
    }
    .dc-chart .axis path,
    .dc-chart .axis line {
      stroke: var(--line);
    }
    .dc-chart .grid-line,
    .dc-chart g.tick line.grid-line {
      display: none;
    }
    .dc-chart .x-axis-label,
    .dc-chart .y-axis-label {
      fill: var(--ink);
      font-size: 12px;
      font-weight: 600;
    }
    .reset {
      font-size: 0.78rem;
      color: var(--navy);
      cursor: pointer;
      margin-left: 0.5rem;
      text-decoration: underline;
    }
    footer {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 0.78rem;
      text-align: center;
    }
    html.is-embedded,
    html.is-embedded body {
      height: 100%;
      background: #fff;
    }
    html.is-embedded body {
      padding: 0;
    }
    html.is-embedded .container {
      max-width: none;
      height: 100%;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      border: 0;
      border-radius: 0;
      padding: 0.35rem 0.45rem 0.4rem;
      overflow: hidden;
    }
    html.is-embedded .charts {
      flex: 1;
      min-height: 0;
      grid-template-rows: ${rowTracks};
      align-items: stretch;
    }
    html.is-embedded .chart-container {
      min-height: 0;
      height: 100%;
    }
    html.is-embedded .chart-container--compact {
      height: auto;
      justify-content: center;
    }
    html.is-embedded .dc-chart,
    html.is-embedded .dvfc-kpi {
      min-height: 0;
    }
    html.is-embedded h1,
    html.is-embedded .subtitle,
    html.is-embedded #status,
    html.is-embedded .badge,
    html.is-embedded footer {
      display: none;
    }
${DVFC_TIP_CSS}
`;
}

export interface DcPageOptions {
  spec: DashboardSpec;
  /** Inner HTML of the badge div */
  badgeHtml: string;
  /** Footer inner HTML */
  footerHtml: string;
  /** Extra markup placed directly above the badge (WASM uses it for #status) */
  preBadgeHtml?: string;
  /** Everything after the closing </div> of .container — script tags */
  scriptsHtml: string;
}

/** Full HTML document for a dc.js dashboard. */
export function buildDcPage(options: DcPageOptions): string {
  const { spec, badgeHtml, footerHtml, preBadgeHtml = '', scriptsHtml } = options;
  const title = spec.meta?.title || 'Dashboard';
  const slots = spec.charts.map(chartSlot).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dc@4.2.7/dist/style/dc.min.css" />
  <style>${buildDcPageCss(spec)}
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
    ${spec.meta?.description ? `<p class="subtitle">${escapeHtml(spec.meta.description)}</p>` : ''}
    ${preBadgeHtml}
    <div class="badge">${badgeHtml}</div>
    <div class="charts">
    ${slots}
    </div>
    <footer>${footerHtml}</footer>
  </div>
  ${scriptsHtml}
</body>
</html>
`;
}
