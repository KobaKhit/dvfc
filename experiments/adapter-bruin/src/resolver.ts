/**
 * Bruin asset resolver
 * Resolves asset references to file paths, similar to dbt adapter
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { parse as parseYAML } from 'yaml';
import type {
  BruinPipeline,
  BruinResolverOptions,
  AssetInfo,
} from './types.js';

export class BruinResolver {
  private pipeline: BruinPipeline | null = null;
  private options: BruinResolverOptions;

  constructor(options: BruinResolverOptions) {
    this.options = {
      fileExtension: 'csv',
      ...options,
    };
  }

  /**
   * Load Bruin pipeline
   */
  async loadPipeline(): Promise<void> {
    const content = await readFile(this.options.pipelinePath, 'utf-8');
    
    // Try parsing as YAML first, fall back to JSON
    try {
      this.pipeline = parseYAML(content) as BruinPipeline;
    } catch {
      this.pipeline = JSON.parse(content) as BruinPipeline;
    }
  }

  /**
   * Resolve an asset reference to file path
   */
  async resolve(assetName: string): Promise<string> {
    if (!this.pipeline) {
      await this.loadPipeline();
    }

    const asset = this.pipeline!.assets?.[assetName];
    if (!asset) {
      throw new Error(`Bruin asset '${assetName}' not found in pipeline`);
    }

    // Use custom resolver if provided
    if (this.options.pathResolver) {
      return this.options.pathResolver(asset);
    }

    // Default: look for CSV in dataDir
    const fileName = `${assetName}.${this.options.fileExtension}`;
    return join(this.options.dataDir, fileName);
  }

  /**
   * Get asset info
   */
  async getAssetInfo(assetName: string): Promise<AssetInfo> {
    if (!this.pipeline) {
      await this.loadPipeline();
    }

    const asset = this.pipeline!.assets?.[assetName];
    if (!asset) {
      throw new Error(`Bruin asset '${assetName}' not found`);
    }

    return {
      name: asset.name,
      type: asset.type,
      path: await this.resolve(assetName),
      materialization: asset.materialization?.type,
    };
  }

  /**
   * List all assets
   */
  async listAssets(): Promise<AssetInfo[]> {
    if (!this.pipeline) {
      await this.loadPipeline();
    }

    const assets = this.pipeline!.assets || {};
    return Promise.all(
      Object.keys(assets).map(name => this.getAssetInfo(name))
    );
  }
}

/**
 * Factory function for creating resolver
 */
export function createBruinResolver(
  options: BruinResolverOptions
): BruinResolver {
  return new BruinResolver(options);
}
