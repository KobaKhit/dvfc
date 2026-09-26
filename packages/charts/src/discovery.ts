/**
 * Chart discovery implementation
 */

import { readFile } from 'fs/promises';
import { glob } from 'glob';
import { basename, dirname, extname } from 'path';
import {
  parseSpecString,
  listInlineCharts,
  isDashChartRef,
  dashToDashboardSpec,
  chartIRToDashboardSpec,
  chartIRToChartSpec,
  type DashIR,
  type DashboardSpec,
} from '@dvfc/core';
import type { ChartHit, ChartRef, ChartResource, SearchOptions } from './types.js';

/**
 * Stable chart id for discovery display keys.
 * Prefer explicit id; for path refs use the chart filename stem (not the path).
 */
function chartIdFromRef(ref: { id?: string; chart: string }): string {
  if (ref.id) return ref.id;
  const chart = ref.chart;
  if (chart.includes('/') || chart.includes('\\') || chart.includes('.')) {
    const base = basename(chart);
    return base
      .replace(/\.chart\.(yaml|yml|json|toml)$/i, '')
      .replace(/\.(yaml|yml|json|toml)$/i, '');
  }
  return chart;
}

/**
 * Generate display key from dash path and chart id
 */
export function makeDisplayKey(dashPath: string, chartId: string): string {
  const dir = dirname(dashPath);
  let dashName = basename(dir);

  if (dashName === '.') {
    const filename = basename(dashPath, extname(dashPath));
    dashName =
      filename === 'board' || filename === 'dashboard' || filename === 'dash'
        ? 'default'
        : filename;
  }

  return `${dashName}__${chartId}`;
}

/**
 * Parse display key into components
 */
export function parseDisplayKey(displayKey: string): { dashName: string; chartId: string } | null {
  const parts = displayKey.split('__');
  if (parts.length !== 2) return null;
  return { dashName: parts[0], chartId: parts[1] };
}

function refChartStubs(dash: DashIR): DashboardSpec['charts'] {
  return dash.charts
    .filter((c) => isDashChartRef(c))
    .map((r) => ({
      id: chartIdFromRef(r),
      type: 'ref' as unknown as DashboardSpec['charts'][0]['type'],
      title: r.title || chartIdFromRef(r),
    }));
}

/** Loose inline mapping when dashToDashboardSpec rejects (e.g. missing dataSource). */
function inlineChartsLoose(dash: DashIR): DashboardSpec['charts'] {
  return listInlineCharts(dash).map((c) => chartIRToChartSpec(c));
}

function inlineChartsViaCore(dash: DashIR): DashboardSpec['charts'] {
  try {
    return dashToDashboardSpec({ ...dash, charts: listInlineCharts(dash) }).charts;
  } catch {
    return inlineChartsLoose(dash);
  }
}

/**
 * Load dashboard spec from file (normalized Mosaic shape for discovery listing).
 */
async function loadSpec(filePath: string): Promise<DashboardSpec> {
  const content = await readFile(filePath, 'utf-8');
  const parsed = parseSpecString(content, { path: filePath });

  if (parsed.kind === 'chart') {
    return chartIRToDashboardSpec(parsed.chart);
  }

  const dash = parsed.dash;
  const refs = refChartStubs(dash);

  if (refs.length === 0) {
    try {
      return dashToDashboardSpec(dash);
    } catch {
      return {
        meta: {
          title: dash.title || dash.id,
          version: dash.version || '0.1.0',
        },
        data: dash.data || [],
        charts: inlineChartsLoose(dash),
        layout: dash.layout,
        theme: dash.theme,
      };
    }
  }

  const inlineSpec = inlineChartsViaCore(dash);
  return {
    meta: {
      title: dash.title || dash.id,
      version: dash.version || '0.1.0',
    },
    data: dash.data || [],
    charts: [...inlineSpec, ...refs],
    layout: dash.layout,
    theme: dash.theme,
  };
}

/**
 * Search for charts across project
 */
export async function searchCharts(options: SearchOptions): Promise<ChartHit[]> {
  const {
    projectRoot,
    query,
    all = false,
    caseSensitive = false,
  } = options;
  const dashPath = options.dashPath;

  const pattern = dashPath ? dashPath : '**/{*.dash,*.chart}.{yaml,yml,json,toml}';

  const files = await glob(pattern, {
    cwd: projectRoot,
    absolute: false,
    ignore: ['node_modules/**', 'dist/**', '.git/**'],
  });

  const hits: ChartHit[] = [];
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  for (const file of files) {
    try {
      const spec = await loadSpec(`${projectRoot}/${file}`);

      if (!spec.charts) continue;

      for (const chart of spec.charts) {
        let score = 0;
        const chartTitle = chart.title || '';
        const chartId = chart.id;
        const chartType = chart.type;

        const fields = new Set<string>();
        if (chart.encoding?.x?.field) fields.add(chart.encoding.x.field);
        if (chart.encoding?.y?.field) fields.add(chart.encoding.y.field);

        const searchText = caseSensitive
          ? `${chartId} ${chartTitle} ${chartType} ${Array.from(fields).join(' ')}`
          : `${chartId} ${chartTitle} ${chartType} ${Array.from(fields).join(' ')}`.toLowerCase();

        if (searchText.includes(searchQuery)) {
          if (chartId === query) score = 100;
          else if (chartTitle.toLowerCase() === searchQuery) score = 90;
          else if (chartId.startsWith(query)) score = 80;
          else if (chartTitle.toLowerCase().startsWith(searchQuery)) score = 70;
          else if (chartType === searchQuery) score = 60;
          else if (Array.from(fields).some((f) => f.toLowerCase().includes(searchQuery)))
            score = 50;
          else if (chartId.includes(searchQuery)) score = 40;
          else if (chartTitle.toLowerCase().includes(searchQuery)) score = 30;
          else score = 20;

          hits.push({
            dashPath: file,
            chartId: chart.id,
            type: chart.type,
            title: chart.title,
            score,
            displayKey: makeDisplayKey(file, chart.id),
          });
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`Failed to parse ${file}: ${msg}`);
    }
  }

  hits.sort((a, b) => (b.score || 0) - (a.score || 0));
  return all ? hits : hits.slice(0, 10);
}

/**
 * Get chart with dash context
 */
export async function getChart(dashPath: string, chartId: string): Promise<ChartResource> {
  const spec = await loadSpec(dashPath);

  const chart = spec.charts.find((c) => c.id === chartId);
  if (!chart) {
    throw new Error(`Chart '${chartId}' not found in dash '${dashPath}'`);
  }

  return {
    chart: { ...chart },
    dashPath,
    displayKey: makeDisplayKey(dashPath, chartId),
    context: {
      dataSources: spec.data,
      theme: spec.theme,
      layout: spec.layout,
    },
  };
}

/**
 * List all charts, optionally filtered to a dash path
 */
export async function listCharts(projectRoot: string, dashPath?: string): Promise<ChartHit[]> {
  return searchCharts({
    projectRoot,
    query: '',
    dashPath,
    all: true,
  });
}

/**
 * Resolve chart reference from various forms
 * Supports: "chartId", "dashName__chartId", or explicit { dashPath, chartId }
 */
export async function resolveChartRef(
  projectRoot: string,
  refStr: string
): Promise<ChartRef> {
  const parsed = parseDisplayKey(refStr);
  if (parsed) {
    const hits = await searchCharts({
      projectRoot,
      query: parsed.chartId,
      all: true,
    });

    const match = hits.find((h) => {
      const dir = dirname(h.dashPath);
      const dashName = basename(dir);
      return dashName === parsed.dashName && h.chartId === parsed.chartId;
    });

    if (match) {
      return {
        dashPath: match.dashPath,
        chartId: match.chartId,
        displayKey: match.displayKey,
      };
    }
  }

  const hits = await searchCharts({
    projectRoot,
    query: refStr,
    all: true,
  });

  const exactMatches = hits.filter((h) => h.chartId === refStr);

  if (exactMatches.length === 0) {
    throw new Error(`Chart '${refStr}' not found`);
  }

  if (exactMatches.length > 1) {
    const candidates = exactMatches.map((h) => h.displayKey).join(', ');
    throw new Error(
      `Ambiguous chart reference '${refStr}'. Multiple matches found: ${candidates}. ` +
        `Use display key format (dashName__chartId) to disambiguate.`
    );
  }

  const hit = exactMatches[0];
  return {
    dashPath: hit.dashPath,
    chartId: hit.chartId,
    displayKey: hit.displayKey,
  };
}
