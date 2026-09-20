/**
 * Vega-Lite export → SVG / PNG
 */

import { readFile, writeFile, mkdir, cp } from 'fs/promises';
import { dirname, join, resolve as resolvePath } from 'path';
import { parse as parseCSV } from 'csv-parse/sync';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import { Resvg } from '@resvg/resvg-js';
import type { ChartSpec, DashboardSpec, ChannelEncoding } from '@dvfc/core';
import { normalizeFile, getChartType, registerBuiltinChartTypes, getBuiltinChartTypeIds, registerChartType } from '@dvfc/core';

function channelType(ch: ChannelEncoding | undefined): string | undefined {
  if (!ch) return undefined;
  const t = ch.type;
  if (t === 'quantitative') return 'quantitative';
  if (t === 'temporal') return 'temporal';
  if (t === 'ordinal') return 'ordinal';
  if (t === 'nominal') return 'nominal';
  if (ch.aggregate) return 'quantitative';
  return undefined;
}

export function chartToVegaLiteBuiltin(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  const mark =
    chart.type === 'line'
      ? { type: 'line', point: true }
      : chart.type === 'area'
        ? 'area'
        : chart.type === 'scatter'
          ? 'point'
          : chart.type === 'bar'
            ? 'bar'
            : chart.type === 'number'
              ? 'text'
              : 'point';

  const encoding: Record<string, unknown> = {};
  if (chart.encoding?.x) {
    encoding.x = {
      field: chart.encoding.x.field,
      type: channelType(chart.encoding.x) ?? 'nominal',
      title: chart.encoding.x.label,
      aggregate: chart.encoding.x.aggregate,
    };
  }
  if (chart.encoding?.y) {
    encoding.y = {
      field: chart.encoding.y.field,
      type: channelType(chart.encoding.y) ?? 'quantitative',
      title: chart.encoding.y.label,
      aggregate: chart.encoding.y.aggregate,
    };
  }
  if (chart.encoding?.color && typeof chart.encoding.color !== 'string') {
    encoding.color = {
      field: chart.encoding.color.field,
      type: channelType(chart.encoding.color) ?? 'nominal',
    };
  } else if (typeof chart.encoding?.color === 'string') {
    encoding.color = { value: chart.encoding.color };
  }

  if (chart.type === 'number' && chart.encoding?.y) {
    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      title: chart.title,
      data: { values },
      mark: { type: 'text', fontSize: 28 },
      encoding: {
        text: {
          field: chart.encoding.y.field,
          aggregate: chart.encoding.y.aggregate ?? 'sum',
          type: 'quantitative',
        },
      },
      width: chart.width ?? 200,
      height: chart.height ?? 80,
    };
  }

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title: chart.title,
    data: { values },
    mark,
    encoding,
    width: chart.width ?? 400,
    height: chart.height ?? 240,
  };
}

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

  const candidates = [
    assetMap.get(ds.id),
    join(stageDir, `${ds.id}.csv`),
  ];
  if (ds.type === 'sql' && ds.sql) {
    const fileMatch = ds.sql.match(/['"]([^'"]+\.(?:csv|tsv|json))['"]/i);
    if (fileMatch) {
      const base = fileMatch[1].replace(/\.[^.]+$/, '');
      candidates.push(assetMap.get(base), join(stageDir, fileMatch[1]));
    }
  }
  // Last resort: any staged CSV
  for (const [, path] of assetMap) {
    if (path.endsWith('.csv')) candidates.push(path);
  }

  for (const dest of candidates) {
    if (!dest) continue;
    try {
      const text = await readFile(dest, 'utf-8');
      return parseCSV(text, { columns: true, skip_empty_lines: true, cast: true });
    } catch {
      /* try next */
    }
  }

  throw new Error(
    `Cannot load CSV for Vega export of '${chart.id}' (source ${ds.id}). SQL-only sources need a CSV asset.`
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
}

/**
 * Self-contained HTML page embedding Vega-Lite + CDN vega-embed (no DuckDB-WASM).
 */
export function buildHtmlStaticPage(
  vlSpec: Record<string, unknown>,
  title?: string
): string {
  const pageTitle = title || (typeof vlSpec.title === 'string' ? vlSpec.title : 'Chart');
  const specJson = JSON.stringify(vlSpec);
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
    }
  </style>
</head>
<body>
  <div id="vis"></div>
  <script type="text/javascript">
    vegaEmbed('#vis', ${specJson}, { actions: true }).catch(console.error);
  </script>
</body>
</html>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportStatic(
  specPath: string,
  options: ExportOptions
): Promise<string> {
  const normalized = await normalizeFile(specPath, options.projectRoot);
  let { spec, assets } = normalized;

  if (options.chartId) {
    const chart = spec.charts.find((c) => c.id === options.chartId);
    if (!chart) throw new Error(`Chart '${options.chartId}' not found`);
    spec = {
      ...spec,
      charts: [chart],
      data: spec.data.filter((d) => d.id === chart.dataSource),
    };
  }

  if (spec.charts.length !== 1) {
    throw new Error(
      `Static export requires a single chart (got ${spec.charts.length}). Use --chart <id> for dashes.`
    );
  }

  const chart = spec.charts[0];
  if (chart.type === 'text') {
    throw new Error('Cannot export text charts to svg/png');
  }

  const outFile = options.outFile || `${chart.id}.${options.format === 'html-static' ? 'html' : options.format}`;
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

  const values = await loadValuesForChart(spec, chart, stageDir, assetMap);
  const vl = chartToVegaLite(chart, values);

  await mkdir(dirname(resolvePath(outFile)), { recursive: true });

  if (options.format === 'html-static') {
    const html = buildHtmlStaticPage(vl, chart.title || chart.id);
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
