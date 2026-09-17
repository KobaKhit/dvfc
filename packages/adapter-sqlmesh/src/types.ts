/**
 * SQLMesh adapter types
 */

export interface SqlMeshModel {
  name: string;
  kind: string;
  dialect?: string;
  owner?: string;
  description?: string;
  columns?: Record<string, SqlMeshColumn>;
  depends_on?: string[];
  [key: string]: unknown;
}

export interface SqlMeshColumn {
  name: string;
  type?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * SQLMesh context metadata (simplified)
 * Full structure: https://sqlmesh.readthedocs.io/
 */
export interface SqlMeshContext {
  models?: Record<string, SqlMeshModel>;
  default_catalog?: string;
  default_schema?: string;
  config?: {
    model_defaults?: {
      dialect?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface SqlMeshResolverOptions {
  /** Path to context.yaml or models metadata JSON */
  contextPath: string;
  
  /** Base directory for data files (CSV exports) */
  dataDir: string;
  
  /** Default file extension (csv, parquet, etc.) */
  fileExtension?: string;
  
  /** Custom path resolver function */
  pathResolver?: (model: SqlMeshModel) => string;
}

export interface ModelInfo {
  name: string;
  kind: string;
  path: string;
  schema?: string;
  catalog?: string;
}
