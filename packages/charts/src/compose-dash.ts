/**
 * Dash compose + chart extract helpers
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, resolve as resolvePath } from 'path';
import { stringify as stringifyYAML, parse as parseYAML } from 'yaml';
import type { ChartIR, DashIR } from '@dvfc/core';
import { interpretSpec, isDashChartRef, boardToDash } from '@dvfc/core';
import { searchCharts } from './discovery.js';

export interface ComposeDashOptions {
  chartIds: string[];
  title?: string;
  description?: string;
  outFile?: string;
  autoCoordination?: boolean;
}

/**
 * Compose a dash YAML from chart ids / display keys
 */
export async function composeDash(
  projectRoot: string,
  options: ComposeDashOptions
): Promise<{ dash: DashIR; outPath: string }> {
  const charts: DashIR['charts'] = [];

  for (const id of options.chartIds) {
    const q = id.includes('__') ? id.split('__').pop()! : id;
    const hits = await searchCharts({
      projectRoot,
      query: q,
      all: true,
    });
    const exact =
      hits.find((h) => h.displayKey === id || h.chartId === id) || hits[0];
    if (!exact) {
      throw new Error(`No chart found for '${id}'`);
    }
    charts.push({ chart: exact.chartId });
  }

  const dash: DashIR = {
    id:
      (options.title || 'composed')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'composed',
    title: options.title || 'Composed dash',
    description:
      options.description ||
      `Composed from ${options.chartIds.length} charts`,
    version: '0.1.0',
    coordination: { auto: options.autoCoordination !== false },
    charts,
  };

  const out = options.outFile || 'composed.dash.yaml';
  const outPath = out.startsWith('/') ? out : join(projectRoot, out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, stringifyYAML(dash));
  return { dash, outPath };
}

/**
 * Extract inline charts from a dash/board into *.chart.yaml files
 */
export async function extractChartsFromDash(
  dashPath: string,
  outDir: string
): Promise<string[]> {
  const abs = resolvePath(dashPath);
  const content = await readFile(abs, 'utf-8');
  const parsed = interpretSpec(parseYAML(content), { path: abs });
  const dash =
    parsed.kind === 'board'
      ? boardToDash(parsed.board)
      : parsed.kind === 'dash'
        ? parsed.dash
        : null;
  if (!dash) {
    throw new Error('extract requires a dash or legacy board');
  }

  await mkdir(outDir, { recursive: true });
  const written: string[] = [];
  const remaining: DashIR['charts'] = [];

  for (const entry of dash.charts) {
    if (isDashChartRef(entry)) {
      remaining.push(entry);
      continue;
    }
    const chart: ChartIR = { ...entry };
    const file = join(outDir, `${chart.id}.chart.yaml`);
    await writeFile(file, stringifyYAML(chart));
    written.push(file);
    remaining.push({ chart: chart.id });
  }

  return written;
}
