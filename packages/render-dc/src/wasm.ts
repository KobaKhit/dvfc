/**
 * DuckDB-WASM + dc.js dashboard codegen (Vite-bundled).
 * Loads CSV/Parquet via DuckDB, materializes rows into crossfilter, then dc.js charts.
 */

import type { DashboardSpec, DataSource } from '@dvfc/core';
import { duckDbCreateTableSql } from '@dvfc/core';
import { generateDcChartCode } from './charts.js';
import { DVFC_TIP_JS } from './tips.js';
import { buildDcPage } from './shell.js';

export interface DcWasmGeneratorContext {
  spec: DashboardSpec;
  /** Public base path (e.g. `/` or `/dvfc/`) */
  base?: string;
}

/** SQL with `${origin}` / `${dataPath}` left for the generated main.ts template. */
function createTableSql(ds: DataSource): string {
  return duckDbCreateTableSql(ds, { pathPrefix: '${origin}${dataPath}' });
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

    function dvfcSize(sel: string, fallbackW: number, fallbackH: number) {
      const host = document.querySelector(sel) as HTMLElement | null;
      const w = Math.max(160, Math.floor((host && host.clientWidth) || fallbackW));
      const rawH = host ? host.clientHeight : 0;
      const h = rawH > 48 ? rawH : fallbackH;
      return { w, h };
    }
${DVFC_TIP_JS}

    dc.config.defaultColors(['#1e3a5f', '#7ba3c9', '#a89b8c', '#4a7c9b', '#c4b5a0', '#5c6b73']);

${cfSetup}

${chartCode}

    document.getElementById('reset-all')?.addEventListener('click', () => {
      dc.filterAll();
      dc.redrawAll();
    });

    dc.renderAll();
    dvfcInstallTips();
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
  return buildDcPage({
    spec: ctx.spec,
    preBadgeHtml: '<div id="status">Initializing…</div>',
    badgeHtml:
      'dc.js · DuckDB-WASM · crossfilter · <span class="reset" id="reset-all">reset filters</span>',
    footerHtml:
      'Built with dvfc · <a href="https://dc-js.github.io/dc.js/">dc.js</a> · DuckDB-WASM → crossfilter',
    scriptsHtml: '<script type="module" src="/main.ts"></script>',
  });
}
