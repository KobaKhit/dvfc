/**
 * Resolve DataRef connectors and normalize Chart/Dash IR → DashboardSpec
 * for the Mosaic HTML generator.
 */

import { readFile, access } from 'fs/promises';
import { dirname, join, resolve as resolvePath, basename, extname } from 'path';
import { glob } from 'glob';
import { parse as parseYAML } from 'yaml';
import type { DashboardSpec, DataSource, ChartSpec } from './types.js';
import type { ChartIR, DataRef } from './ir.js';
import { interactionToRuntime } from './compat.js';
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
function dbtStubCandidates(opts: {
  specDir: string;
  projectRoot?: string;
  dbtStubDir?: string;
}): string[] {
  const root = opts.projectRoot ?? opts.specDir;
  return [
    opts.dbtStubDir,
    join(opts.specDir, 'dbt-stub'),
    join(root, 'dbt-stub'),
    join(opts.specDir, '../sales-dash/dbt-stub'),
    join(opts.specDir, '../dbt-jaffle/dbt-stub'),
    join(opts.specDir, '../dbt-stub'),
    join(root, 'examples/sales-dash/dbt-stub'),
    join(root, 'examples/revenue-analysis/dbt-stub'),
    join(root, 'examples/dbt-jaffle/dbt-stub'),
    join(root, 'examples/web-analytics/dbt-stub'),
  ].filter((c): c is string => Boolean(c));
}

export async function findDbtStubDir(opts: {
  specDir: string;
  projectRoot?: string;
  dbtStubDir?: string;
}): Promise<string | null> {
  const candidates = dbtStubCandidates(opts);

  for (const c of candidates) {
    if (await fileExists(join(c, 'manifest.json'))) return c;
  }
  for (const c of candidates) {
    if (await fileExists(c)) return c;
  }
  return null;
}

/** Resolve a dbt model CSV under candidate stub dirs (searches all stubs, not just the first). */
export async function findDbtModelCsv(
  model: string,
  opts: NormalizeOptions
): Promise<string | null> {
  const candidates: string[] = [];
  for (const stub of dbtStubCandidates(opts)) {
    candidates.push(join(stub, `${model}.csv`), join(stub, `${model}.parquet`));
  }
  for (const c of [...new Set(candidates)]) {
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
  opts: NormalizeOptions & { relationId?: string }
): Promise<ResolvedRelation> {
  const id = opts.relationId ?? safeId(idHint);
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
      const ext = extname(absPath).toLowerCase() || '.csv';
      const destName = `${id}${ext}`;
      return {
        id,
        source: { id, type: 'dbt', model, path: destName },
        assets: [{ absPath, destName }],
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
        let absPath = resolvePath(opts.specDir, rel);
        if (!(await fileExists(absPath))) {
          absPath = resolvePath(opts.projectRoot ?? opts.specDir, rel);
        }
        if (!(await fileExists(absPath)) && !rel.includes('/') && !rel.includes('\\')) {
          // Bare filename: try dbt stub CSVs (semantic SQL fixtures often quote model CSVs)
          const model = basename(rel, extname(rel));
          const stubCsv = await findDbtModelCsv(model, opts);
          if (stubCsv) absPath = stubCsv;
        }
        if (!(await fileExists(absPath))) {
          throw new Error(`SQL references missing file: ${rel}`);
        }
        const destName = basename(absPath);
        assets.push({ absPath, destName });
        sql = sql.split(rel).join(destName);
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

/** Map a dash DataSource onto a DataRef for shared resolution. */
export function dataSourceToRef(ds: DataSource): DataRef {
  if (ds.type === 'dbt' && ds.model) {
    return { type: 'dbt', model: ds.model };
  }
  if (ds.type === 'sql' && ds.sql) {
    return { type: 'sql', sql: ds.sql };
  }
  if (ds.path) {
    return { type: 'data', path: ds.path };
  }
  throw new Error(`Data source '${ds.id}' needs model, sql, or path`);
}

/** Resolve a shared dash.data entry, preserving its declared id. */
export async function resolveDataSource(
  ds: DataSource,
  opts: NormalizeOptions
): Promise<ResolvedRelation> {
  const ref = dataSourceToRef(ds);
  return resolveDataRef(ref, ds.id, { ...opts, relationId: ds.id });
}

function chartIRToLegacy(chart: ChartIR, dataSourceId: string): ChartSpec {
  return {
    id: chart.id,
    type: chart.type as ChartSpec['type'],
    dataSource: chart.type === 'text' ? undefined : dataSourceId,
    title: chart.title,
    encoding: chart.encoding,
    content: chart.content,
    interaction: interactionToRuntime(chart.interaction),
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

  const preferred = [
    join(projectRoot, 'charts', `${chartRef}.chart.yaml`),
    join(projectRoot, 'charts', `${chartRef}.chart.yml`),
    join(projectRoot, 'examples/charts', `${chartRef}.chart.yaml`),
    join(projectRoot, 'examples/charts', `${chartRef}.chart.yml`),
  ];
  for (const pref of preferred) {
    if (await fileExists(pref)) return pref;
  }

  const patterns = [
    `**/${chartRef}.chart.yaml`,
    `**/${chartRef}.chart.yml`,
    `**/charts/${chartRef}.yaml`,
  ];
  const allHits: string[] = [];
  for (const pattern of patterns) {
    const hits = await glob(pattern, {
      cwd: projectRoot,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    });
    allHits.push(...hits);
  }
  const unique = [...new Set(allHits)];
  if (unique.length === 1) return unique[0];
  if (unique.length > 1) {
    const rel = unique.map((h) => h.replace(projectRoot + '/', ''));
    throw new Error(
      `Ambiguous chart ref '${chartRef}'. Multiple matches: ${rel.join(', ')}`
    );
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

  // Shared dash.data — same resolver as chart connectors
  for (const ds of dash.data ?? []) {
    const localOpts: NormalizeOptions = { ...opts, specDir: dashDir, projectRoot };
    const resolved = await resolveDataSource(ds, localOpts);
    dataAcc.set(resolved.id, resolved);
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

/** Re-export Mosaic converter for callers that already import from normalize */
export { dashToDashboardSpec } from './compat.js';

/**
 * Narrow a normalized dash to a single chart and its data/assets.
 * Shared by HTML build and Vega static export.
 */
export function filterSpecToChart(
  spec: DashboardSpec,
  assets: FileAsset[],
  chartId: string
): { spec: DashboardSpec; assets: FileAsset[] } {
  const chart = spec.charts.find((c) => c.id === chartId);
  if (!chart) throw new Error(`Chart '${chartId}' not found`);
  const data = spec.data.filter((ds) => !chart.dataSource || ds.id === chart.dataSource);
  const dataIds = new Set(data.map((d) => d.id));
  const filteredAssets = assets.filter((a) =>
    [...dataIds].some(
      (id) =>
        a.destName === `${id}.csv` ||
        a.destName === `${id}.parquet` ||
        a.destName.startsWith(`${id}.`) ||
        a.destName.startsWith(id)
    )
  );
  return {
    spec: { ...spec, charts: [chart], data },
    assets: filteredAssets,
  };
}
