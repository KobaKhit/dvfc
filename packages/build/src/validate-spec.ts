/**
 * Validate a chart or dash file. Shared by CLI and MCP.
 */

import { readFile } from 'node:fs/promises';
import { join, dirname, resolve as resolvePath } from 'node:path';
import type { DbtManifest } from '@dvfc/adapter-dbt';
import { createDbtResolver } from '@dvfc/adapter-dbt';
import {
  parseSpecString,
  registerBuiltinChartTypes,
  findDbtStubDir,
  findDbtModelCsv,
  normalizeFile,
  applyDvfcConfig,
  type NormalizeResult,
  type DashboardSpec,
} from '@dvfc/core';
import {
  validateChartWithReport,
  validateDashWithReport,
} from './validator.js';

export interface ValidateOptions {
  projectRoot?: string;
  quiet?: boolean;
  /**
   * When true (default), unresolved dbt models / missing stubs fail validation.
   * Set false only for exploratory authoring without local stubs.
   */
  strictDbt?: boolean;
}

export interface ValidateSpecResult {
  valid: boolean;
  kind?: 'chart' | 'dash';
  report: string;
  errors: string[];
}

function log(quiet: boolean | undefined, ...args: unknown[]): void {
  if (!quiet) console.log(...args);
}

/**
 * Validate a chart/dash file and return a structured result (for MCP/build).
 * Also logs a human report unless `quiet` is set.
 */
export async function validateSpecFileWithResult(
  specPath: string,
  options: ValidateOptions = {}
): Promise<ValidateSpecResult> {
  const projectRoot = options.projectRoot || process.cwd();
  const quiet = options.quiet;
  const strictDbt = options.strictDbt !== false;
  const errors: string[] = [];

  log(quiet, `🔍 Validating: ${specPath}\n`);
  await applyDvfcConfig(projectRoot);
  registerBuiltinChartTypes();

  try {
    const content = await readFile(specPath, 'utf-8');
    const parsed = parseSpecString(content, { path: specPath });

    if (parsed.kind === 'chart') {
      log(quiet, 'Kind: chart\n');
      const result = validateChartWithReport(parsed.chart);
      log(quiet, result.report);
      if (!result.valid) {
        return { valid: false, kind: 'chart', report: result.report, errors: [result.report] };
      }
      log(quiet, '\n✅ All validation checks passed!\n');
      return { valid: true, kind: 'chart', report: result.report, errors: [] };
    }

    if (parsed.kind === 'dash') {
      log(quiet, 'Kind: dash\n');
      const result = validateDashWithReport(parsed.dash);
      log(quiet, result.report);
      if (!result.valid) {
        return { valid: false, kind: 'dash', report: result.report, errors: [result.report] };
      }

      const dashData = parsed.dash.data ?? [];
      const hasDbtModels = dashData.some((ds) => ds.type === 'dbt');
      if (hasDbtModels) {
        const specDir = dirname(resolvePath(specPath));
        const dbtDataDir =
          (await findDbtStubDir({ specDir, projectRoot })) ?? join(specDir, 'dbt-stub');
        const dbtManifestPath = join(dbtDataDir, 'manifest.json');

        let resolver: Awaited<ReturnType<typeof createDbtResolver>> | null = null;
        try {
          const manifestData = JSON.parse(await readFile(dbtManifestPath, 'utf-8')) as DbtManifest;
          resolver = await createDbtResolver(manifestData, { dataDir: dbtDataDir });
          log(quiet, `✓ dbt manifest found (${dbtDataDir})`);
        } catch {
          const msg = `dbt manifest not found at ${dbtManifestPath}`;
          if (strictDbt) {
            // Still allow if every model has a resolvable CSV stub
            log(quiet, `⚠️  ${msg} — checking CSV stubs`);
          } else {
            log(quiet, `⚠️  ${msg} (strictDbt=false; continuing)`);
          }
        }

        for (const dataSource of dashData) {
          if (dataSource.type !== 'dbt' || !dataSource.model) continue;
          const model = dataSource.model;
          let resolved: string | null = null;
          if (resolver) {
            try {
              resolved = resolver.ref(model);
              log(quiet, `✓ dbt model '${model}' → ${resolved}`);
            } catch {
              resolved = null;
            }
          }
          if (!resolved) {
            const csv = await findDbtModelCsv(model, { specDir, projectRoot, dbtStubDir: dbtDataDir });
            if (csv) {
              log(quiet, `✓ dbt model '${model}' → stub ${csv}`);
              resolved = csv;
            }
          }
          if (!resolved) {
            const msg = `dbt model '${model}' not found in manifest or CSV stubs`;
            if (strictDbt) {
              errors.push(msg);
              log(quiet, `❌ ${msg}`);
            } else {
              log(quiet, `⚠️  ${msg}`);
            }
          }
        }
      }

      if (errors.length > 0) {
        const report = `❌ dbt validation failed:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
        log(quiet, `\n${report}\n`);
        return { valid: false, kind: 'dash', report, errors };
      }

      log(quiet, '\n✅ All validation checks passed!\n');
      return { valid: true, kind: 'dash', report: result.report, errors: [] };
    }

    const report = 'Unrecognized spec kind';
    if (!quiet) console.error(report);
    return { valid: false, report, errors: [report] };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const report = `Validation failed: ${msg}`;
    if (!quiet) console.error(`\n❌ ${report}`);
    return { valid: false, report, errors: [msg] };
  }
}

/** Boolean wrapper for CLI. */
export async function validateSpecFile(
  specPath: string,
  options: ValidateOptions = {}
): Promise<boolean> {
  const result = await validateSpecFileWithResult(specPath, options);
  return result.valid;
}

export async function loadSpec(path: string, projectRoot = process.cwd()): Promise<DashboardSpec> {
  await applyDvfcConfig(projectRoot);
  const { spec } = await normalizeFile(path, projectRoot);
  return spec;
}

export async function loadNormalized(
  path: string,
  projectRoot = process.cwd()
): Promise<NormalizeResult> {
  await applyDvfcConfig(projectRoot);
  return normalizeFile(path, projectRoot);
}

export { applyDvfcConfig };
