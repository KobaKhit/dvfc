/**
 * Static chart export (svg / png / html-static) via @dvfc/render-vega.
 */

import { join } from 'node:path';
import { normalizeFile, applyDvfcConfig, type NormalizeResult } from '@dvfc/core';
import { exportStatic } from '@dvfc/render-vega';

export type StaticFormat = 'svg' | 'png' | 'html-static';

export interface BuildStaticOptions {
  format: StaticFormat;
  outDir?: string;
  chartId?: string;
  projectRoot?: string;
  /** Pass through when already normalized to avoid double-normalize. */
  normalized?: NormalizeResult;
}

export async function buildStaticChart(
  specPath: string,
  options: BuildStaticOptions
): Promise<string> {
  const projectRoot = options.projectRoot || process.cwd();
  await applyDvfcConfig(projectRoot);

  const normalized = options.normalized ?? (await normalizeFile(specPath, projectRoot));
  if (normalized.spec.charts.length !== 1 && !options.chartId) {
    if (options.format !== 'html-static') {
      throw new Error(
        `Static ${options.format} export from a dash requires --chart <id> ` +
          `(found ${normalized.spec.charts.length} charts). Policy: one chart per artifact.`
      );
    }
    // html-static may export a full linked dash (Vega-Lite, no DuckDB)
  }

  const ext = options.format === 'html-static' ? 'html' : options.format;
  const outFile =
    options.outDir && !options.outDir.endsWith(`.${ext}`)
      ? join(options.outDir, `${options.chartId || 'chart'}.${ext}`)
      : options.outDir || `chart.${ext}`;

  console.log(`📦 Exporting ${options.format} from: ${specPath}`);
  const path = await exportStatic(specPath, {
    format: options.format,
    outFile,
    chartId: options.chartId,
    projectRoot,
    normalized,
  });
  console.log(`\n✅ Wrote ${path}\n`);
  return path;
}
