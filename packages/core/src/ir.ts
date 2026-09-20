/**
 * Target IR: Chart + Dash (see docs/ARCHITECTURE.md)
 * Legacy board types remain in types.ts
 */

import type {
  EncodingSpec,
  InteractionConfig,
  AnalysisOverlay,
  LayoutConfig,
  ThemeConfig,
  DataSource,
} from './types.js';

/** Connector kinds — not a metric language */
export type DataRefType = 'dbt_metric' | 'dbt' | 'sql' | 'data';

export interface DataRefDbtMetric {
  type: 'dbt_metric';
  metric: string;
  group_by?: string[];
  where?: string;
}

export interface DataRefDbt {
  type: 'dbt';
  model: string;
}

export interface DataRefSql {
  type: 'sql';
  sql: string;
}

export interface DataRefData {
  type: 'data';
  path?: string;
  table?: string;
}

export type DataRef = DataRefDbtMetric | DataRefDbt | DataRefSql | DataRefData;

/** Named measure within a chart (multi-metric charts) */
export interface ChartMeasure {
  id: string;
  /** Column after resolve; optional if measure has its own data */
  field?: string;
  data?: DataRef;
  label?: string;
}

export interface ChartInteraction extends InteractionConfig {
  /**
   * Selection name this chart publishes when brushing.
   * Prefer over legacy `selection` when writing new specs.
   */
  publishes?: string;
}

/**
 * Atomic chart document (*.chart.yaml|toml|json)
 * `type` is a registered chart-type id (built-in or plugin).
 */
export interface ChartIR {
  id: string;
  type: string;
  title?: string;
  description?: string;

  /** Preferred: inline data binding */
  data?: DataRef;

  /**
   * Legacy / dash-scoped: id into dash.data[]
   * Allowed when chart is embedded in a dash that declares shared sources.
   */
  dataSource?: string;

  encoding?: EncodingSpec;
  content?: string;
  measures?: ChartMeasure[];
  interaction?: ChartInteraction;
  overlays?: AnalysisOverlay[];
  width?: number;
  height?: number;

  /** Extra options for plugin chart types */
  options?: Record<string, unknown>;
}

/** Reference to an external chart file / library id */
export interface DashChartRef {
  chart: string;
  id?: string;
  title?: string;
}

export type DashChartEntry = DashChartRef | ChartIR;

export interface DashCoordination {
  /** Auto-wire publishes → filterBy when grains/selections compatible */
  auto?: boolean;
  selections?: Record<
    string,
    {
      source: string;
      axis?: 'x' | 'y' | 'xy';
    }
  >;
}

export interface DashMeta {
  title?: string;
  description?: string;
  version?: string;
  [key: string]: unknown;
}

/**
 * Dash document (*.dash.yaml|toml|json)
 * Composition of chart refs and/or inline charts.
 */
export interface DashIR {
  id: string;
  title?: string;
  description?: string;
  version?: string;
  meta?: DashMeta;

  /** Shared data sources for inline charts using dataSource */
  data?: DataSource[];

  charts: DashChartEntry[];
  layout?: LayoutConfig;
  coordination?: DashCoordination;
  theme?: ThemeConfig;
}

export type SpecKind = 'chart' | 'dash' | 'board';

export function isDashChartRef(entry: DashChartEntry): entry is DashChartRef {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'chart' in entry &&
    typeof (entry as DashChartRef).chart === 'string' &&
    !('type' in entry)
  );
}

export function isChartIR(obj: unknown): obj is ChartIR {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.type === 'string' && !Array.isArray(o.charts);
}

export function isDashIR(obj: unknown): obj is DashIR {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return typeof o.id === 'string' && Array.isArray(o.charts);
}

export function createEmptyChart(id = 'untitled'): ChartIR {
  return {
    id,
    type: 'line',
    title: 'Untitled chart',
    data: { type: 'data', path: 'data.csv' },
    encoding: {
      x: { field: 'x', type: 'temporal' },
      y: { field: 'y', type: 'quantitative' },
    },
  };
}

export function createEmptyDash(id = 'untitled'): DashIR {
  return {
    id,
    title: 'Untitled dash',
    version: '0.1.0',
    charts: [],
  };
}
