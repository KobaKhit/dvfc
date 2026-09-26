/**
 * Vega-Lite export → SVG / PNG
 */

import { readFile, writeFile, mkdir, cp } from 'fs/promises';
import { dirname, join, resolve as resolvePath, basename } from 'path';
import { parse as parseCSV } from 'csv-parse/sync';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import { Resvg } from '@resvg/resvg-js';
import type { ChartSpec, DashboardSpec } from '@dvfc/core';
import {
  normalizeFile,
  filterSpecToChart,
  getChartType,
  registerBuiltinChartTypes,
  getBuiltinChartTypeIds,
  registerChartType,
  escapeHtml,
  type NormalizeResult,
} from '@dvfc/core';
import { chartToVegaLiteBuiltin } from './marks/index.js';
import { buildVegaGridPage } from './grid-page.js';
import { applyVegaInteraction, planVegaPublishParams } from './interaction.js';

export { chartToVegaLiteBuiltin };

export function chartToVegaLite(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  attachVegaRenderersSync();

  const plugin = getChartType(chart.type);
  if (plugin && plugin.capabilities.vegaLite === false) {
    throw new Error(
      `Chart type '${chart.type}' does not support Vega-Lite export (svg/png). Use --format html.`
    );
  }
  if (plugin?.renderVegaLite) {
    const custom = plugin.renderVegaLite({ chart, values }) as Record<string, unknown> | undefined;
    if (custom && typeof custom === 'object' && custom.$schema) {
      return { ...custom, data: { values } };
    }
  }
  return chartToVegaLiteBuiltin(chart, values);
}

let vegaAttached = false;
function attachVegaRenderersSync(): void {
  if (vegaAttached) return;
  registerBuiltinChartTypes();
  for (const id of getBuiltinChartTypeIds()) {
    const existing = getChartType(id);
    if (!existing) continue;
    if (existing.capabilities.vegaLite === false) continue;
    registerChartType({
      ...existing,
      renderVegaLite(ctx) {
        const c = ctx.chart as ChartSpec;
        const vals = (ctx.values as Record<string, unknown>[] | undefined) ?? [];
        return chartToVegaLiteBuiltin(c, vals);
      },
    });
  }
  vegaAttached = true;
}

/** Public alias for CLI / tests */
export function attachBuiltinVegaRenderers(): void {
  attachVegaRenderersSync();
}

async function loadValuesForChart(
  spec: DashboardSpec,
  chart: ChartSpec,
  stageDir: string,
  assetMap: Map<string, string>
): Promise<Record<string, unknown>[]> {
  if (chart.type === 'text') return [];
  const ds = spec.data.find((d) => d.id === chart.dataSource);
  if (!ds) throw new Error(`No data source for chart ${chart.id}`);

  const candidates: string[] = [];
  const primary = assetMap.get(ds.id);
  if (primary) candidates.push(primary);
  candidates.push(join(stageDir, `${ds.id}.csv`), join(stageDir, `${ds.id}.parquet`));
  if (ds.path) {
    const staged = join(stageDir, basename(ds.path));
    candidates.push(staged);
    const byId = assetMap.get(ds.id);
    if (byId) candidates.push(byId);
  }
  if (ds.type === 'sql' && ds.sql) {
    const fileMatch = ds.sql.match(/['"]([^'"]+\.(?:csv|tsv|json))['"]/i);
    if (fileMatch) {
      const base = fileMatch[1].replace(/\.[^.]+$/, '');
      const mapped = assetMap.get(base);
      if (mapped) candidates.push(mapped);
      candidates.push(join(stageDir, fileMatch[1]));
    }
  }

  const tried: string[] = [];
  const errors: string[] = [];
  for (const dest of [...new Set(candidates.filter(Boolean))]) {
    tried.push(dest);
    try {
      if (dest.endsWith('.parquet')) {
        throw new Error(
          `Parquet staging found at ${dest}, but Vega static export requires CSV. Convert or provide a CSV asset.`
        );
      }
      const text = await readFile(dest, 'utf-8');
      const rows = parseCSV(text, { columns: true, skip_empty_lines: true, cast: true }) as Record<
        string,
        unknown
      >[];
      if (!Array.isArray(rows)) {
        throw new Error(`Parsed data is not an array`);
      }
      // Empty file is valid only if the CSV parsed cleanly (header-only); still return it.
      return rows;
    } catch (err) {
      errors.push(`${dest}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(
    `Cannot load CSV for Vega export of '${chart.id}' (source ${ds.id}). ` +
      `Tried: ${tried.join(', ') || '(none)'}. ` +
      `SQL/url/parquet-only sources need a CSV asset. ` +
      `Details: ${errors.slice(0, 3).join('; ')}`
  );
}

export async function renderChartSvg(vlSpec: Record<string, unknown>): Promise<string> {
  const vgSpec = vegaLite.compile(vlSpec as unknown as vegaLite.TopLevelSpec).spec;
  const view = new vega.View(vega.parse(vgSpec), { renderer: 'none' });
  await view.runAsync();
  return view.toSVG();
}

export async function renderChartPng(vlSpec: Record<string, unknown>): Promise<Buffer> {
  const svg = await renderChartSvg(vlSpec);
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 800 } });
  return Buffer.from(resvg.render().asPng());
}

export interface ExportOptions {
  format: 'svg' | 'png' | 'html-static';
  outFile?: string;
  chartId?: string;
  projectRoot?: string;
  /** When already normalized, skip re-reading/re-normalizing the spec. */
  normalized?: NormalizeResult;
}

/**
 * Self-contained HTML page embedding Vega-Lite + CDN vega-embed (no DuckDB-WASM).
 */
export function buildHtmlStaticPage(
  vlSpec: Record<string, unknown>,
  title?: string,
  options?: { actions?: boolean; fill?: boolean }
): string {
  const pageTitle = title || (typeof vlSpec.title === 'string' ? vlSpec.title : 'Chart');
  const specJson = JSON.stringify(vlSpec);
  const actions = options?.actions !== false;
  const fill = options?.fill === true;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pageTitle)}</title>
  <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
  <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      background: linear-gradient(160deg, #f4f7fb 0%, #e8eef5 50%, #f7fafc 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      box-sizing: border-box;
    }
    #vis {
      background: #fff;
      padding: 1.5rem;
      box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
      max-width: 100%;
      overflow: auto;
    }
    html.is-embedded,
    html.is-embedded body {
      height: 100%;
      min-height: 0;
      background: #fff;
    }
    html.is-embedded body {
      padding: 0.35rem;
      align-items: flex-start;
      justify-content: stretch;
    }
    html.is-embedded #vis {
      width: 100%;
      padding: 0.4rem 0.5rem 0.6rem;
      box-shadow: none;
    }
    html:has(body.is-fill) {
      height: 100%;
    }
    body.is-fill {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      height: 100%;
      min-height: 0;
      padding: 0.75rem 0.9rem 1rem;
      background: #fff;
    }
    body.is-fill h1 {
      font-family: Georgia, "Iowan Old Style", serif;
      font-size: 1.35rem;
      font-weight: 600;
      margin: 0 0 0.65rem;
      color: #102129;
    }
    body.is-fill #vis {
      flex: 1;
      width: 100%;
      height: 100%;
      min-height: 0;
      padding: 0;
      box-shadow: none;
      overflow: hidden;
    }
    html.is-embedded body.is-fill {
      padding: 0.2rem 0.35rem 0.3rem;
    }
    html.is-embedded body.is-fill h1 {
      display: none;
    }
  </style>
  <script>
    if (new URLSearchParams(location.search).get('embed') === '1') {
      document.documentElement.classList.add('is-embedded');
    }
  </script>
</head>
<body class="${fill ? 'is-fill' : ''}">
  ${fill ? `<h1>${escapeHtml(pageTitle)}</h1>` : ''}
  <div id="vis"></div>
  <script type="text/javascript">
    const dvfcSpec = ${specJson};
    const dvfcOpts = { actions: ${actions}, renderer: 'canvas' };
    const dvfcFill = ${fill ? 'true' : 'false'};

    function dvfcGrowPlots(spec, spare) {
      const rows = Array.isArray(spec.vconcat) ? spec.vconcat : [spec];
      let target = null;
      let best = 0;
      for (const row of rows) {
        const units = Array.isArray(row.hconcat) ? row.hconcat : [row];
        const h = Math.max(0, ...units.map((u) => (typeof u.height === 'number' ? u.height : 0)));
        if (h > best) { best = h; target = units; }
      }
      if (!target || best < 140 || spare < 24) return false;
      for (const unit of target) {
        if (typeof unit.height !== 'number' || unit.height < 140) continue;
        const nextH = unit.height + spare;
        if (unit.mark && unit.mark.type === 'arc') {
          const outer = Math.max(96, Math.round(Math.min(nextH, unit.width || 420) * 0.32));
          const inner = unit.mark.innerRadius ? Math.round(outer * 0.58) : 0;
          unit.mark = Object.assign({}, unit.mark, { outerRadius: outer, innerRadius: inner });
        }
        unit.height = nextH;
      }
      return true;
    }

    function dvfcFitWidth(spec) {
      const rows = Array.isArray(spec.vconcat) ? spec.vconcat : [spec];
      const box = Math.max(320, document.documentElement.clientWidth - 8);
      for (const row of rows) {
        const units = Array.isArray(row.hconcat) ? row.hconcat : [row];
        const gap = typeof row.spacing === 'number' ? row.spacing : 16;
        const each = Math.max(140, Math.floor((box - 72 - gap * Math.max(0, units.length - 1)) / units.length));
        for (const unit of units) dvfcSetCellWidth(unit, each);
      }
    }

    function dvfcSetCellWidth(node, width) {
      if (Array.isArray(node.vconcat)) {
        const [plot, legend] = node.vconcat;
        if (plot) plot.width = width;
        if (legend && Array.isArray(legend.hconcat)) {
          const n = legend.hconcat.length || 1;
          const gap = legend.spacing || 0;
          const each = Math.max(48, Math.floor((width - gap * (n - 1)) / n));
          for (const item of legend.hconcat) item.width = each;
        }
        return;
      }
      node.width = width;
    }

    function dvfcScaleWidths(spec, ratio) {
      const rows = Array.isArray(spec.vconcat) ? spec.vconcat : [spec];
      for (const row of rows) {
        const units = Array.isArray(row.hconcat) ? row.hconcat : [row];
        for (const unit of units) {
          const current = Array.isArray(unit.vconcat) ? unit.vconcat[0]?.width : unit.width;
          if (typeof current === 'number') {
            dvfcSetCellWidth(unit, Math.max(120, Math.floor(current * ratio)));
          }
        }
      }
    }

    (async () => {
      const vis = document.getElementById('vis');
      const layout = JSON.parse(JSON.stringify(dvfcSpec));
      if (dvfcFill) dvfcFitWidth(layout);
      const draw = (spec) => vegaEmbed('#vis', JSON.parse(JSON.stringify(spec)), dvfcOpts);
      await draw(layout);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (dvfcFill) {
        let node = vis.querySelector('canvas, svg');
        if (node && node.clientWidth > vis.clientWidth + 4) {
          dvfcScaleWidths(layout, (vis.clientWidth / node.clientWidth) * 0.98);
          await draw(layout);
          await new Promise((resolve) => requestAnimationFrame(resolve));
          node = vis.querySelector('canvas, svg');
        }
        const spare = node ? document.documentElement.clientHeight - node.clientHeight : 0;
        const grown = JSON.parse(JSON.stringify(layout));
        if (dvfcGrowPlots(grown, Math.floor(spare - 48))) await draw(grown);
      }
      const node = vis.querySelector('canvas, svg');
      if (node) {
        const availW = vis.clientWidth;
        const availH = vis.clientHeight;
        const scale = Math.min(1, availW / node.clientWidth, availH / node.clientHeight);
        if (scale < 0.995) {
          node.style.width = Math.floor(node.clientWidth * scale) + 'px';
          node.style.height = Math.floor(node.clientHeight * scale) + 'px';
        }
      }
    })().catch(console.error);
  </script>
</body>
</html>
`;
}

export async function exportStatic(
  specPath: string,
  options: ExportOptions
): Promise<string> {
  const normalized =
    options.normalized ?? (await normalizeFile(specPath, options.projectRoot));
  let { spec, assets } = normalized;

  if (options.chartId) {
    const filtered = filterSpecToChart(spec, assets, options.chartId);
    spec = filtered.spec;
    assets = filtered.assets;
  }

  const multiChart = spec.charts.length > 1;
  if (multiChart && options.format !== 'html-static') {
    throw new Error(
      `Static ${options.format} export requires a single chart (got ${spec.charts.length}). Use --chart <id> for dashes.`
    );
  }
  if (spec.charts.length === 0) {
    throw new Error('No charts to export');
  }

  const primary = spec.charts[0];
  if (!multiChart && primary.type === 'text') {
    throw new Error('Cannot export text charts to svg/png/html-static');
  }

  const outFile =
    options.outFile ||
    `${multiChart ? spec.meta?.title || 'dash' : primary.id}.${
      options.format === 'html-static' ? 'html' : options.format
    }`.replace(/[^\w.-]+/g, '_');

  const stageDir = join(dirname(resolvePath(outFile)), '.dvfc-export-data');
  await mkdir(stageDir, { recursive: true });
  const assetMap = new Map<string, string>();

  for (const a of assets) {
    const dest = join(stageDir, a.destName);
    await cp(a.absPath, dest, { dereference: true, force: true });
    const base = a.destName.replace(/\.[^.]+$/, '');
    assetMap.set(base, dest);
  }
  for (const ds of spec.data) {
    const candidate = join(stageDir, `${ds.id}.csv`);
    try {
      await readFile(candidate);
      assetMap.set(ds.id, candidate);
    } catch {
      /* ignore */
    }
  }

  await mkdir(dirname(resolvePath(outFile)), { recursive: true });

  if (multiChart && options.format === 'html-static') {
    const valuesBySource = new Map<string, Record<string, unknown>[]>();
    for (const chart of spec.charts) {
      if (chart.type === 'text' || chart.type === 'table' || !chart.dataSource) continue;
      if (valuesBySource.has(chart.dataSource)) continue;
      valuesBySource.set(
        chart.dataSource,
        await loadValuesForChart(spec, chart, stageDir, assetMap)
      );
    }
    const html = buildVegaGridPage(spec, valuesBySource);
    await writeFile(outFile, html);
    return outFile;
  }

  const values = await loadValuesForChart(spec, primary, stageDir, assetMap);
  let vl = chartToVegaLite(primary, values);
  // Single-chart html-static: still honor brush params when present
  if (options.format === 'html-static') {
    const pubs = planVegaPublishParams([primary]);
    vl = applyVegaInteraction(vl, primary, pubs);
  }

  if (options.format === 'html-static') {
    const html = buildHtmlStaticPage(vl, primary.title || primary.id);
    await writeFile(outFile, html);
    return outFile;
  }

  if (options.format === 'svg') {
    const svg = await renderChartSvg(vl);
    await writeFile(outFile, svg);
    return outFile;
  }

  const png = await renderChartPng(vl);
  await writeFile(outFile, png);
  return outFile;
}
