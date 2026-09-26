/**
 * Dash compose + chart extract helpers
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, resolve as resolvePath, relative, basename } from 'path';
import { stringify as stringifyYAML } from 'yaml';
import type { ChartIR, DashIR, DataSource } from '@dvfc/core';
import { parseSpecString, isDashChartRef } from '@dvfc/core';
import { searchCharts } from './discovery.js';

export interface ComposeDashOptions {
  chartIds: string[];
  title?: string;
  description?: string;
  outFile?: string;
  autoCoordination?: boolean;
}

function isChartFilePath(file: string): boolean {
  const base = basename(file);
  return /\.chart\.(yaml|yml|json|toml)$/i.test(base) || base.endsWith('.chart.yaml');
}

/**
 * Compose a dash YAML from chart ids / display keys.
 * - Atomic *.chart.yaml hits become resolvable relative path refs.
 * - Inline dash charts are copied into the composed dash (with shared data sources).
 * Requires an exact displayKey or chartId match (never falls back to first search hit).
 */
export async function composeDash(
  projectRoot: string,
  options: ComposeDashOptions
): Promise<{ dash: DashIR; outPath: string }> {
  const out = options.outFile || 'composed.dash.yaml';
  const outPath = out.startsWith('/') ? out : join(projectRoot, out);
  const outDir = dirname(outPath);

  const charts: DashIR['charts'] = [];
  const dataById = new Map<string, DataSource>();

  for (const id of options.chartIds) {
    const q = id.includes('__') ? id.split('__').pop()! : id;
    const hits = await searchCharts({
      projectRoot,
      query: q,
      all: true,
    });
    const byKey = hits.filter((h) => h.displayKey === id);
    const byId = hits.filter((h) => h.chartId === id);
    let exact = byKey[0];
    if (!exact && byId.length === 1) {
      exact = byId[0];
    } else if (!exact && byId.length > 1) {
      throw new Error(
        `Ambiguous chart reference '${id}'. Multiple matches: ${byId.map((h) => h.displayKey).join(', ')}`
      );
    }
    if (!exact) {
      throw new Error(
        `No chart found for '${id}'. Use a display key (dash__chartId) or unique chart id.`
      );
    }

    const absSource = resolvePath(projectRoot, exact.dashPath);
    const content = await readFile(absSource, 'utf-8');
    const parsed = parseSpecString(content, { path: absSource });

    if (parsed.kind === 'chart' || isChartFilePath(exact.dashPath)) {
      // Prefer path ref so normalize can re-resolve data connectors from the chart file dir
      const rel = relative(projectRoot, absSource).replace(/\\/g, '/');
      charts.push({ chart: rel, id: exact.chartId });
      continue;
    }

    if (parsed.kind !== 'dash') {
      throw new Error(`Unsupported source for compose: ${exact.dashPath}`);
    }

    const entry = parsed.dash.charts.find((c) => {
      if (isDashChartRef(c)) return (c.id || c.chart) === exact.chartId;
      return c.id === exact.chartId;
    });
    if (!entry) {
      throw new Error(`Chart '${exact.chartId}' not found in ${exact.dashPath}`);
    }

    if (isDashChartRef(entry)) {
      // Nested ref: keep as path if it looks like a file, else search again by chart id
      if (entry.chart.includes('/') || entry.chart.includes('.')) {
        charts.push({ ...entry, id: entry.id || exact.chartId });
      } else {
        const nested = await searchCharts({
          projectRoot,
          query: entry.chart,
          all: true,
        });
        const nestedExact = nested.find(
          (h) => h.chartId === entry.chart || h.displayKey.endsWith(`__${entry.chart}`)
        );
        if (!nestedExact) {
          throw new Error(`Could not resolve nested chart ref '${entry.chart}'`);
        }
        if (isChartFilePath(nestedExact.dashPath)) {
          const rel = relative(projectRoot, resolvePath(projectRoot, nestedExact.dashPath)).replace(
            /\\/g,
            '/'
          );
          charts.push({ chart: rel, id: exact.chartId });
        } else {
          throw new Error(
            `Chart ref '${entry.chart}' points at an inline dash chart; extract it first`
          );
        }
      }
      continue;
    }

    // Inline ChartIR — copy into composed dash and pull referenced data sources
    const chart: ChartIR = { ...entry, id: exact.chartId };
    charts.push(chart);
    if (chart.dataSource && parsed.dash.data) {
      const ds = parsed.dash.data.find((d) => d.id === chart.dataSource);
      if (ds && !dataById.has(ds.id)) {
        if (ds.path && !ds.path.startsWith('/') && !/^https?:\/\//i.test(ds.path)) {
          const absData = resolvePath(dirname(absSource), ds.path);
          // Paths in the composed file are resolved against the composed file's directory
          const relData = relative(outDir, absData).replace(/\\/g, '/');
          dataById.set(ds.id, { ...ds, path: relData });
        } else {
          dataById.set(ds.id, { ...ds });
        }
      }
    }
  }

  const dash: DashIR = {
    id:
      (options.title || 'composed')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'composed',
    title: options.title || 'Composed dash',
    description:
      options.description || `Composed from ${options.chartIds.length} charts`,
    version: '0.1.0',
    coordination: { auto: options.autoCoordination !== false },
    data: dataById.size > 0 ? [...dataById.values()] : undefined,
    charts,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, stringifyYAML(dash));
  return { dash, outPath };
}

/**
 * Extract inline charts from a dash into *.chart.yaml files
 */
export async function extractChartsFromDash(
  dashPath: string,
  outDir: string
): Promise<string[]> {
  const abs = resolvePath(dashPath);
  const content = await readFile(abs, 'utf-8');
  const parsed = parseSpecString(content, { path: abs });
  if (parsed.kind !== 'dash') {
    throw new Error('extract requires a *.dash.yaml file');
  }
  const dash = parsed.dash;

  await mkdir(outDir, { recursive: true });
  const written: string[] = [];

  for (const entry of dash.charts) {
    if (isDashChartRef(entry)) {
      continue;
    }
    const chart: ChartIR = { ...entry };
    const file = join(outDir, `${chart.id}.chart.yaml`);
    await writeFile(file, stringifyYAML(chart));
    written.push(file);
  }

  return written;
}
