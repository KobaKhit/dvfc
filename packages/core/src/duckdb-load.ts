/**
 * Shared DuckDB table-loading SQL for Mosaic and dc WASM renderers.
 */

import { basename } from 'node:path';
import type { DataSource } from './types.js';

export interface DuckDbLoadOptions {
  /** Prefix applied to bare filenames, e.g. '${origin}${dataPath}' or '${window.location.origin}${dataPath}'. */
  pathPrefix: string;
  /**
   * Mosaic emits `AS \\n    SELECT` for parquet/csv file loads; dc keeps `AS SELECT` inline.
   * sql/url branches are always inline.
   */
  indentedSelect?: boolean;
}

/**
 * Build `CREATE TABLE IF NOT EXISTS … AS …` for a DataSource.
 * `pathPrefix` is baked into rewritten file paths for DuckDB-WASM fetch URLs.
 */
export function duckDbCreateTableSql(ds: DataSource, options: DuckDbLoadOptions): string {
  const prefix = options.pathPrefix;
  const asSelect = options.indentedSelect
    ? 'AS \n    SELECT * FROM'
    : 'AS SELECT * FROM';

  if (ds.type === 'sql' && ds.sql) {
    const rewritten = ds.sql.replace(
      /(['"])([^'"/]+\.(?:csv|parquet|json|tsv))\1/gi,
      (_m, _q, file: string) => `'${prefix}${file}'`
    );
    return `CREATE TABLE IF NOT EXISTS ${ds.id} AS ${rewritten}`;
  }

  if (ds.type === 'url' && ds.path && /^https?:\/\//i.test(ds.path)) {
    const url = ds.path.replace(/'/g, "''");
    const reader = /\.parquet(\?|$)/i.test(ds.path)
      ? `read_parquet('${url}')`
      : `read_csv_auto('${url}')`;
    return `CREATE TABLE IF NOT EXISTS ${ds.id} AS SELECT * FROM ${reader}`;
  }

  if (
    ds.type === 'parquet' ||
    (typeof ds.path === 'string' && /\.parquet$/i.test(ds.path))
  ) {
    const file =
      ds.path && !ds.path.includes('/') && !/^https?:\/\//i.test(ds.path)
        ? basename(ds.path)
        : `${ds.id}.parquet`;
    return `CREATE TABLE IF NOT EXISTS ${ds.id} ${asSelect} read_parquet('${prefix}${file}')`;
  }

  const file =
    ds.path && !ds.path.includes('/') && !/^https?:\/\//i.test(ds.path)
      ? basename(ds.path)
      : `${ds.id}.csv`;
  return `CREATE TABLE IF NOT EXISTS ${ds.id} ${asSelect} read_csv_auto('${prefix}${file}')`;
}
