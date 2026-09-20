/**
 * Built-in chart type registrations (metadata + capabilities).
 * Mosaic/Vega render implementations move here incrementally (see ROADMAP Phase 2/5/6).
 */

import { registerChartType, type ChartTypeModule } from './registry.js';

const brushFilter: ChartTypeModule['capabilities'] = {
  mosaic: true,
  vegaLite: true,
  interaction: ['brush', 'filter'],
};

const filterOnly: ChartTypeModule['capabilities'] = {
  mosaic: true,
  vegaLite: true,
  interaction: ['filter'],
};

const builtins: ChartTypeModule[] = [
  { id: 'line', label: 'Line', description: 'Time series / continuous trends', capabilities: brushFilter },
  { id: 'bar', label: 'Bar', description: 'Categorical aggregates', capabilities: filterOnly },
  { id: 'area', label: 'Area', description: 'Filled series', capabilities: brushFilter },
  { id: 'scatter', label: 'Scatter', description: 'Point clouds', capabilities: brushFilter },
  { id: 'histogram', label: 'Histogram', description: 'Binned distributions', capabilities: filterOnly },
  { id: 'boxplot', label: 'Boxplot', description: 'Distribution summary', capabilities: filterOnly },
  { id: 'density', label: 'Density', description: 'Kernel density', capabilities: filterOnly },
  { id: 'heatmap', label: 'Heatmap', description: '2D matrix', capabilities: filterOnly },
  { id: 'pie', label: 'Pie', description: 'Part-to-whole', capabilities: filterOnly },
  { id: 'donut', label: 'Donut', description: 'Hollow part-to-whole', capabilities: filterOnly },
  { id: 'number', label: 'Number (KPI)', description: 'Single metric', capabilities: filterOnly },
  { id: 'table', label: 'Table', description: 'Data grid', capabilities: filterOnly },
  {
    id: 'text',
    label: 'Text',
    description: 'Markdown narrative',
    capabilities: { mosaic: true, vegaLite: false, interaction: [] },
  },
];

let registered = false;

/** Idempotent registration of built-in chart types */
export function registerBuiltinChartTypes(): void {
  if (registered) return;
  for (const m of builtins) {
    registerChartType(m);
  }
  registered = true;
}

export function getBuiltinChartTypeIds(): string[] {
  return builtins.map((b) => b.id);
}

/** Reset flag for tests */
export function _resetBuiltinRegistrationForTests(): void {
  registered = false;
}
