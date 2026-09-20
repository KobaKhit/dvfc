/**
 * Chart type plugin registry
 */

export interface ChartTypeCapabilities {
  mosaic?: boolean;
  vegaLite?: boolean;
  interaction?: Array<'brush' | 'filter' | 'toggle'>;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

/** Minimal render context — renderers expand later */
export interface ChartRenderContext {
  chart: unknown;
  dataSql?: string;
  tableName?: string;
}

export interface ChartTypeModule {
  id: string;
  label?: string;
  description?: string;
  capabilities: ChartTypeCapabilities;
  /** Optional extra JSON Schema fragment for options/encoding */
  optionsSchema?: Record<string, unknown>;
  validate?(chart: unknown): ValidationIssue[];
  /** Mosaic / vgplot fragment — implemented per type in later phases */
  renderMosaic?(ctx: ChartRenderContext): unknown;
  /** Vega-Lite unit spec — implemented per type in later phases */
  renderVegaLite?(ctx: ChartRenderContext): unknown;
}

const globalRegistry = new Map<string, ChartTypeModule>();

export function registerChartType(module: ChartTypeModule): void {
  if (!module.id) {
    throw new Error('ChartTypeModule.id is required');
  }
  globalRegistry.set(module.id, module);
}

export function unregisterChartType(id: string): boolean {
  return globalRegistry.delete(id);
}

export function getChartType(id: string): ChartTypeModule | undefined {
  return globalRegistry.get(id);
}

export function listChartTypes(): ChartTypeModule[] {
  return Array.from(globalRegistry.values()).sort((a, b) => a.id.localeCompare(b.id));
}

export function hasChartType(id: string): boolean {
  return globalRegistry.has(id);
}

export function clearChartTypes(): void {
  globalRegistry.clear();
}

/**
 * Load chart type modules from resolved module paths (dynamic import).
 * Accepts absolute filesystem paths or file URLs.
 */
export async function loadChartTypeModules(
  modulePaths: string[]
): Promise<ChartTypeModule[]> {
  const { pathToFileURL } = await import('node:url');
  const loaded: ChartTypeModule[] = [];
  for (const path of modulePaths) {
    const href =
      path.startsWith('file:') || path.startsWith('http:') || path.startsWith('https:')
        ? path
        : pathToFileURL(path).href;
    const mod = await import(href);
    const candidate = (mod.default ?? mod.chartType ?? mod) as
      | ChartTypeModule
      | ChartTypeModule[];
    const list = Array.isArray(candidate) ? candidate : [candidate];
    for (const m of list) {
      if (!m?.id) {
        throw new Error(`Chart type module at ${path} missing id`);
      }
      registerChartType(m);
      loaded.push(m);
    }
  }
  return loaded;
}
