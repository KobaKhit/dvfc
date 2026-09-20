/**
 * SQLMesh model resolver
 * Resolves model references to file paths, similar to dbt adapter
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseYAML } from 'yaml';
import type {
  SqlMeshContext,
  SqlMeshResolverOptions,
  ModelInfo,
} from './types.js';

export class SqlMeshResolver {
  private context: SqlMeshContext | null = null;
  private options: SqlMeshResolverOptions;

  constructor(options: SqlMeshResolverOptions) {
    this.options = {
      fileExtension: 'csv',
      ...options,
    };
  }

  /**
   * Load SQLMesh context
   */
  async loadContext(): Promise<void> {
    const content = await readFile(this.options.contextPath, 'utf-8');
    
    // Try parsing as YAML first, fall back to JSON
    try {
      this.context = parseYAML(content) as SqlMeshContext;
    } catch {
      this.context = JSON.parse(content) as SqlMeshContext;
    }
  }

  /**
   * Resolve a model reference to file path
   */
  async resolve(modelName: string): Promise<string> {
    if (!this.context) {
      await this.loadContext();
    }

    const model = this.context!.models?.[modelName];
    if (!model) {
      throw new Error(`SQLMesh model '${modelName}' not found in context`);
    }

    // Use custom resolver if provided
    if (this.options.pathResolver) {
      return this.options.pathResolver(model);
    }

    // Default: look for CSV in dataDir
    const fileName = `${modelName}.${this.options.fileExtension}`;
    return join(this.options.dataDir, fileName);
  }

  /**
   * Get model info
   */
  async getModelInfo(modelName: string): Promise<ModelInfo> {
    if (!this.context) {
      await this.loadContext();
    }

    const model = this.context!.models?.[modelName];
    if (!model) {
      throw new Error(`SQLMesh model '${modelName}' not found`);
    }

    return {
      name: model.name,
      kind: model.kind,
      path: await this.resolve(modelName),
      schema: model.name.split('.')[0] || this.context!.default_schema,
      catalog: this.context!.default_catalog,
    };
  }

  /**
   * List all models
   */
  async listModels(): Promise<ModelInfo[]> {
    if (!this.context) {
      await this.loadContext();
    }

    const models = this.context!.models || {};
    return Promise.all(
      Object.keys(models).map(name => this.getModelInfo(name))
    );
  }
}

/**
 * Factory function for creating resolver
 */
export function createSqlMeshResolver(
  options: SqlMeshResolverOptions
): SqlMeshResolver {
  return new SqlMeshResolver(options);
}
