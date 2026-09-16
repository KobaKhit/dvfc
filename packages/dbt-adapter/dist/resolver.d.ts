/**
 * dbt manifest resolver
 * Resolves ref('model_name') style references to local or remote file paths
 */
import type { DbtManifest, DbtNode, DbtResolverOptions, ModelInfo } from './types.js';
export declare class DbtResolver {
    private manifest;
    private dataDir;
    private fileExtension;
    private pathResolver?;
    constructor(options: DbtResolverOptions | string);
    /**
     * Load manifest from JSON data (async in real implementation)
     */
    loadManifest(manifestData: DbtManifest): Promise<void>;
    /**
     * Resolve a model name to its corresponding data file path
     * Similar to dbt's ref() function
     */
    ref(modelName: string): string;
    /**
     * Get all available model names
     */
    listModels(): string[];
    /**
     * Get detailed model information
     */
    getModelInfo(modelName: string): ModelInfo | undefined;
    /**
     * Find a model node by name
     */
    private findModel;
    /**
     * Get all nodes (models, sources, tests, etc.)
     */
    getAllNodes(): Record<string, DbtNode>;
    /**
     * Get manifest metadata
     */
    getMetadata(): {
        dbt_schema_version: string;
        dbt_version: string;
        generated_at: string;
        invocation_id: string;
        project_name: string;
    };
}
/**
 * Factory function to create resolver from manifest JSON
 */
export declare function createDbtResolver(manifestData: DbtManifest, options: Omit<DbtResolverOptions, 'manifestPath'>): Promise<DbtResolver>;
