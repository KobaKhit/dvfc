/**
 * Core types for coordboard dashboard specifications
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
export type ChartType = 'bar' | 'line' | 'area' | 'scatter' | 'histogram' | 'heatmap';
export type AggregateFunction = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median';
export interface ChartSpec {
    /** Unique identifier for this chart */
    id: string;
    /** Chart type */
    type: ChartType;
    /** Data source reference */
    dataSource: string;
    /** Chart title */
    title?: string;
    /** Encoding specifications */
    encoding: EncodingSpec;
    /** Optional interaction config */
    interaction?: InteractionConfig;
    /** Optional dimensions */
    width?: number;
    height?: number;
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
    validate(spec: unknown): {
        valid: boolean;
        errors?: string[];
    };
}
/**
 * Type guard to check if an object is a valid DashboardSpec
 */
export declare function isDashboardSpec(obj: unknown): obj is DashboardSpec;
/**
 * Create a minimal valid dashboard spec
 */
export declare function createEmptySpec(): DashboardSpec;
