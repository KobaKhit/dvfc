/**
 * Mutate chart/dash YAML files (shared by MCP create/update/coordination tools).
 * Operates on Chart/Dash IR via interpretSpec.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import {
  interpretSpec,
  isDashChartRef,
  type ChartIR,
  type ChartSpec,
  type DashboardSpec,
  type DashIR,
} from '@dvfc/core';

function chartIdsFromDash(dash: DashIR): string[] {
  return dash.charts.map((c) => (isDashChartRef(c) ? c.id || c.chart : c.id));
}

function findInlineChartIndex(dash: DashIR, chartId: string): number {
  return dash.charts.findIndex(
    (c) => !isDashChartRef(c) && (c as ChartIR).id === chartId
  );
}

function validateChartEncoding(chart: Pick<ChartSpec, 'type' | 'encoding'>): void {
  const enc = chart.encoding;
  if (!enc) throw new Error('Chart requires encoding');
  if (['line', 'bar', 'scatter', 'area', 'pie', 'donut'].includes(chart.type)) {
    if (!enc.x || !enc.y) {
      throw new Error(`Chart type '${chart.type}' requires both x and y encoding`);
    }
  }
}

export async function addChartToSpecFile(
  specPath: string,
  chart: ChartSpec
): Promise<void> {
  if (!chart.id || !chart.type || !chart.dataSource || !chart.encoding) {
    throw new Error('Chart must have id, type, dataSource, and encoding');
  }
  validateChartEncoding(chart);

  const content = await readFile(specPath, 'utf-8');
  const raw = parseYAML(content) as unknown;
  const parsed = interpretSpec(raw, { path: specPath });

  if (parsed.kind === 'dash') {
    const dash = parsed.dash;
    if (chartIdsFromDash(dash).includes(chart.id)) {
      throw new Error(`Chart with id '${chart.id}' already exists`);
    }
    const dataIds = new Set((dash.data ?? []).map((d) => d.id));
    if (dataIds.size > 0 && !dataIds.has(chart.dataSource)) {
      throw new Error(`Data source '${chart.dataSource}' not found`);
    }
    const entry: ChartIR = {
      id: chart.id,
      type: chart.type,
      dataSource: chart.dataSource,
      title: chart.title,
      encoding: chart.encoding,
      interaction: chart.interaction
        ? {
            brush: chart.interaction.brush,
            brushAxis: chart.interaction.brushAxis,
            publishes: chart.interaction.publishes ?? chart.interaction.selection,
            filterBy: chart.interaction.filterBy,
          }
        : undefined,
      overlays: chart.overlays,
      width: chart.width,
      height: chart.height,
    };
    dash.charts.push(entry);
    await writeFile(specPath, stringifyYAML(dash));
    return;
  }

  if (parsed.kind === 'chart') {
    throw new Error('Cannot add a chart to a standalone *.chart.yaml; use a *.dash.yaml');
  }

  throw new Error('Unrecognized spec shape');
}

export async function updateChartInSpecFile(
  specPath: string,
  chartId: string,
  updates: Partial<ChartSpec>
): Promise<void> {
  const content = await readFile(specPath, 'utf-8');
  const raw = parseYAML(content) as unknown;
  const parsed = interpretSpec(raw, { path: specPath });

  if (parsed.kind === 'dash') {
    const dash = parsed.dash;
    const idx = findInlineChartIndex(dash, chartId);
    if (idx === -1) throw new Error(`Chart '${chartId}' not found`);
    const existing = dash.charts[idx] as ChartIR;
    if (updates.id && updates.id !== chartId) {
      if (chartIdsFromDash(dash).includes(updates.id)) {
        throw new Error(`Chart with id '${updates.id}' already exists`);
      }
    }
    if (updates.dataSource) {
      const dataIds = new Set((dash.data ?? []).map((d) => d.id));
      if (dataIds.size > 0 && !dataIds.has(updates.dataSource)) {
        throw new Error(`Data source '${updates.dataSource}' not found`);
      }
    }
    const merged: ChartIR = {
      ...existing,
      ...updates,
      type: (updates.type as string) || existing.type,
      interaction: updates.interaction
        ? {
            brush: updates.interaction.brush,
            brushAxis: updates.interaction.brushAxis,
            publishes: updates.interaction.publishes ?? updates.interaction.selection,
            filterBy: updates.interaction.filterBy,
          }
        : existing.interaction,
    };
    dash.charts[idx] = merged;
    await writeFile(specPath, stringifyYAML(dash));
    return;
  }

  throw new Error('Unrecognized spec shape');
}

export async function explainCoordination(specPath: string): Promise<string> {
  const content = await readFile(specPath, 'utf-8');
  const raw = parseYAML(content) as unknown;
  const parsed = interpretSpec(raw, { path: specPath });

  let spec: DashboardSpec;
  if (parsed.kind === 'dash') {
    try {
      const { dashToDashboardSpec } = await import('@dvfc/core');
      spec = dashToDashboardSpec(parsed.dash);
    } catch {
      // Refs or connectors need full normalize
      const { normalizeFile } = await import('@dvfc/core');
      spec = (await normalizeFile(specPath)).spec;
    }
  } else if (parsed.kind === 'chart') {
    const { chartIRToDashboardSpec } = await import('@dvfc/core');
    spec = chartIRToDashboardSpec(parsed.chart);
  } else {
    throw new Error('Unrecognized spec shape');
  }

  const selections = new Map<string, ChartSpec>();
  spec.charts.forEach((chart) => {
    if (chart.interaction?.selection) {
      selections.set(chart.interaction.selection, chart);
    }
  });

  const filtered = new Map<string, ChartSpec[]>();
  spec.charts.forEach((chart) => {
    if (chart.interaction?.filterBy) {
      const list = filtered.get(chart.interaction.filterBy) || [];
      list.push(chart);
      filtered.set(chart.interaction.filterBy, list);
    }
  });

  let explanation = 'Dashboard Coordination Map\n\n';
  if (selections.size === 0) {
    explanation += 'No interactive selections defined.\n';
  } else {
    explanation += 'Brush Selections:\n';
    selections.forEach((chart, name) => {
      explanation += `\n• ${name} (from chart: ${chart.id})\n`;
      const filteredCharts = filtered.get(name) || [];
      if (filteredCharts.length > 0) {
        explanation += `  Filters these charts:\n`;
        filteredCharts.forEach((fc) => {
          explanation += `  - ${fc.id} (${fc.type})\n`;
        });
      } else {
        explanation += `  Warning: No charts filter by this selection\n`;
      }
    });
  }
  return explanation;
}

export async function applyFilterPlan(
  specPath: string,
  plan: { brushChart: string; selectionName: string; filteredCharts: string[] }
): Promise<void> {
  const content = await readFile(specPath, 'utf-8');
  const raw = parseYAML(content) as unknown;
  const parsed = interpretSpec(raw, { path: specPath });

  if (parsed.kind === 'dash') {
    const dash = parsed.dash;
    const brushIdx = findInlineChartIndex(dash, plan.brushChart);
    if (brushIdx === -1) throw new Error(`Brush chart '${plan.brushChart}' not found`);
    const brush = dash.charts[brushIdx] as ChartIR;
    brush.interaction = {
      ...(brush.interaction ?? {}),
      brush: true,
      publishes: plan.selectionName,
    };
    for (const chartId of plan.filteredCharts) {
      const idx = findInlineChartIndex(dash, chartId);
      if (idx >= 0) {
        const chart = dash.charts[idx] as ChartIR;
        chart.interaction = {
          ...(chart.interaction ?? {}),
          filterBy: plan.selectionName,
        };
      }
    }
    await writeFile(specPath, stringifyYAML(dash));
    return;
  }

  throw new Error('Unrecognized spec shape');
}
