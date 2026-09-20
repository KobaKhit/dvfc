/**
 * DuckDB-WASM + dc.js dashboard codegen (Vite-bundled).
 * Loads CSV/Parquet via DuckDB, materializes rows into crossfilter, then dc.js charts.
 */

import { basename } from 'node:path';
import type { ChartSpec, DashboardSpec, DataSource } from '@dvfc/core';
import { generateDcChartCode } from './charts.js';

export interface DcWasmGeneratorContext {
  spec: DashboardSpec;
  /** Public base path (e.g. `/` or `/dvfc/`) */
  base?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chartSlot(chart: ChartSpec): string {
  if (chart.type === 'text') {
    return `<div class="chart-container chart-text" id="dc-${escapeHtml(chart.id)}">
      <div class="text-body">${escapeHtml(chart.content || '')}</div>
    </div>`;
  }
  const title = chart.title ? `<h3>${escapeHtml(chart.title)}</h3>` : '';
  return `<div class="chart-container">
      ${title}
      <div id="dc-${escapeHtml(chart.id)}" class="dc-chart"></div>
    </div>`;
}

/** SQL with `${origin}` / `${dataPath}` left for the generated main.ts template. */
function createTableSql(ds: DataSource): string {
  if (ds.type === 'sql' && ds.sql) {
    const rewritten = ds.sql.replace(
      /(['"])([^'"/]+\.(?:csv|parquet|json|tsv))\1/gi,
      (_m, _q, file: string) => `'${'${origin}'}${'${dataPath}'}${file}'`
    );
    return `CREATE TABLE IF NOT EXISTS ${ds.id} AS ${rewritten}`;
  }
  if (ds.type === 'url' && ds.path && /^https?:\/\//i.test(ds.path)) {
    const url = ds.path.replace(/'/g, "''");
    const reader = /\.parquet(\?|$)/i.test(ds.path)
      ? `read_parquet('${url}')`
      : `read_csv_auto('${url}')`;
    return `CREATE TABLE IF NOT EXISTS ${ds.id} AS SELECT * FROM ${reader}`;
  }
  if (
    ds.type === 'parquet' ||
    (typeof ds.path === 'string' && /\.parquet$/i.test(ds.path))
  ) {
    const file =
      ds.path && !ds.path.includes('/') && !/^https?:\/\//i.test(ds.path)
        ? basename(ds.path)
        : `${ds.id}.parquet`;
    return `CREATE TABLE IF NOT EXISTS ${ds.id} AS SELECT * FROM read_parquet('${'${origin}'}${'${dataPath}'}${file}')`;
  }
  const file =
    ds.path && !ds.path.includes('/') && !/^https?:\/\//i.test(ds.path)
      ? basename(ds.path)
      : `${ds.id}.csv`;
  return `CREATE TABLE IF NOT EXISTS ${ds.id} AS SELECT * FROM read_csv_auto('${'${origin}'}${'${dataPath}'}${file}')`;
}

/**
 * Generate Vite-entry main.ts: DuckDB-WASM → crossfilter → dc.js charts.
 */
export function generateDcWasmMainScript(ctx: DcWasmGeneratorContext): string {
  const { spec } = ctx;
  const base = ctx.base || '/';
  const dataSources = [
    ...new Set(spec.charts.map((c) => c.dataSource).filter(Boolean)),
  ] as string[];

  const loadBlocks = spec.data
    .filter((ds) => dataSources.includes(ds.id))
    .map((ds) => {
      const sql = createTableSql(ds);
      return `  await conn.query(\`${sql}\`);
  {
    const table = await conn.query('SELECT * FROM ${ds.id}');
    const rows = table.toArray().map((row: { toJSON: () => Record<string, unknown> }) => row.toJSON());
    DATA['${ds.id}'] = rows;
  }`;
    })
    .join('\n');

  const cfSetup = dataSources
    .map((id) => {
      const safe = id.replace(/[^a-zA-Z0-9_]/g, '_');
      return `  const cf_${safe} = crossfilter(DATA['${id}'] || []);`;
    })
    .join('\n');

  const chartCode = spec.charts.map((c) => generateDcChartCode(c)).join('\n');

  return `import * as duckdb from '@duckdb/duckdb-wasm';
import duckdbWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import duckdbWasmEh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';
import * as d3 from 'd3';
import crossfilter from 'crossfilter2';
import * as dc from 'dc';

const DATA: Record<string, Record<string, unknown>[]> = {};

async function initDuckDB() {
  const bundles: duckdb.DuckDBBundles = {
    mvp: { mainModule: duckdbWasm, mainWorker: mvpWorker },
    eh: { mainModule: duckdbWasmEh, mainWorker: ehWorker },
  };
  const bundle = await duckdb.selectBundle(bundles);
  const worker = new Worker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  return db;
}

async function loadData(conn: duckdb.AsyncDuckDBConnection) {
  const base = '${base}';
  const dataPath = base.endsWith('/') ? base + 'data/' : base + '/data/';
  const origin = window.location.origin;
${loadBlocks}
}

async function main() {
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'Starting DuckDB-WASM...';

  try {
    const db = await initDuckDB();
    const conn = await db.connect();
    if (statusEl) statusEl.textContent = 'Loading data...';
    await loadData(conn);
    await conn.close();

    if (statusEl) statusEl.textContent = 'Creating visualizations...';
    const charts: unknown[] = [];

    dc.config.defaultColors(['#1e3a5f', '#7ba3c9', '#a89b8c', '#4a7c9b', '#c4b5a0', '#5c6b73']);

${cfSetup}

${chartCode}

    document.getElementById('reset-all')?.addEventListener('click', () => {
      dc.filterAll();
      dc.redrawAll();
    });

    dc.renderAll();
    if (statusEl) statusEl.textContent = 'Ready · DuckDB-WASM → crossfilter → dc.js';
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.textContent = 'Error: ' + (err instanceof Error ? err.message : String(err));
    }
  }
}

main();
`;
}

/**
 * Generate index.html shell for the DuckDB-WASM dc.js Vite app.
 */
export function generateDcWasmHTML(ctx: DcWasmGeneratorContext): string {
  const { spec } = ctx;
  const title = spec.meta?.title || 'Dashboard';
  const columns = spec.layout?.columns || 2;
  const gap = spec.layout?.gap || 20;
  const isFlex = spec.layout?.type === 'flex';
  const slots = spec.charts.map(chartSlot).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dc@4.2.7/dist/style/dc.min.css" />
  <style>
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
    ${isFlex ? `.charts > * { flex: 1 1 calc(50% - ${gap / 2}px); min-width: 280px; }` : ''}
    @media (max-width: 768px) {
      .charts { grid-template-columns: 1fr !important; }
    }
    .chart-container {
      border: 1px solid var(--line);
      border-radius: 4px;
      padding: 1rem 1rem 0.75rem;
      background: #fff;
      min-width: 0;
      overflow: hidden;
    }
    .chart-container h3 {
      margin: 0 0 0.55rem;
      font-size: 0.88rem;
      font-weight: 650;
    }
    .dc-chart { width: 100%; }
    .dc-chart svg { overflow: visible; }
    .dc-chart .number-display,
    .dc-chart span {
      font-family: Georgia, "Iowan Old Style", serif;
      font-size: clamp(2.4rem, 4vw, 3.25rem);
      font-weight: 600;
      color: var(--navy);
      letter-spacing: -0.03em;
      line-height: 1.1;
    }
    .dc-chart text {
      font-size: 11px;
      fill: var(--muted);
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
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(title)}</h1>
    ${spec.meta?.description ? `<p class="subtitle">${escapeHtml(spec.meta.description)}</p>` : ''}
    <div id="status">Initializing…</div>
    <div class="badge">dc.js · DuckDB-WASM · crossfilter · <span class="reset" id="reset-all">reset filters</span></div>
    <div class="charts">
    ${slots}
    </div>
    <footer>Built with dvfc · <a href="https://dc-js.github.io/dc.js/">dc.js</a> · DuckDB-WASM → crossfilter</footer>
  </div>
  <script type="module" src="/main.ts"></script>
</body>
</html>
`;
}
