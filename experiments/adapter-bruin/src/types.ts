/**
 * Bruin adapter types
 */

export interface BruinAsset {
  name: string;
  type: string;  // 'table', 'view', 'python', etc.
  description?: string;
  columns?: BruinColumn[];
  materialization?: {
    type?: string;
    strategy?: string;
    [key: string]: unknown;
  };
  depends?: string[];
  [key: string]: unknown;
}

export interface BruinColumn {
  name: string;
  type?: string;
  description?: string;
  checks?: unknown[];
  [key: string]: unknown;
}

/**
 * Bruin pipeline metadata
 * Full structure: https://bruin-data.github.io/bruin/
 */
export interface BruinPipeline {
  name: string;
  schedule?: string;
  default_connections?: Record<string, string>;
  assets?: Record<string, BruinAsset>;
  [key: string]: unknown;
}

export interface BruinResolverOptions {
  /** Path to pipeline.yml or assets metadata JSON */
  pipelinePath: string;
  
  /** Base directory for data files (CSV exports) */
  dataDir: string;
  
  /** Default file extension (csv, parquet, etc.) */
  fileExtension?: string;
  
  /** Custom path resolver function */
  pathResolver?: (asset: BruinAsset) => string;
}

export interface AssetInfo {
  name: string;
  type: string;
  path: string;
  materialization?: string;
}
