/**
 * Scaffold a Dash YAML from a dbt manifest (shared by CLI init + MCP).
 */

import { readFile } from 'node:fs/promises';
import type { DashboardSpec } from '@dvfc/core';
import { suggestDashId } from '@dvfc/core';
import {
  listModelsForScaffold,
  type DbtManifest,
  type ListedModel,
} from '@dvfc/adapter-dbt';
import { stringify as stringifyYAML } from 'yaml';

function chartsForModel(model: ListedModel): DashboardSpec['charts'] {
  const columns = model.columns;
  const dateCol = columns.find(
    (c) => c.includes('date') || c.includes('time') || c.includes('_at')
  );
  const numericCol =
    columns.find(
      (c) =>
        c.includes('amount') ||
        c.includes('revenue') ||
        c.includes('count') ||
        c.includes('total')
    ) || columns.find((c) => !c.includes('id') && !c.includes('name'));
  const categoryCol = columns.find(
    (c) =>
      c.includes('status') ||
      c.includes('type') ||
      c.includes('category') ||
      c.includes('method')
  );

  const charts: DashboardSpec['charts'] = [];
  const selectionName = `${model.name}Brush`;

  if (dateCol && numericCol) {
    charts.push({
      id: `${model.name}_trend`,
      type: 'line',
      dataSource: model.name,
      title: `${model.name} Trend`,
      encoding: {
        x: {
          field: dateCol,
          type: 'temporal',
          label: dateCol.replace(/_/g, ' '),
        },
        y: {
          field: numericCol,
          type: 'quantitative',
          aggregate: 'sum',
          label: numericCol.replace(/_/g, ' '),
        },
      },
      interaction: {
        brush: true,
        brushAxis: 'x',
        selection: selectionName,
      },
      width: 700,
      height: 250,
    });
  }

  if (categoryCol && numericCol) {
    charts.push({
      id: `${model.name}_by_${categoryCol}`,
      type: 'bar',
      dataSource: model.name,
      title: `${model.name} by ${categoryCol.replace(/_/g, ' ')}`,
      encoding: {
        x: {
          field: categoryCol,
          type: 'nominal',
          label: categoryCol.replace(/_/g, ' '),
        },
        y: {
          field: numericCol,
          type: 'quantitative',
          aggregate: 'sum',
          label: numericCol.replace(/_/g, ' '),
        },
        color: 'steelblue',
      },
      interaction: dateCol ? { filterBy: selectionName } : undefined,
      width: 700,
      height: 300,
    });
  }

  return charts;
}

/** Convert internal DashboardSpec scaffolding → Dash IR YAML */
export function dashboardSpecToDashYaml(spec: DashboardSpec): string {
  return stringifyYAML({
    id: suggestDashId(spec.meta.title || 'dashboard'),
    title: spec.meta.title,
    description: spec.meta.description,
    version: spec.meta.version || '0.1.0',
    coordination: { auto: true },
    data: spec.data,
    charts: spec.charts.map((c) => ({
      id: c.id,
      type: c.type,
      dataSource: c.dataSource,
      title: c.title,
      encoding: c.encoding,
      content: c.content,
      interaction: c.interaction
        ? {
            brush: c.interaction.brush,
            brushAxis: c.interaction.brushAxis,
            publishes: c.interaction.selection,
            filterBy: c.interaction.filterBy,
          }
        : undefined,
      overlays: c.overlays,
      width: c.width,
      height: c.height,
    })),
    layout: spec.layout,
    theme: spec.theme,
  });
}

export function blankDashSpec(): DashboardSpec {
  return {
    meta: {
      title: 'My Dashboard',
      description: 'A new analytics dashboard',
      version: '0.1.0',
    },
    data: [{ id: 'my_data', type: 'dbt', model: 'my_model' }],
    charts: [
      {
        id: 'trend',
        type: 'line',
        dataSource: 'my_data',
        title: 'Trend Over Time',
        encoding: {
          x: { field: 'date', type: 'temporal' },
          y: { field: 'value', aggregate: 'sum' },
        },
        interaction: { brush: true, selection: 'myBrush' },
        width: 700,
        height: 250,
      },
      {
        id: 'breakdown',
        type: 'bar',
        dataSource: 'my_data',
        title: 'Breakdown by Category',
        encoding: {
          x: { field: 'category', type: 'nominal' },
          y: { field: 'value', aggregate: 'sum' },
        },
        interaction: { filterBy: 'myBrush' },
        width: 700,
        height: 300,
      },
    ],
  };
}

export async function scaffoldDashFromManifest(
  manifestPath: string
): Promise<{ yaml: string; projectName: string; modelCount: number }> {
  const manifestData = JSON.parse(await readFile(manifestPath, 'utf-8')) as DbtManifest;
  const projectName = manifestData.metadata.project_name;
  const selected = listModelsForScaffold(manifestData, 3);

  const spec: DashboardSpec = {
    meta: {
      title: `${projectName} Dashboard`,
      description: `Analytics dashboard generated from dbt project ${projectName}`,
      version: '0.1.0',
    },
    data: selected.map((model) => ({
      id: model.name,
      type: 'dbt' as const,
      model: model.name,
    })),
    charts: selected.flatMap((model) => chartsForModel(model)),
  };

  return {
    yaml: dashboardSpecToDashYaml(spec),
    projectName,
    modelCount: selected.length,
  };
}

export function scaffoldBlankDashYaml(): string {
  return dashboardSpecToDashYaml(blankDashSpec());
}
