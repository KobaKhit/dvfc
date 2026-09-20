/**
 * Shared dbt model listing helpers (CLI + MCP).
 */

import type { DbtManifest, DbtNode, ModelInfo } from './types.js';

export interface ListedModel {
  name: string;
  schema: string;
  database: string;
  path: string;
  relationName?: string;
  tags: string[];
  columns: string[];
  node: DbtNode;
}

function tagsOf(node: DbtNode): string[] {
  const fromNode = node.tags ?? [];
  const fromConfig = node.config?.tags ?? [];
  return [...new Set([...fromNode, ...fromConfig])];
}

function isMart(node: DbtNode): boolean {
  const tags = tagsOf(node);
  return (
    Boolean(node.schema?.includes('mart')) ||
    Boolean(node.path?.includes('mart')) ||
    tags.includes('mart')
  );
}

/** List all model nodes from a loaded manifest. */
export function listDbtModels(manifest: DbtManifest): ListedModel[] {
  return Object.values(manifest.nodes)
    .filter((node) => node.resource_type === 'model')
    .map((node) => ({
      name: node.name,
      schema: node.schema,
      database: node.database,
      path: node.path,
      relationName: node.relation_name,
      tags: tagsOf(node),
      columns: node.columns ? Object.keys(node.columns) : [],
      node,
    }));
}

/**
 * Prefer mart models for scaffolding; fall back to the first `limit` models.
 */
export function listModelsForScaffold(
  manifest: DbtManifest,
  limit = 3
): ListedModel[] {
  const all = listDbtModels(manifest);
  const marts = all.filter((m) => isMart(m.node));
  const pool = marts.length > 0 ? marts : all;
  return pool.slice(0, Math.min(limit, pool.length));
}

/** Map ListedModel → ModelInfo shape used by resolver consumers. */
export function toModelInfo(m: ListedModel): ModelInfo {
  return {
    name: m.name,
    database: m.database,
    schema: m.schema,
    path: m.path,
    materialized: m.node.config?.materialized ?? 'unknown',
    uniqueId: m.node.unique_id,
    relationName: m.relationName,
  };
}
