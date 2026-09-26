import { registerChartType, type ChartTypeModule } from './registry.js';
import { BUILTIN_CHART_TYPE_IDS, type ChartType } from './chart-types.js';

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

const META: Record<
  ChartType,
  { label: string; description: string; capabilities: ChartTypeModule['capabilities'] }
> = {
  line: { label: 'Line', description: 'Time series / continuous trends', capabilities: brushFilter },
  bar: { label: 'Bar', description: 'Categorical aggregates', capabilities: filterOnly },
  area: { label: 'Area', description: 'Filled series', capabilities: brushFilter },
  scatter: { label: 'Scatter', description: 'Point clouds', capabilities: brushFilter },
  histogram: { label: 'Histogram', description: 'Binned distributions', capabilities: filterOnly },
  boxplot: { label: 'Boxplot', description: 'Distribution summary', capabilities: filterOnly },
  density: { label: 'Density', description: 'Kernel density', capabilities: filterOnly },
  heatmap: { label: 'Heatmap', description: '2D matrix', capabilities: filterOnly },
  pie: { label: 'Pie', description: 'Part-to-whole', capabilities: filterOnly },
  donut: { label: 'Donut', description: 'Hollow part-to-whole', capabilities: filterOnly },
  number: { label: 'Number (KPI)', description: 'Single metric', capabilities: filterOnly },
  table: { label: 'Table', description: 'Data grid', capabilities: filterOnly },
  text: {
    label: 'Text',
    description: 'Markdown narrative',
    capabilities: { mosaic: true, vegaLite: false, interaction: [] },
  },
};

const builtins: ChartTypeModule[] = BUILTIN_CHART_TYPE_IDS.map((id) => ({
  id,
  ...META[id],
}));

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
  return [...BUILTIN_CHART_TYPE_IDS];
}

/** Reset flag for tests */
export function _resetBuiltinRegistrationForTests(): void {
  registered = false;
}
