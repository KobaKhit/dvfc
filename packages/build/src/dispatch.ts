/**
 * Shared build format dispatch for CLI and MCP.
 */

import { join } from 'node:path';
import { buildHtmlDashboard } from './html-build.js';
import { buildStaticChart } from './static-export.js';
import { buildDcDashboard } from './dc-export.js';
import { buildDcWasmDashboard } from './dc-wasm-build.js';

export const BUILD_FORMATS = [
  'html',
  'svg',
  'png',
  'html-static',
  'html-dc',
  'html-dc-static',
  'html-dc-wasm',
] as const;

export type BuildFormat = (typeof BUILD_FORMATS)[number];

export interface RunBuildOptions {
  format?: BuildFormat;
  outDir?: string;
  base?: string;
  minify?: boolean;
  chartId?: string;
  projectRoot?: string;
  quiet?: boolean;
}

export interface RunBuildResult {
  format: BuildFormat;
  /** Path to the primary artifact (file for static/dc; …/index.html for Mosaic). */
  outputPath: string;
}

export async function runBuildPipeline(
  specPath: string,
  options: RunBuildOptions = {}
): Promise<RunBuildResult> {
  const format = options.format || 'html';
  if (!(BUILD_FORMATS as readonly string[]).includes(format)) {
    throw new Error(
      `Unknown format '${format}'. Expected one of: ${BUILD_FORMATS.join(', ')}`
    );
  }

  const outDir = options.outDir || 'dist';
  const projectRoot = options.projectRoot || process.cwd();

  if (format === 'svg' || format === 'png' || format === 'html-static') {
    const outputPath = await buildStaticChart(specPath, {
      format,
      outDir,
      chartId: options.chartId,
      projectRoot,
    });
    return { format, outputPath };
  }

  // html-dc and html-dc-static are aliases for the same CDN + inlined CSV path
  if (format === 'html-dc' || format === 'html-dc-static') {
    const outputPath = await buildDcDashboard(specPath, {
      outDir,
      chartId: options.chartId,
      projectRoot,
    });
    return { format, outputPath };
  }

  if (format === 'html-dc-wasm') {
    const outputPath = await buildDcWasmDashboard(specPath, {
      outDir,
      base: options.base,
      minify: options.minify,
      chartId: options.chartId,
      projectRoot,
    });
    return { format, outputPath };
  }

  const dir = await buildHtmlDashboard(specPath, {
    outDir,
    base: options.base,
    minify: options.minify,
    chartId: options.chartId,
    projectRoot,
    quiet: options.quiet,
  });
  return { format: 'html', outputPath: join(dir, 'index.html') };
}
