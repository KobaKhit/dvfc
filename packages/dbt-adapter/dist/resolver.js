/**
 * dbt manifest resolver
 * Resolves ref('model_name') style references to local or remote file paths
 */
export class DbtResolver {
    constructor(options) {
        if (typeof options === 'string') {
            // Legacy simple constructor
            throw new Error('DbtResolver now requires options object. Use: new DbtResolver({ manifestPath, dataDir })');
        }
        this.dataDir = options.dataDir;
        this.fileExtension = options.fileExtension || 'csv';
        this.pathResolver = options.pathResolver;
        // In a real implementation, this would load from disk or fetch
        // For now, this is a stub that expects manifest to be provided
        this.manifest = {
            metadata: {
                dbt_schema_version: '',
                dbt_version: '',
                generated_at: '',
                invocation_id: '',
                project_name: ''
            },
            nodes: {}
        };
    }
    /**
     * Load manifest from JSON data (async in real implementation)
     */
    async loadManifest(manifestData) {
        this.manifest = manifestData;
    }
    /**
     * Resolve a model name to its corresponding data file path
     * Similar to dbt's ref() function
     */
    ref(modelName) {
        const node = this.findModel(modelName);
        if (!node) {
            throw new Error(`Model '${modelName}' not found in manifest`);
        }
        if (this.pathResolver) {
            return this.pathResolver(node);
        }
        return `${this.dataDir}/${node.name}.${this.fileExtension}`;
    }
    /**
     * Get all available model names
     */
    listModels() {
        return Object.values(this.manifest.nodes)
            .filter(node => node.resource_type === 'model')
            .map(node => node.name);
    }
    /**
     * Get detailed model information
     */
    getModelInfo(modelName) {
        const node = this.findModel(modelName);
        if (!node) {
            return undefined;
        }
        return {
            name: node.name,
            database: node.database,
            schema: node.schema,
            path: node.path,
            materialized: node.config?.materialized || 'table',
            uniqueId: node.unique_id,
            relationName: node.relation_name
        };
    }
    /**
     * Find a model node by name
     */
    findModel(modelName) {
        const nodeKey = Object.keys(this.manifest.nodes).find(key => {
            const node = this.manifest.nodes[key];
            return node.resource_type === 'model' && node.name === modelName;
        });
        return nodeKey ? this.manifest.nodes[nodeKey] : undefined;
    }
    /**
     * Get all nodes (models, sources, tests, etc.)
     */
    getAllNodes() {
        return this.manifest.nodes;
    }
    /**
     * Get manifest metadata
     */
    getMetadata() {
        return this.manifest.metadata;
    }
}
/**
 * Factory function to create resolver from manifest JSON
 */
export async function createDbtResolver(manifestData, options) {
    const resolver = new DbtResolver({
        manifestPath: '', // Not used in this flow
        ...options
    });
    await resolver.loadManifest(manifestData);
    return resolver;
}
