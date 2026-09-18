/**
 * Core types for Data Viz Factory dashboard specifications
 * Defines the structure of YAML/JSON board configurations
 */

export interface DashboardSpec {
  /** Dashboard metadata */
  meta: DashboardMeta;
  
  /** Data sources (dbt models, CSV files, etc.) */
  data: DataSource[];
  
  /** Chart specifications */
  charts: ChartSpec[];
  
  /** Optional layout configuration */
  layout?: LayoutConfig;
  
  /** Optional theme/styling */
  theme?: ThemeConfig;
}

export interface DashboardMeta {
  /** Dashboard title */
  title: string;
  
  /** Optional description */
  description?: string;
  
  /** Version of the spec format */
  version: string;
  
  /** Optional metadata */
  [key: string]: unknown;
}

export interface DataSource {
  /** Unique identifier for this data source */
  id: string;
  
  /** Type of data source */
  type: 'dbt' | 'csv' | 'parquet' | 'url';
  
  /** dbt model name (for type: 'dbt') */
  model?: string;
  
  /** File path or URL (for type: 'csv' | 'parquet' | 'url') */
  path?: string;
  
  /** Optional inline SQL transformation */
  sql?: string;
}

export type ChartType = 
  | 'bar'
  | 'line'
  | 'area'
  | 'scatter'
  | 'histogram'
  | 'boxplot'
  | 'density'
  | 'heatmap'
  | 'pie'
  | 'donut'
  | 'number'
  | 'table'
  | 'text';

export type AggregateFunction = 
  | 'sum'
  | 'avg'
  | 'count'
  | 'min'
  | 'max'
  | 'median';

export interface ChartSpec {
  /** Unique identifier for this chart */
  id: string;
  
  /** Chart type */
  type: ChartType;
  
  /** Data source reference (not required for text charts) */
  dataSource?: string;
  
  /** Chart title */
  title?: string;
  
  /** Encoding specifications (not required for text charts) */
  encoding?: EncodingSpec;
  
  /** Content for text charts (Markdown) */
  content?: string;
  
  /** Optional interaction config */
  interaction?: InteractionConfig;
  
  /** Optional analysis overlays */
  overlays?: AnalysisOverlay[];
  
  /** Optional dimensions */
  width?: number;
  height?: number;
}

export type AnalysisOverlayType = 
  | 'mean'
  | 'median'
  | 'trend'
  | 'moving_average';

export interface AnalysisOverlay {
  /** Type of overlay */
  type: AnalysisOverlayType;
  
  /** Field to analyze (defaults to y field) */
  field?: string;
  
  /** Color for the overlay line */
  color?: string;
  
  /** Label for legend */
  label?: string;
  
  /** Window size for moving average */
  window?: number;
}

export interface EncodingSpec {
  /** X-axis encoding */
  x?: ChannelEncoding;
  
  /** Y-axis encoding */
  y?: ChannelEncoding;
  
  /** Color encoding */
  color?: ChannelEncoding | string;
  
  /** Size encoding */
  size?: ChannelEncoding | number;
  
  /** Additional encodings */
  [key: string]: unknown;
}

export interface ChannelEncoding {
  /** Field name from data source */
  field: string;
  
  /** Data type */
  type?: 'quantitative' | 'temporal' | 'nominal' | 'ordinal';
  
  /** Aggregate function */
  aggregate?: AggregateFunction;
  
  /** Axis label */
  label?: string;
  
  /** Number of bins for histogram */
  bins?: number;
  
  /** Optional SQL expression (overrides field) */
  sql?: string;
}

export interface InteractionConfig {
  /** Enable brushing for crossfiltering */
  brush?: boolean;
  
  /** Brush axis ('x' | 'y' | 'xy') */
  brushAxis?: 'x' | 'y' | 'xy';
  
  /** Selection name for coordination */
  selection?: string;
  
  /** Filter by selection from another chart */
  filterBy?: string;
}

export interface LayoutConfig {
  /** Layout type */
  type?: 'grid' | 'flex' | 'stack';
  
  /** Number of columns (for grid layout) */
  columns?: number;
  
  /** Gap between charts */
  gap?: number;
}

export interface ThemeConfig {
  /** Base color palette */
  colors?: string[];
  
  /** Font family */
  fontFamily?: string;
  
  /** Background color */
  backgroundColor?: string;
}

/**
 * Validator interface for dashboard specs
 */
export interface SpecValidator {
  validate(spec: unknown): { valid: boolean; errors?: string[] };
}

/**
 * Type guard to check if an object is a valid DashboardSpec
 */
export function isDashboardSpec(obj: unknown): obj is DashboardSpec {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const spec = obj as Record<string, unknown>;
  
  return (
    typeof spec.meta === 'object' &&
    spec.meta !== null &&
    Array.isArray(spec.data) &&
    Array.isArray(spec.charts)
  );
}

/**
 * Create a minimal valid dashboard spec
 */
export function createEmptySpec(): DashboardSpec {
  return {
    meta: {
      title: 'Untitled Dashboard',
      version: '0.1.0'
    },
    data: [],
    charts: []
  };
}
