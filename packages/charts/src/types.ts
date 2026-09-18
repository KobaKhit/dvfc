/**
 * Chart discovery and addressability types
 */

import type { DashboardSpec, ChartSpec } from '@dvfc/core';

/**
 * Chart reference with board context
 */
export interface ChartRef {
  /** Board path (relative to project root) */
  boardPath: string;
  /** Chart ID within the board */
  chartId: string;
  /** Optional display key: {boardId}__{chartId} */
  displayKey?: string;
}

/**
 * Chart search hit
 */
export interface ChartHit {
  /** Board path (relative to project root) */
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
 * Resolved chart resource with board context
 */
export interface ChartResource {
  /** Chart specification */
  chart: ChartSpec;
  /** Board path */
  boardPath: string;
  /** Display key */
  displayKey: string;
  /** Board context (for queries, variables, styles) */
  context: {
    /** Data sources from the board */
    dataSources: DashboardSpec['data'];
    /** Theme/styles from the board */
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
  /** Filter by board path */
  boardPath?: string;
  /** Return all matches (default: false, returns max 10) */
  all?: boolean;
  /** Case sensitive search */
  caseSensitive?: boolean;
}

/**
 * Compose board options
 */
export interface ComposeOptions {
  /** Chart references to include */
  charts: ChartRef[];
  /** Optional metric name (stub for now) */
  metric?: string;
  /** Title for composed board */
  title?: string;
  /** Description for composed board */
  description?: string;
}
