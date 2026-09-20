/**
 * Chart discovery and addressability types
 */

import type { DashboardSpec, ChartSpec } from '@dvfc/core';

/**
 * Chart reference with dash context
 */
export interface ChartRef {
  /** Path to *.dash.yaml (relative to project root). Prefer over boardPath. */
  dashPath: string;
  /** @deprecated Use dashPath */
  boardPath?: string;
  /** Chart ID within the dash */
  chartId: string;
  /** Optional display key: {dashId}__{chartId} */
  displayKey?: string;
}

/**
 * Chart search hit
 */
export interface ChartHit {
  /** Path to dash/chart file (relative to project root) */
  dashPath: string;
  /** @deprecated Use dashPath */
  boardPath: string;
  /** Chart ID */
  chartId: string;
  /** Chart type */
  type: string;
  /** Chart title or label */
  title?: string;
  /** Optional search score */
  score?: number;
  /** Display key for disambiguation */
  displayKey: string;
}

/**
 * Resolved chart resource with dash context
 */
export interface ChartResource {
  /** Chart specification */
  chart: ChartSpec;
  /** Path to dash file */
  dashPath: string;
  /** @deprecated Use dashPath */
  boardPath: string;
  /** Display key */
  displayKey: string;
  /** Dash context (for queries, variables, styles) */
  context: {
    /** Data sources from the dash */
    dataSources: DashboardSpec['data'];
    /** Theme/styles from the dash */
    theme?: DashboardSpec['theme'];
    /** Layout info */
    layout?: DashboardSpec['layout'];
  };
}

/**
 * Chart search options
 */
export interface SearchOptions {
  /** Project root to search from */
  projectRoot: string;
  /** Search query (matches chart id, title, type, fields) */
  query: string;
  /** Filter by dash path */
  dashPath?: string;
  /** @deprecated Use dashPath */
  boardPath?: string;
  /** Return all matches (default: false, returns max 10) */
  all?: boolean;
  /** Case sensitive search */
  caseSensitive?: boolean;
}
