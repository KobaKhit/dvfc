/**
 * Resolve DataRef connectors and normalize Chart/Dash IR → DashboardSpec
 * for the Mosaic HTML generator.
 */

import { readFile, access } from 'fs/promises';
import { dirname, join, resolve as resolvePath, basename, extname } from 'path';
import { glob } from 'glob';
import { parse as parseYAML } from 'yaml';
import type { DashboardSpec, DataSource, ChartSpec } from './types.js';
import type { ChartIR, DashIR, DataRef } from './ir.js';
import { isDashChartRef } from './ir.js';
import { interpretSpec } from './parse.js';

export interface FileAsset {
  /** Absolute source path */
  absPath: string;
  /** Filename written under build data/ */
  destName: string;
}

export interface ResolvedRelation {
  id: string;
  source: DataSource;
  /** Files to copy into data/ */
  assets: FileAsset[];
}

export interface NormalizeResult {
  spec: DashboardSpec;
  assets: FileAsset[];
  kind: 'chart' | 'dash';
}

export interface NormalizeOptions {
  /** Directory of the spec file */
  specDir: string;
  /** Project root for chart library lookup */
  projectRoot?: string;
  /** Optional dbt stub dir (default: specDir/dbt-stub) */
  dbtStubDir?: string;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Locate a dbt-stub directory (manifest.json + model CSVs).
 * Searches next to the spec, project root, and common example layouts.
 */
export async function findDbtStubDir(opts: {
  specDir: string;
  projectRoot?: string;
  dbtStubDir?: string;
}): Promise<string | null> {
  const root = opts.projectRoot ?? opts.specDir;
  const candidates = [
    opts.dbtStubDir,
    join(opts.specDir, 'dbt-stub'),
    join(root, 'dbt-stub'),
    join(opts.specDir, '../sales-board/dbt-stub'),
    join(opts.specDir, '../dbt-stub'),
    join(root, 'examples/sales-board/dbt-stub'),
    join(root, 'examples/revenue-analysis/dbt-stub'),
    join(root, 'examples/dbt-jaffle/dbt-stub'),
  ].filter((c): c is string => Boolean(c));

  for (const c of candidates) {
    if (await fileExists(join(c, 'manifest.json'))) return c;
  }
  for (const c of candidates) {
    if (await fileExists(c)) return c;
  }
  return null;
}

/** Resolve a dbt model CSV under candidate stub dirs */
export async function findDbtModelCsv(
  model: string,
  opts: NormalizeOptions
): Promise<string | null> {
  const stub = await findDbtStubDir(opts);
  const candidates = [
    stub ? join(stub, `${model}.csv`) : null,
    stub ? join(stub, `${model}.parquet`) : null,
    join(opts.dbtStubDir ?? join(opts.specDir, 'dbt-stub'), `${model}.csv`),
    join(opts.dbtStubDir ?? join(opts.specDir, 'dbt-stub'), `${model}.parquet`),
    join(opts.projectRoot ?? opts.specDir, 'examples/sales-board/dbt-stub', `${model}.csv`),
    join(opts.specDir, '../sales-board/dbt-stub', `${model}.csv`),
  ].filter((c): c is string => Boolean(c));

  for (const c of candidates) {
    if (await fileExists(c)) return c;
  }
  return null;
}

/** Extract string literals that look like file paths from SQL */
export function extractSqlFileRefs(sql: string): string[] {
  const refs: string[] = [];
  const re = /['"]([^'"]+\.(?:csv|parquet|json|tsv))['"]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    refs.push(m[1]);
  }
  return [...new Set(refs)];
}

function safeId(input: string): string {
  return input.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
}

export async function resolveDataRef(
  ref: DataRef,
  idHint: string,
  opts: NormalizeOptions
): Promise<ResolvedRelation> {
  const id = safeId(idHint);
  const dbtStub = opts.dbtStubDir ?? join(opts.specDir, 'dbt-stub');

  switch (ref.type) {
    case 'dbt': {
      const model = ref.model;
      const absPath = await findDbtModelCsv(model, opts);
      if (!absPath) {
        throw new Error(
          `dbt model CSV not found for '${model}' (looked under ${dbtStub} and example stubs)`
        );
      }
      return {
        id,
        source: { id, type: 'dbt', model },
        assets: [{ absPath, destName: `${id}.csv` }],
      };
    }
    case 'data': {
      if (!ref.path && !ref.table) {
        throw new Error('data ref requires path or table');
      }
      if (ref.table && !ref.path) {
        return {
          id,
          source: { id, type: 'sql', sql: `SELECT * FROM ${ref.table}` },
          assets: [],
        };
      }
      const path = ref.path!;
      // Remote URL, no local copy; DuckDB/Mosaic can read http(s) when available
      if (/^https?:\/\//i.test(path)) {
        return {
          id,
          source: { id, type: 'url', path },
          assets: [],
        };
      }
      const absPath = resolvePath(opts.specDir, path);
      if (!(await fileExists(absPath))) {
        throw new Error(`Data file not found: ${absPath}`);
      }
      const ext = extname(absPath).toLowerCase() || '.csv';
      const destName = `${id}${ext}`;
      const sourceType =
        ext === '.parquet' ? 'parquet' : ext === '.csv' || ext === '.tsv' ? 'csv' : 'csv';
      return {
        id,
        source: { id, type: sourceType, path: destName },
        assets: [{ absPath, destName }],
      };
    }
    case 'sql': {
      const fileRefs = extractSqlFileRefs(ref.sql);
      const assets: FileAsset[] = [];
      let sql = ref.sql;
      for (const rel of fileRefs) {
        const absPath = resolvePath(opts.specDir, rel);
        if (!(await fileExists(absPath))) {
          // try project root
          const alt = resolvePath(opts.projectRoot ?? opts.specDir, rel);
          if (!(await fileExists(alt))) {
            throw new Error(`SQL references missing file: ${rel}`);
          }
          const destName = basename(alt);
          assets.push({ absPath: alt, destName });
          sql = sql.split(rel).join(destName);
        } else {
          const destName = basename(absPath);
          assets.push({ absPath, destName });
          sql = sql.split(rel).join(destName);
        }
      }
      return {
        id,
        source: { id, type: 'sql', sql },
        assets:
          assets.length === 1
            ? [
                ...assets,
                // Alias so static exporters can load by data-source id
                { absPath: assets[0].absPath, destName: `${id}${extname(assets[0].absPath) || '.csv'}` },
              ]
            : assets,
      };
    }
    case 'dbt_metric': {
      const { compileDbtMetricSql } = await import('./metricflow.js');
      const { sql } = await compileDbtMetricSql(ref, {
        specDir: opts.specDir,
        projectRoot: opts.projectRoot,
        dbtStubDir: dbtStub,
      });
      return resolveDataRef({ type: 'sql', sql }, id, opts);
    }
    default:
      throw new Error(`Unknown data ref type`);
  }
}

function chartIRToLegacy(chart: ChartIR, dataSourceId: string): ChartSpec {
  return {
    id: chart.id,
    type: chart.type as ChartSpec['type'],
    dataSource: chart.type === 'text' ? undefined : dataSourceId,
    title: chart.title,
    encoding: chart.encoding,
    content: chart.content,
    interaction: chart.interaction
      ? {
          brush: chart.interaction.brush,
          brushAxis: chart.interaction.brushAxis,
          selection: chart.interaction.publishes ?? chart.interaction.selection,
          filterBy: chart.interaction.filterBy,
        }
      : undefined,
    overlays: chart.overlays,
    width: chart.width,
    height: chart.height,
  };
}

async function findChartFile(
  chartRef: string,
  projectRoot: string
): Promise<string | null> {
  // Absolute / relative path
  if (chartRef.includes('/') || chartRef.includes('\\') || chartRef.includes('.')) {
    const abs = resolvePath(projectRoot, chartRef);
    if (await fileExists(abs)) return abs;
    const withExt = [
      abs,
      `${abs}.chart.yaml`,
      `${abs}.yaml`,
      join(projectRoot, 'charts', `${chartRef}.chart.yaml`),
      join(projectRoot, 'examples/charts', `${chartRef}.chart.yaml`),
    ];
    for (const p of withExt) {
      if (await fileExists(p)) return p;
    }
  }

  const patterns = [
    `**/${chartRef}.chart.yaml`,
    `**/${chartRef}.chart.yml`,
    `**/charts/${chartRef}.yaml`,
  ];
  for (const pattern of patterns) {
    const hits = await glob(pattern, {
      cwd: projectRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    });
    if (hits[0]) return hits[0];
  }
  return null;
}

async function materializeChart(
  chart: ChartIR,
  opts: NormalizeOptions,
  dataAcc: Map<string, ResolvedRelation>
): Promise<ChartSpec> {
  if (chart.type === 'text') {
    return chartIRToLegacy(chart, '');
  }

  if (chart.dataSource && !chart.data) {
    return chartIRToLegacy(chart, chart.dataSource);
  }

  if (!chart.data) {
    throw new Error(`Chart '${chart.id}' needs data or dataSource`);
  }

  const relationId = `${safeId(chart.id)}_data`;
  const resolved = await resolveDataRef(chart.data, relationId, {
    ...opts,
    // If chart was loaded from another file, opts.specDir should be that file's dir
    specDir: opts.specDir,
  });
  dataAcc.set(resolved.id, resolved);
  return chartIRToLegacy(chart, resolved.id);
}

/**
 * Normalize any supported spec file content into Mosaic DashboardSpec + assets
 */
export async function normalizeToDashboard(
  raw: unknown,
  opts: NormalizeOptions & { path?: string }
): Promise<NormalizeResult> {
  const parsed = interpretSpec(raw, { path: opts.path });
  const projectRoot = opts.projectRoot ?? opts.specDir;
  const assets: FileAsset[] = [];
  const dataAcc = new Map<string, ResolvedRelation>();

  if (parsed.kind === 'chart') {
    const chartOpts = { ...opts, specDir: opts.path ? dirname(opts.path) : opts.specDir };
    // Fix: for chart file, data paths relative to chart file
    const chartFileDir = opts.path ? dirname(resolvePath(opts.path)) : opts.specDir;
    const localOpts = { ...opts, specDir: chartFileDir, projectRoot };
    const legacyChart = await materializeChart(parsed.chart, localOpts, dataAcc);
    for (const rel of dataAcc.values()) {
      assets.push(...rel.assets);
    }
    const spec: DashboardSpec = {
      meta: {
        title: parsed.chart.title ?? parsed.chart.id,
        description: parsed.chart.description,
        version: '0.1.0',
      },
      data: [...dataAcc.values()].map((r) => r.source),
      charts: [legacyChart],
    };
    return { spec, assets, kind: 'chart' };
  }

  // dash
  const dash = parsed.dash;
  const dashDir = opts.path ? dirname(resolvePath(opts.path)) : opts.specDir;
  const charts: ChartSpec[] = [];

  // Keep shared dash.data (legacy style)
  for (const ds of dash.data ?? []) {
    if (ds.type === 'dbt' && ds.model) {
      const found = await findDbtModelCsv(ds.model, {
        ...opts,
        specDir: dashDir,
        projectRoot,
      });
      if (!found) {
        throw new Error(`dbt CSV for model '${ds.model}' not found`);
      }
      assets.push({ absPath: found, destName: `${ds.id}.csv` });
      dataAcc.set(ds.id, {
        id: ds.id,
        source: ds,
        assets: [{ absPath: found, destName: `${ds.id}.csv` }],
      });
    } else if (ds.type === 'sql' && ds.sql) {
      dataAcc.set(ds.id, { id: ds.id, source: ds, assets: [] });
    } else if (ds.path) {
      const absPath = resolvePath(dashDir, ds.path);
      assets.push({ absPath, destName: `${ds.id}${extname(ds.path) || '.csv'}` });
      dataAcc.set(ds.id, {
        id: ds.id,
        source: { ...ds, type: ds.type === 'url' ? 'url' : 'csv' },
        assets: [{ absPath, destName: `${ds.id}${extname(ds.path) || '.csv'}` }],
      });
    } else {
      dataAcc.set(ds.id, { id: ds.id, source: ds, assets: [] });
    }
  }

  for (const entry of dash.charts) {
    if (isDashChartRef(entry)) {
      const chartFile = await findChartFile(entry.chart, projectRoot);
      if (!chartFile) {
        throw new Error(`Dash '${dash.id}': chart ref '${entry.chart}' not found`);
      }
      const content = await readFile(chartFile, 'utf-8');
      const chartParsed = interpretSpec(parseYAML(content), {
        path: chartFile,
        prefer: 'chart',
      });
      if (chartParsed.kind !== 'chart') {
        throw new Error(`Invalid chart file for ref '${entry.chart}'`);
      }
      const chart = {
        ...chartParsed.chart,
        id: entry.id ?? chartParsed.chart.id,
        title: entry.title ?? chartParsed.chart.title,
      };
      const localOpts: NormalizeOptions = {
        ...opts,
        specDir: dirname(chartFile),
        projectRoot,
      };
      charts.push(await materializeChart(chart, localOpts, dataAcc));
    } else {
      const localOpts: NormalizeOptions = { ...opts, specDir: dashDir, projectRoot };
      if (entry.dataSource && !entry.data) {
        charts.push(chartIRToLegacy(entry, entry.dataSource));
      } else {
        charts.push(await materializeChart(entry, localOpts, dataAcc));
      }
    }
  }

  for (const rel of dataAcc.values()) {
    for (const a of rel.assets) {
      if (!assets.some((x) => x.destName === a.destName && x.absPath === a.absPath)) {
        assets.push(a);
      }
    }
  }

  const spec: DashboardSpec = {
    meta: {
      title: dash.title ?? dash.meta?.title ?? dash.id,
      description: dash.description ?? dash.meta?.description,
      version: dash.version ?? '0.1.0',
    },
    data: [...dataAcc.values()].map((r) => r.source),
    charts,
    layout: dash.layout,
    theme: dash.theme,
  };

  return { spec, assets, kind: 'dash' };
}

export async function normalizeFile(
  specPath: string,
  projectRoot?: string
): Promise<NormalizeResult> {
  const abs = resolvePath(specPath);
  const content = await readFile(abs, 'utf-8');
  const format = abs.endsWith('.toml')
    ? 'toml'
    : abs.endsWith('.json')
      ? 'json'
      : 'yaml';
  const { parseSpecContent } = await import('./parse.js');
  const raw = parseSpecContent(content, format);
  return normalizeToDashboard(raw, {
    path: abs,
    specDir: dirname(abs),
    projectRoot: projectRoot ?? dirname(abs),
  });
}

/** Re-export for callers that need dash → Mosaic DashboardSpec */
export { dashToDashboardSpec as legacyDashToBoard } from './compat.js';
