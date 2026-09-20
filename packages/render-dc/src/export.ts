/**
 * Export a dash/chart as a self-contained dc.js HTML page.
 */

import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { dirname, join, resolve as resolvePath, basename } from 'node:path';
import { parse as parseCSV } from 'csv-parse/sync';
import type { ChartSpec, DashboardSpec } from '@dvfc/core';
import {
  normalizeFile,
  filterSpecToChart,
  type NormalizeResult,
} from '@dvfc/core';
import { generateDcHtml } from './html.js';

export { generateDcHtml } from './html.js';
export { generateDcChartCode } from './charts.js';

export interface DcExportOptions {
  outFile?: string;
  chartId?: string;
  projectRoot?: string;
  normalized?: NormalizeResult;
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
  candidates.push(join(stageDir, `${ds.id}.csv`));
  if (ds.path) {
    candidates.push(join(stageDir, basename(ds.path)));
  }

  for (const dest of [...new Set(candidates.filter(Boolean))]) {
    try {
      if (dest.endsWith('.parquet')) {
        throw new Error(
          `Parquet at ${dest}: dc.js export requires CSV. Convert or provide CSV.`
        );
      }
      const text = await readFile(dest, 'utf-8');
      return parseCSV(text, {
        columns: true,
        skip_empty_lines: true,
        cast: true,
      }) as Record<string, unknown>[];
    } catch (e) {
      if (e instanceof Error && e.message.includes('Parquet')) throw e;
    }
  }
  throw new Error(
    `Could not load CSV for data source '${ds.id}' (chart ${chart.id})`
  );
}

/**
 * Build a dc.js HTML dashboard (or single chart) from a spec path.
 */
export async function exportDcDashboard(
  specPath: string,
  options: DcExportOptions = {}
): Promise<string> {
  const normalized =
    options.normalized ?? (await normalizeFile(specPath, options.projectRoot));
  let { spec, assets } = normalized;

  if (options.chartId) {
    const filtered = filterSpecToChart(spec, assets, options.chartId);
    spec = filtered.spec;
    assets = filtered.assets;
  }

  if (spec.charts.length === 0) {
    throw new Error('No charts to export');
  }

  const outFile =
    options.outFile ||
    `${(spec.meta?.title || 'dash').replace(/[^\w.-]+/g, '_')}.dc.html`;

  const stageDir = join(dirname(resolvePath(outFile)), '.dvfc-dc-data');
  await mkdir(stageDir, { recursive: true });
  const assetMap = new Map<string, string>();

  for (const a of assets) {
    const dest = join(stageDir, a.destName);
    await cp(a.absPath, dest, { dereference: true, force: true });
    assetMap.set(a.destName.replace(/\.[^.]+$/, ''), dest);
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

  const valuesBySource = new Map<string, Record<string, unknown>[]>();
  for (const chart of spec.charts) {
    if (!chart.dataSource || chart.type === 'text') continue;
    if (valuesBySource.has(chart.dataSource)) continue;
    valuesBySource.set(
      chart.dataSource,
      await loadValuesForChart(spec, chart, stageDir, assetMap)
    );
  }

  const html = generateDcHtml(spec, valuesBySource);
  await mkdir(dirname(resolvePath(outFile)), { recursive: true });
  await writeFile(outFile, html);
  return outFile;
}
