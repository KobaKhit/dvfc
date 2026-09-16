/**
 * dbt manifest types
 */
export interface DbtManifest {
    metadata: {
        dbt_schema_version: string;
        dbt_version: string;
        generated_at: string;
        invocation_id: string;
        project_name: string;
    };
    nodes: Record<string, DbtNode>;
    child_map?: Record<string, string[]>;
    parent_map?: Record<string, string[]>;
    docs?: Record<string, unknown>;
}
export interface DbtNode {
    database: string;
    schema: string;
    name: string;
    resource_type: string;
    package_name: string;
    path: string;
    original_file_path: string;
    unique_id: string;
    fqn: string[];
    alias: string;
    checksum?: {
        name: string;
        checksum: string;
    };
    config?: {
        enabled: boolean;
        materialized: string;
        [key: string]: unknown;
    };
    relation_name?: string;
}
export interface DbtResolverOptions {
    /** Path to manifest.json */
    manifestPath: string;
    /** Base directory for data files */
    dataDir: string;
    /** Default file extension (csv, parquet, etc.) */
    fileExtension?: string;
    /** Custom path resolver function */
    pathResolver?: (node: DbtNode) => string;
}
export interface ModelInfo {
    name: string;
    database: string;
    schema: string;
    path: string;
    materialized: string;
    uniqueId: string;
    relationName?: string;
}
