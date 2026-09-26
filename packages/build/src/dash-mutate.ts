/**
 * Mutate chart/dash YAML files (shared by MCP create/update/coordination tools).
 * Operates on Chart/Dash IR via parseSpecString.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { stringify as stringifyYAML } from 'yaml';
import {
  parseSpecString,
  isDashChartRef,
  chartIRToDashboardSpec,
  dashToDashboardSpec,
  normalizeFile,
  type ChartIR,
  type ChartSpec,
  type DashboardSpec,
  type DashIR,
  type DataRef,
} from '@dvfc/core';

function chartIdsFromDash(dash: DashIR): string[] {
  return dash.charts.map((c) => (isDashChartRef(c) ? c.id || c.chart : c.id));
}

function findInlineChartIndex(dash: DashIR, chartId: string): number {
  return dash.charts.findIndex(
    (c) => !isDashChartRef(c) && (c as ChartIR).id === chartId
  );
}

function validateChartEncoding(chart: Pick<ChartIR, 'type' | 'encoding'>): void {
  const enc = chart.encoding;
  if (!enc) throw new Error('Chart requires encoding');
  if (['line', 'bar', 'scatter', 'area', 'pie', 'donut'].includes(chart.type)) {
    if (!enc.x || !enc.y) {
      throw new Error(`Chart type '${chart.type}' requires both x and y encoding`);
    }
  }
}

/** Accept ChartIR-shaped input (data / publishes) or legacy ChartSpec (dataSource / selection). */
export type ChartMutationInput = Partial<ChartIR> &
  Partial<Pick<ChartSpec, 'dataSource' | 'interaction'>> & {
    id?: string;
    type?: string;
    data?: DataRef;
  };

function toChartIR(input: ChartMutationInput): ChartIR {
  if (!input.id || !input.type) {
    throw new Error('Chart must have id and type');
  }
  const interaction = input.interaction
    ? {
        brush: input.interaction.brush,
        brushAxis: input.interaction.brushAxis,
        select: 'select' in input.interaction ? input.interaction.select : undefined,
        publishes:
          ('publishes' in input.interaction ? input.interaction.publishes : undefined) ??
          ('selection' in input.interaction ? input.interaction.selection : undefined),
        filterBy: input.interaction.filterBy,
      }
    : undefined;

  const chart: ChartIR = {
    id: input.id,
    type: input.type,
    title: input.title,
    description: input.description,
    data: input.data,
    dataSource: input.dataSource,
    encoding: input.encoding,
    content: input.content,
    interaction,
    overlays: input.overlays,
    width: input.width,
    height: input.height,
  };

  if (chart.type !== 'text' && !chart.data && !chart.dataSource) {
    throw new Error('Chart must have data or dataSource');
  }
  if (chart.type !== 'text') {
    if (!chart.encoding && chart.type !== 'table') {
      // table may omit encoding in some cases; keep prior strictness for plot types
    }
    if (chart.encoding) validateChartEncoding(chart);
    else if (['line', 'bar', 'scatter', 'area', 'pie', 'donut'].includes(chart.type)) {
      throw new Error('Chart requires encoding');
    }
  }
  return chart;
}

export async function addChartToSpecFile(
  specPath: string,
  chartInput: ChartMutationInput | ChartSpec
): Promise<void> {
  const chart = toChartIR(chartInput as ChartMutationInput);

  const content = await readFile(specPath, 'utf-8');
  const parsed = parseSpecString(content, { path: specPath });

  if (parsed.kind === 'dash') {
    const dash = parsed.dash;
    if (chartIdsFromDash(dash).includes(chart.id)) {
      throw new Error(`Chart with id '${chart.id}' already exists`);
    }
    if (chart.dataSource) {
      const dataIds = new Set((dash.data ?? []).map((d) => d.id));
      if (dataIds.size > 0 && !dataIds.has(chart.dataSource)) {
        throw new Error(`Data source '${chart.dataSource}' not found`);
      }
    }
    dash.charts.push(chart);
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
  updates: ChartMutationInput
): Promise<void> {
  const content = await readFile(specPath, 'utf-8');
  const parsed = parseSpecString(content, { path: specPath });

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
    const interaction = updates.interaction
      ? {
          brush: updates.interaction.brush,
          brushAxis: updates.interaction.brushAxis,
          select: 'select' in updates.interaction ? updates.interaction.select : undefined,
          publishes:
            ('publishes' in updates.interaction ? updates.interaction.publishes : undefined) ??
            ('selection' in updates.interaction ? updates.interaction.selection : undefined),
          filterBy: updates.interaction.filterBy,
        }
      : existing.interaction;
    const merged: ChartIR = {
      ...existing,
      ...updates,
      type: (updates.type as string) || existing.type,
      interaction,
    };
    dash.charts[idx] = merged;
    await writeFile(specPath, stringifyYAML(dash));
    return;
  }

  throw new Error('Unrecognized spec shape');
}

export async function explainCoordination(specPath: string): Promise<string> {
  const content = await readFile(specPath, 'utf-8');
  const parsed = parseSpecString(content, { path: specPath });

  let spec: DashboardSpec;
  if (parsed.kind === 'dash') {
    try {
      spec = dashToDashboardSpec(parsed.dash);
    } catch {
      spec = (await normalizeFile(specPath)).spec;
    }
  } else if (parsed.kind === 'chart') {
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
  const parsed = parseSpecString(content, { path: specPath });

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
