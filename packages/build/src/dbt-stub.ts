/**
 * Shared dbt stub / manifest resolution for validate + HTML build.
 */

import { readFile } from 'node:fs/promises';
import { join, dirname, resolve as resolvePath } from 'node:path';
import type { DbtManifest } from '@dvfc/adapter-dbt';
import { createDbtResolver } from '@dvfc/adapter-dbt';
import { findDbtStubDir, findDbtModelCsv, type DashboardSpec } from '@dvfc/core';

export interface DbtStubContext {
  specDir: string;
  projectRoot: string;
  dbtDataDir: string;
  dbtManifestPath: string;
  resolver: Awaited<ReturnType<typeof createDbtResolver>> | null;
}

export async function loadDbtStubContext(
  specPath: string,
  projectRoot: string
): Promise<DbtStubContext> {
  const specDir = dirname(resolvePath(specPath));
  const dbtDataDir =
    (await findDbtStubDir({ specDir, projectRoot })) ?? join(specDir, 'dbt-stub');
  const dbtManifestPath = join(dbtDataDir, 'manifest.json');

  let resolver: DbtStubContext['resolver'] = null;
  try {
    const manifestData = JSON.parse(await readFile(dbtManifestPath, 'utf-8')) as DbtManifest;
    resolver = await createDbtResolver(manifestData, { dataDir: dbtDataDir });
  } catch {
    resolver = null;
  }

  return { specDir, projectRoot, dbtDataDir, dbtManifestPath, resolver };
}

/** Resolve a single dbt model to a file path (manifest first, then CSV stub). */
export async function resolveDbtModelPath(
  model: string,
  ctx: DbtStubContext
): Promise<string | null> {
  if (ctx.resolver) {
    try {
      return ctx.resolver.ref(model);
    } catch {
      /* fall through to CSV stub */
    }
  }
  return findDbtModelCsv(model, {
    specDir: ctx.specDir,
    projectRoot: ctx.projectRoot,
    dbtStubDir: ctx.dbtDataDir,
  });
}

function dbtAssetPresent(
  ds: { id: string },
  assets: { destName: string }[]
): boolean {
  return assets.some(
    (a) =>
      a.destName === `${ds.id}.csv` ||
      a.destName === `${ds.id}.parquet` ||
      a.destName.startsWith(`${ds.id}.`)
  );
}

/**
 * Ensure every dbt data source on the spec has a resolvable asset (build path).
 * Preserves prior behavior: manifest ref errors rethrow when assets are missing;
 * otherwise fall back to already-normalized assets with a warning.
 */
export async function assertDbtAssetsForBuild(
  spec: DashboardSpec,
  assets: { destName: string }[],
  ctx: DbtStubContext,
  log?: (...args: unknown[]) => void
): Promise<void> {
  if (!spec.data.some((ds) => ds.type === 'dbt')) return;

  try {
    if (!ctx.resolver) {
      throw new Error(`dbt stub/manifest unavailable at ${ctx.dbtManifestPath}`);
    }
    for (const dataSource of spec.data) {
      if (dataSource.type === 'dbt' && dataSource.model) {
        const path = ctx.resolver.ref(dataSource.model);
        await readFile(path, 'utf-8');
        log?.(`✓ Resolved dbt model: ${dataSource.model} → ${path}`);
      }
    }
  } catch (err) {
    const missingAssets = spec.data.filter(
      (ds) => ds.type === 'dbt' && !dbtAssetPresent(ds, assets)
    );
    if (missingAssets.length > 0) {
      if (err instanceof Error && err.message.includes('dbt model')) throw err;
      throw new Error(
        `dbt stub/manifest unavailable at ${ctx.dbtManifestPath}\n` +
          `  Missing data for: ${missingAssets.map((d) => d.model || d.id).join(', ')}\n` +
          `  Tip: Place dbt-stub (manifest.json + CSV/parquet) next to the spec or under examples/*/dbt-stub`
      );
    }
    log?.(`⚠️  dbt stub discovery skipped (${ctx.dbtManifestPath}); using resolved assets`);
  }
}
