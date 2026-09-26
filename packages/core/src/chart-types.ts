/**
 * Built-in chart type ids — single source for TS union, registry, and JSON Schema.
 */

export const BUILTIN_CHART_TYPE_IDS = [
  'line',
  'bar',
  'area',
  'scatter',
  'histogram',
  'boxplot',
  'density',
  'heatmap',
  'pie',
  'donut',
  'number',
  'table',
  'text',
] as const;

export type ChartType = (typeof BUILTIN_CHART_TYPE_IDS)[number];

export function isBuiltinChartType(id: string): id is ChartType {
  return (BUILTIN_CHART_TYPE_IDS as readonly string[]).includes(id);
}
