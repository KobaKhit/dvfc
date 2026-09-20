/**
 * HTML (Mosaic) dashboard build + preview file generation.
 * Uses workspace-installed vgplot/duckdb via Vite aliases — no per-build install.
 */

import { readFile, writeFile, mkdir, cp, mkdtemp, rm } from 'node:fs/promises';
import { join, dirname, resolve as resolvePath } from 'node:path';
import { tmpdir } from 'node:os';
import { build as viteBuild, createServer as createViteServer, type InlineConfig } from 'vite';
import type { DbtManifest } from '@dvfc/adapter-dbt';
import { createDbtResolver } from '@dvfc/adapter-dbt';
import {
  normalizeFile,
  findDbtStubDir,
  applyDvfcConfig,
  filterSpecToChart,
  type NormalizeResult,
  type DashboardSpec,
} from '@dvfc/core';
import { generateMainScript, generateHTML, type GeneratorContext } from '@dvfc/render-mosaic';
import { mosaicRuntimeAliases } from './resolve-runtime.js';
import { validateSpecFileWithResult } from './validate-spec.js';

export interface BuildHtmlOptions {
  outDir?: string;
  base?: string;
  minify?: boolean;
  chartId?: string;
  projectRoot?: string;
  /** When true, skip console logging */
  quiet?: boolean;
}

export interface PreviewFilesOptions {
  projectRoot?: string;
}

function log(quiet: boolean | undefined, ...args: unknown[]): void {
  if (!quiet) console.log(...args);
}

function viteMosaicConfig(
  root: string,
  opts: { base?: string; outDir?: string; minify?: boolean; port?: number; open?: boolean }
): InlineConfig {
  const aliases = mosaicRuntimeAliases();
  const config: InlineConfig = {
    root,
    base: opts.base || '/',
    resolve: { alias: aliases },
    optimizeDeps: {
      exclude: ['@duckdb/duckdb-wasm'],
    },
    server: {
      port: opts.port,
      open: opts.open,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
    },
  };

  if (opts.outDir) {
    config.build = {
      outDir: resolvePath(opts.outDir),
      emptyOutDir: true,
      minify: opts.minify ? 'esbuild' : false,
      rollupOptions: {
        input: join(root, 'index.html'),
      },
    };
  }

  return config;
}

async function writeDashboardSources(
  assets: NormalizeResult['assets'],
  tempDir: string,
  ctx: GeneratorContext
): Promise<void> {
  await mkdir(join(tempDir, 'data'), { recursive: true });

  // Minimal package.json so Vite treats the temp root as ESM — no dependencies.
  await writeFile(
    join(tempDir, 'package.json'),
    JSON.stringify({ name: 'dvfc-temp-build', type: 'module', private: true }, null, 2)
  );

  await writeFile(join(tempDir, 'main.ts'), generateMainScript(ctx));
  await writeFile(join(tempDir, 'index.html'), generateHTML(ctx));

  for (const asset of assets) {
    await cp(asset.absPath, join(tempDir, 'data', asset.destName));
  }
}

async function resolveDbtIfNeeded(
  specPath: string,
  spec: DashboardSpec,
  assets: NormalizeResult['assets'],
  projectRoot: string,
  quiet?: boolean
): Promise<string> {
  const specDir = dirname(resolvePath(specPath));
  const dbtDataDir =
    (await findDbtStubDir({ specDir, projectRoot })) ?? join(specDir, 'dbt-stub');
  const dbtManifestPath = join(dbtDataDir, 'manifest.json');

  if (!spec.data.some((ds) => ds.type === 'dbt')) {
    return dbtDataDir;
  }

  try {
    const manifestData = JSON.parse(await readFile(dbtManifestPath, 'utf-8')) as DbtManifest;
    const resolver = await createDbtResolver(manifestData, { dataDir: dbtDataDir });
    for (const dataSource of spec.data) {
      if (dataSource.type === 'dbt' && dataSource.model) {
        const path = resolver.ref(dataSource.model);
        await readFile(path, 'utf-8');
        log(quiet, `✓ Resolved dbt model: ${dataSource.model} → ${path}`);
      }
    }
  } catch (err) {
    const missingAssets = spec.data.filter(
      (ds) =>
        ds.type === 'dbt' &&
        !assets.some(
          (a) =>
            a.destName === `${ds.id}.csv` ||
            a.destName === `${ds.id}.parquet` ||
            a.destName.startsWith(`${ds.id}.`)
        )
    );
    if (missingAssets.length > 0) {
      if (err instanceof Error && err.message.includes('dbt model')) throw err;
      throw new Error(
        `dbt stub/manifest unavailable at ${dbtManifestPath}\n` +
          `  Missing data for: ${missingAssets.map((d) => d.model || d.id).join(', ')}\n` +
          `  Tip: Place dbt-stub (manifest.json + CSV/parquet) next to the spec or under examples/*/dbt-stub`
      );
    }
    log(quiet, `⚠️  dbt stub discovery skipped (${dbtManifestPath}); using resolved assets`);
  }

  return dbtDataDir;
}

/**
 * Build a Mosaic HTML dashboard into outDir. No network / pnpm install.
 */
export async function buildHtmlDashboard(
  specPath: string,
  options: BuildHtmlOptions = {}
): Promise<string> {
  const projectRoot = options.projectRoot || process.cwd();
  const outDir = options.outDir || 'dist';
  const quiet = options.quiet;

  await applyDvfcConfig(projectRoot);

  log(quiet, `📦 Building dashboard from: ${specPath}`);
  log(quiet, `   Output: ${outDir}`);

  log(quiet, `🔍 Validating spec...`);
  const validation = await validateSpecFileWithResult(specPath, { projectRoot, quiet: true });
  if (!validation.valid) {
    throw new Error(`Spec validation failed:\n${validation.report}`);
  }

  const normalized = await normalizeFile(specPath, projectRoot);
  let { spec, assets } = normalized;
  log(quiet, `✓ Loaded spec: ${spec.meta.title} (${normalized.kind})`);

  if (options.chartId) {
    const filtered = filterSpecToChart(spec, assets, options.chartId);
    spec = filtered.spec;
    assets = filtered.assets;
    log(quiet, `✓ Building single chart: ${spec.charts[0].id} (${spec.charts[0].type})`);
  }

  const dbtDataDir = await resolveDbtIfNeeded(specPath, spec, assets, projectRoot, quiet);

  const tempDir = await mkdtemp(join(tmpdir(), 'dvfc-build-'));
  try {
    const ctx: GeneratorContext = {
      spec,
      dataDir: dbtDataDir,
      outputDir: outDir,
      base: options.base || '/',
    };

    await writeDashboardSources(assets, tempDir, ctx);
    log(quiet, `✓ Generated dashboard code`);
    for (const asset of assets) {
      log(quiet, `✓ Copied data: ${asset.destName}`);
    }

    log(quiet, `\n📦 Bundling with Vite...`);
    await viteBuild(
      viteMosaicConfig(tempDir, {
        base: options.base || '/',
        outDir,
        minify: options.minify,
      }) as Parameters<typeof viteBuild>[0]
    );

    await cp(join(tempDir, 'data'), join(outDir, 'data'), { recursive: true });

    log(quiet, `\n✅ Build complete!`);
    log(quiet, `   Output: ${outDir}/index.html`);
    log(quiet, `   Preview: npx serve ${outDir}\n`);
    return outDir;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Write preview sources into an existing directory (for Vite dev server).
 */
export async function generatePreviewFiles(
  specPath: string,
  tempDir: string,
  options: PreviewFilesOptions = {}
): Promise<void> {
  const projectRoot = options.projectRoot || process.cwd();
  await applyDvfcConfig(projectRoot);
  const normalized = await normalizeFile(specPath, projectRoot);
  const { spec, assets } = normalized;
  await resolveDbtIfNeeded(specPath, spec, assets, projectRoot, true);
  const ctx: GeneratorContext = {
    spec,
    dataDir: join(tempDir, 'data'),
    outputDir: tempDir,
    base: '/',
  };
  await writeDashboardSources(assets, tempDir, ctx);
}

/**
 * Create a Vite preview config that resolves Mosaic runtime from the workspace.
 */
export function createPreviewViteConfig(
  tempDir: string,
  options: { port?: number; open?: boolean } = {}
): InlineConfig {
  return viteMosaicConfig(tempDir, {
    port: options.port || 3000,
    open: options.open,
  });
}

export { createViteServer };
