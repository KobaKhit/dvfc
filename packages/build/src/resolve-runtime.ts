/**
 * Resolve workspace packages for Vite without a per-build pnpm install.
 *
 * Note: `@duckdb/duckdb-wasm` and `@uwdata/vgplot` are declared on `@dvfc/build`
 * as runtime alias targets for Mosaic HTML builds (not direct TS imports).
 * `d3` / `dc` / `crossfilter2` are alias targets for dc.js DuckDB-WASM builds.
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);

/** Walk up from a resolved module file until package.json is found. */
function packageRootFromFile(filePath: string): string {
  let dir = dirname(filePath);
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not find package root from ${filePath}`);
}

/** Absolute package root for a dependency already installed in this workspace. */
export function resolvePkgRoot(name: string): string {
  try {
    // Prefer package.json when the package exports it
    return dirname(require.resolve(`${name}/package.json`));
  } catch {
    // Many packages block ./package.json in exports — resolve the entry and walk up
    const entry = require.resolve(name);
    return packageRootFromFile(entry);
  }
}

/** Vite resolve.alias map for Mosaic dashboard builds. */
export function mosaicRuntimeAliases(): Record<string, string> {
  const aliases: Record<string, string> = {
    '@uwdata/vgplot': resolvePkgRoot('@uwdata/vgplot'),
    '@duckdb/duckdb-wasm': resolvePkgRoot('@duckdb/duckdb-wasm'),
  };
  // Pie/donut click publishers import clausePoint from mosaic-core
  try {
    aliases['@uwdata/mosaic-core'] = resolvePkgRoot('@uwdata/mosaic-core');
  } catch {
    /* resolved transitively via vgplot when available */
  }
  try {
    aliases['@uwdata/mosaic-sql'] = resolvePkgRoot('@uwdata/mosaic-sql');
  } catch {
    /* optional */
  }
  try {
    aliases['apache-arrow'] = resolvePkgRoot('apache-arrow');
  } catch {
    // optional transitive; Vite will follow duckdb's own resolution if present
  }
  return aliases;
}

/** Vite resolve.alias map for dc.js + DuckDB-WASM dashboard builds. */
export function dcRuntimeAliases(): Record<string, string> {
  const aliases: Record<string, string> = {
    '@duckdb/duckdb-wasm': resolvePkgRoot('@duckdb/duckdb-wasm'),
    d3: resolvePkgRoot('d3'),
    dc: resolvePkgRoot('dc'),
    crossfilter2: resolvePkgRoot('crossfilter2'),
  };
  try {
    aliases['apache-arrow'] = resolvePkgRoot('apache-arrow');
  } catch {
    /* optional */
  }
  return aliases;
}
