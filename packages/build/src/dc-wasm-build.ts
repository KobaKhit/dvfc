/**
 * dc.js + DuckDB-WASM HTML dashboard build (Vite-bundled).
 * DuckDB loads CSV/Parquet → rows → crossfilter → dc.js charts.
 */

import { writeFile, mkdir, cp, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve as resolvePath } from 'node:path';
import { tmpdir } from 'node:os';
import { build as viteBuild, type InlineConfig } from 'vite';
import {
  normalizeFile,
  applyDvfcConfig,
  filterSpecToChart,
  type NormalizeResult,
} from '@dvfc/core';
import {
  generateDcWasmMainScript,
  generateDcWasmHTML,
} from '@dvfc/render-dc';
import { dcRuntimeAliases } from './resolve-runtime.js';
import { validateSpecFileWithResult } from './validate-spec.js';

export interface BuildDcWasmOptions {
  outDir?: string;
  base?: string;
  minify?: boolean;
  chartId?: string;
  projectRoot?: string;
  quiet?: boolean;
  normalized?: NormalizeResult;
}

function log(quiet: boolean | undefined, ...args: unknown[]): void {
  if (!quiet) console.log(...args);
}

function viteDcWasmConfig(
  root: string,
  opts: { base?: string; outDir?: string; minify?: boolean; port?: number; open?: boolean }
): InlineConfig {
  const aliases = dcRuntimeAliases();
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

async function writeDcWasmSources(
  assets: NormalizeResult['assets'],
  tempDir: string,
  spec: NormalizeResult['spec'],
  base: string
): Promise<void> {
  await mkdir(join(tempDir, 'data'), { recursive: true });

  await writeFile(
    join(tempDir, 'package.json'),
    JSON.stringify({ name: 'dvfc-dc-wasm-build', type: 'module', private: true }, null, 2)
  );

  const ctx = { spec, base };
  await writeFile(join(tempDir, 'main.ts'), generateDcWasmMainScript(ctx));
  await writeFile(join(tempDir, 'index.html'), generateDcWasmHTML(ctx));

  for (const asset of assets) {
    await cp(asset.absPath, join(tempDir, 'data', asset.destName));
  }
}

/**
 * Build a dc.js + DuckDB-WASM dashboard into outDir.
 */
export async function buildDcWasmDashboard(
  specPath: string,
  options: BuildDcWasmOptions = {}
): Promise<string> {
  const projectRoot = options.projectRoot || process.cwd();
  const outDir = options.outDir || 'dist';
  const quiet = options.quiet;

  await applyDvfcConfig(projectRoot);

  log(quiet, `📦 Building html-dc-wasm (dc.js + DuckDB-WASM) from: ${specPath}`);
  log(quiet, `   Output: ${outDir}`);

  if (!options.normalized) {
    log(quiet, `🔍 Validating spec...`);
    const validation = await validateSpecFileWithResult(specPath, {
      projectRoot,
      quiet: true,
    });
    if (!validation.valid) {
      throw new Error(`Spec validation failed:\n${validation.report}`);
    }
  }

  const normalized =
    options.normalized ?? (await normalizeFile(specPath, projectRoot));
  let { spec, assets } = normalized;
  log(quiet, `✓ Loaded spec: ${spec.meta.title} (${normalized.kind})`);

  if (options.chartId) {
    const filtered = filterSpecToChart(spec, assets, options.chartId);
    spec = filtered.spec;
    assets = filtered.assets;
    log(quiet, `✓ Building single chart: ${spec.charts[0].id}`);
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'dvfc-dc-wasm-'));
  try {
    await writeDcWasmSources(assets, tempDir, spec, options.base || '/');
    log(quiet, `✓ Generated dc.js + DuckDB-WASM dashboard code`);
    for (const asset of assets) {
      log(quiet, `✓ Copied data: ${asset.destName}`);
    }

    log(quiet, `\n📦 Bundling with Vite...`);
    await viteBuild(
      viteDcWasmConfig(tempDir, {
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
