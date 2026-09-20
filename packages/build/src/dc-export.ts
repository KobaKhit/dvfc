/**
 * dc.js HTML dashboard export via @dvfc/render-dc.
 */

import { join } from 'node:path';
import { normalizeFile, applyDvfcConfig, type NormalizeResult } from '@dvfc/core';
import { exportDcDashboard } from '@dvfc/render-dc';

export interface BuildDcOptions {
  outDir?: string;
  chartId?: string;
  projectRoot?: string;
  normalized?: NormalizeResult;
}

export async function buildDcDashboard(
  specPath: string,
  options: BuildDcOptions = {}
): Promise<string> {
  const projectRoot = options.projectRoot || process.cwd();
  await applyDvfcConfig(projectRoot);

  const normalized = options.normalized ?? (await normalizeFile(specPath, projectRoot));

  const outFile =
    options.outDir && !options.outDir.endsWith('.html')
      ? join(options.outDir, `${options.chartId || 'dashboard'}.dc.html`)
      : options.outDir || 'dashboard.dc.html';

  console.log(`📦 Exporting html-dc (dc.js) from: ${specPath}`);
  const path = await exportDcDashboard(specPath, {
    outFile,
    chartId: options.chartId,
    projectRoot,
    normalized,
  });
  console.log(`\n✅ Wrote ${path}\n`);
  return path;
}
