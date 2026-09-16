/**
 * Simple dbt manifest resolver
 * Resolves ref('model_name') style references to local file paths
 */

interface ManifestNode {
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
}

interface Manifest {
  metadata: {
    project_name: string;
    dbt_version: string;
  };
  nodes: Record<string, ManifestNode>;
}

export class DbtResolver {
  private manifest: Manifest;
  private dataDir: string;

  constructor(manifestPath: string, dataDir: string) {
    this.manifest = require(manifestPath);
    this.dataDir = dataDir;
  }

  /**
   * Resolve a model name to its corresponding data file path
   * Similar to dbt's ref() function
   */
  ref(modelName: string): string {
    const nodeKey = Object.keys(this.manifest.nodes).find(key => {
      const node = this.manifest.nodes[key];
      return node.resource_type === 'model' && node.name === modelName;
    });

    if (!nodeKey) {
      throw new Error(`Model '${modelName}' not found in manifest`);
    }

    const node = this.manifest.nodes[nodeKey];
    return `${this.dataDir}/${node.name}.csv`;
  }

  /**
   * Get all available model names
   */
  listModels(): string[] {
    return Object.values(this.manifest.nodes)
      .filter(node => node.resource_type === 'model')
      .map(node => node.name);
  }

  /**
   * Get model metadata
   */
  getModelInfo(modelName: string): ManifestNode | undefined {
    const nodeKey = Object.keys(this.manifest.nodes).find(key => {
      const node = this.manifest.nodes[key];
      return node.resource_type === 'model' && node.name === modelName;
    });

    return nodeKey ? this.manifest.nodes[nodeKey] : undefined;
  }
}

// Example usage:
// const resolver = new DbtResolver('../dbt-stub/manifest.json', '../dbt-stub');
// const salesPath = resolver.ref('sales_daily');
