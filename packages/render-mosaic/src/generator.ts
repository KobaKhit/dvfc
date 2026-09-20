/**
 * Code generator for Mosaic dashboards
 * Transforms DashboardSpec into executable vgplot code
 */

import type { DashboardSpec, ChartSpec } from '@dvfc/core';
import {
  getBuiltinChartTypeIds,
  getChartType,
  registerBuiltinChartTypes,
  registerChartType,
} from '@dvfc/core';
import { basename } from 'path';

import { generateNumberChart } from './charts/number.js';
import { generateTableChart } from './charts/table.js';
import { generateTextChart } from './charts/text.js';
import { generatePieChart } from './charts/pie.js';
import { generateHistogramChart } from './charts/histogram.js';
import { generateBoxplotChart } from './charts/boxplot.js';
import { generateDensityChart } from './charts/density.js';
import { generateStandardChart } from './charts/standard.js';
import { generateHTML as generateHTMLTemplate } from './template.js';
import { buildSelectionPlan, type SelectionPlan } from './selection-plan.js';

export interface GeneratorContext {
  spec: DashboardSpec;
  dataDir: string;
  outputDir: string;
  base?: string;
  selectionPlan?: SelectionPlan;
}

/** Generate index.html from dashboard spec (theme.chartBorders + embed mode preserved). */
export function generateHTML(ctx: GeneratorContext): string {
  attachBuiltinMosaicRenderers();
  return generateHTMLTemplate(ctx);
}

let mosaicRenderersAttached = false;

/** Attach built-in Mosaic renderMosaic implementations onto chart types (idempotent). */
export function attachBuiltinMosaicRenderers(): void {
  if (mosaicRenderersAttached) return;
  registerBuiltinChartTypes();
  for (const id of getBuiltinChartTypeIds()) {
    const existing = getChartType(id);
    if (!existing) continue;
    registerChartType({
      ...existing,
      renderMosaic(ctx) {
        const chart = ctx.chart as ChartSpec;
        const gctx = ctx.generatorContext as GeneratorContext | undefined;
        if (!gctx) {
          throw new Error(`Mosaic render for '${id}' requires generatorContext`);
        }
        return generateChartBuiltin(chart, gctx);
      },
    });
  }
  mosaicRenderersAttached = true;
}

/** Test helper */
export function _resetMosaicRendererAttachmentForTests(): void {
  mosaicRenderersAttached = false;
}

/**
 * Generate main.ts code from dashboard spec
 */
export function generateMainScript(ctx: GeneratorContext): string {
  attachBuiltinMosaicRenderers();
  const { spec } = ctx;
  const selectionPlan = buildSelectionPlan(spec);
  const genCtx: GeneratorContext = { ...ctx, selectionPlan };

  const chartCode = spec.charts.map(chart => generateChart(chart, genCtx)).join('\n\n  ');
  const urlSelections = selectionPlan.urlSelectionNames;

  return `import * as vg from '@uwdata/vgplot';
import { clausePoint } from '@uwdata/mosaic-core';

// Initialize Mosaic coordinator with DuckDB-WASM
vg.coordinator().databaseConnector(vg.wasmConnector());

function restoreStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const selections = {};
  
  for (const [key, value] of params.entries()) {
    try {
      selections[key] = JSON.parse(value);
    } catch (e) {
      console.warn(\`Failed to parse selection '\${key}' from URL\`, e);
    }
  }
  
  return selections;
}

async function loadData() {
  const base = '${ctx.base || '/'}';
  const dataPath = base.endsWith('/') ? base + 'data/' : base + '/data/';
  
${spec.data.map(ds => {
    // Find all moving_average overlays for this dataSource
    const maColumns = new Map<string, {field: string, window: number, xField: string}>();
    
    spec.charts.forEach(chart => {
      if (chart.dataSource === ds.id && chart.overlays && chart.encoding) {
        const xField = chart.encoding.x?.field;
        if (!xField) return;
        
        chart.overlays.forEach(overlay => {
          if (overlay.type === 'moving_average') {
            const field = overlay.field || chart.encoding!.y?.field;
            if (field) {
              const window = overlay.window || 7;
              const colName = `${field}_ma${window}`;
              maColumns.set(colName, { field, window, xField });
            }
          }
        });
      }
    });
    
    let createSql: string;
    if (ds.type === 'sql' && ds.sql) {
      // Rewrite bare filenames in SQL to origin+dataPath URLs for DuckDB-WASM
      const rewritten = ds.sql.replace(
        /(['"])([^'"/]+\.(?:csv|parquet|json|tsv))\1/gi,
        (_m, _q, file) => `'\${window.location.origin}\${dataPath}${file}'`
      );
      createSql = `CREATE TABLE IF NOT EXISTS ${ds.id} AS ${rewritten}`;
    } else if (ds.type === 'url' && ds.path && /^https?:\/\//i.test(ds.path)) {
      const url = ds.path.replace(/'/g, "''");
      const reader = /\.parquet(\?|$)/i.test(ds.path)
        ? `read_parquet('${url}')`
        : `read_csv_auto('${url}')`;
      createSql = `CREATE TABLE IF NOT EXISTS ${ds.id} AS SELECT * FROM ${reader}`;
    } else if (
      ds.type === 'parquet' ||
      (typeof ds.path === 'string' && /\.parquet$/i.test(ds.path))
    ) {
      const file =
        ds.path && !ds.path.includes('/') && !/^https?:\/\//i.test(ds.path)
          ? basename(ds.path)
          : `${ds.id}.parquet`;
      createSql = `CREATE TABLE IF NOT EXISTS ${ds.id} AS 
    SELECT * FROM read_parquet('\${window.location.origin}\${dataPath}${file}')`;
    } else {
      const file =
        ds.path && !ds.path.includes('/') && !/^https?:\/\//i.test(ds.path)
          ? basename(ds.path)
          : `${ds.id}.csv`;
      createSql = `CREATE TABLE IF NOT EXISTS ${ds.id} AS 
    SELECT * FROM read_csv_auto('\${window.location.origin}\${dataPath}${file}')`;
    }

    let sql = `  await vg.coordinator().exec(\`
    ${createSql}
  \`);`;
    
    if (maColumns.size > 0) {
      const maColumnsSQL = Array.from(maColumns.entries()).map(([colName, {field, window, xField}]) => 
        `AVG(${field}) OVER (ORDER BY ${xField} ROWS BETWEEN ${window - 1} PRECEDING AND CURRENT ROW) AS ${colName}`
      ).join(',\n      ');
      
      sql += `
  await vg.coordinator().exec(\`
    CREATE OR REPLACE TABLE ${ds.id} AS
    SELECT *,
      ${maColumnsSQL}
    FROM ${ds.id}
  \`);`;
    }
    
    return sql;
  }).join('\n')}
}

async function createDashboard() {
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'Loading data...';

  try {
    await loadData();
    if (statusEl) statusEl.textContent = 'Creating visualizations...';

    // Create selections (per-publisher crossfilters + include composites when shared)
    ${selectionPlan.declarations}

    function saveStateToURL() {
      const selections = {};
      ${urlSelections.map(sel =>
        `if (${sel}.value) selections['${sel}'] = ${sel}.value;`
      ).join('\n      ')}
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(selections)) {
        if (value) params.set(key, JSON.stringify(value));
      }
      const newURL = params.toString()
        ? \`\${window.location.pathname}?\${params}\`
        : window.location.pathname;
      window.history.replaceState({}, '', newURL);
    }
    
    const savedSelections = restoreStateFromURL();
    ${urlSelections.map(sel =>
      `if (savedSelections['${sel}']) ${sel}.update(savedSelections['${sel}']);`
    ).join('\n    ')}
    
    ${urlSelections.map(sel =>
      `${sel}.addEventListener('value', () => setTimeout(saveStateToURL, 100));`
    ).join('\n    ')}

    // Soft opacity pulse while Mosaic marks requery (pairs with vg.Fixed domains)
    let __filterPulseTimer;
    const __pulseFilters = () => {
      document.querySelectorAll('.chart-container').forEach((el) => el.classList.add('dvfc-filtering'));
      clearTimeout(__filterPulseTimer);
      __filterPulseTimer = setTimeout(() => {
        document.querySelectorAll('.chart-container').forEach((el) => el.classList.remove('dvfc-filtering'));
      }, 280);
    };
    ${urlSelections.map(sel => `${sel}.addEventListener('value', __pulseFilters);`).join('\n    ')}

    // Create charts
    ${chartCode}

    if (statusEl) {
      statusEl.textContent = 'Dashboard ready. Brush series, click bars/tiles, or drag on scatter to filter. Share the URL to keep filters.';
      statusEl.style.color = 'green';
    }
  } catch (error) {
    console.error('Error:', error);
    if (statusEl) {
      statusEl.textContent = \`❌ Error: \${error instanceof Error ? error.message : String(error)}\`;
      statusEl.style.color = 'red';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createDashboard);
} else {
  createDashboard();
}
`;
}

/**
 * Generate code for a single chart (built-in implementation).
 * Prefer generateChart() which routes through the chart-type registry.
 */
export function generateChartBuiltin(chart: ChartSpec, ctx: GeneratorContext): string {
  if (chart.type === 'number') {
    return generateNumberChart(chart, ctx);
  }
  
  if (chart.type === 'table') {
    return generateTableChart(chart, ctx);
  }
  
  if (chart.type === 'text') {
    return generateTextChart(chart, ctx);
  }
  
  if (chart.type === 'pie' || chart.type === 'donut') {
    return generatePieChart(chart, ctx);
  }
  
  if (chart.type === 'histogram') {
    return generateHistogramChart(chart, ctx);
  }
  
  if (chart.type === 'boxplot') {
    return generateBoxplotChart(chart, ctx);
  }
  
  if (chart.type === 'density') {
    return generateDensityChart(chart, ctx);
  }
  
  return generateStandardChart(chart, ctx);
}

/**
 * Route chart codegen through the chart-type registry (plugins + builtins).
 */
export function generateChart(chart: ChartSpec, ctx: GeneratorContext): string {
  attachBuiltinMosaicRenderers();
  const plugin = getChartType(chart.type);
  if (!plugin?.renderMosaic) {
    throw new Error(`No Mosaic renderer registered for chart type '${chart.type}'`);
  }
  const out = plugin.renderMosaic({
    chart,
    tableName: chart.dataSource,
    generatorContext: ctx,
  });
  if (typeof out !== 'string' || out.length === 0) {
    throw new Error(`Mosaic renderer for '${chart.type}' returned empty output`);
  }
  return out;
}
