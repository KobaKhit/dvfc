/**
 * MetricFlow / dbt semantic layer: compile metric → SQL
 *
 * Resolution order for data.type: dbt_metric:
 * 1. Checked-in fixture: semantic/<metric>.sql or metrics/<metric>.sql
 * 2. Live invoke: `mf query --explain` or `dbt sl query --compile`
 *
 * Env:
 *   DVFC_METRICFLOW_BIN   — override binary (default: auto-detect mf / dbt)
 *   DVFC_METRICFLOW_MODE  — mf | dbt-sl | auto (default auto)
 *   DVFC_DBT_PROJECT      — dbt project root (else walk parents for dbt_project.yml)
 *   DVFC_METRICFLOW_CACHE — if "1", write compiled SQL to semantic/<metric>.sql
 *   DVFC_METRICFLOW_SKIP  — if "1", skip live invoke (fixtures only)
 */

import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, resolve as resolvePath } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { DataRefDbtMetric } from './ir.js';

const execFileAsync = promisify(execFile);

export interface MetricFlowCompileOptions {
  specDir: string;
  projectRoot?: string;
  /** Override cwd for mf/dbt (dbt project root) */
  dbtProjectDir?: string;
  /** Skip live CLI invoke */
  skipInvoke?: boolean;
  /** Cache compiled SQL under semantic/ */
  cache?: boolean;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Locate checked-in compiled SQL for a metric */
export async function findMetricFixtureSql(
  metric: string,
  opts: { specDir: string; projectRoot?: string; dbtStubDir?: string }
): Promise<string | null> {
  const dbtStub = opts.dbtStubDir ?? join(opts.specDir, 'dbt-stub');
  const candidates = [
    join(opts.specDir, 'semantic', `${metric}.sql`),
    join(opts.specDir, 'metrics', `${metric}.sql`),
    join(opts.projectRoot ?? opts.specDir, 'semantic', `${metric}.sql`),
    join(dbtStub, 'semantic', `${metric}.sql`),
  ];
  for (const p of candidates) {
    if (await fileExists(p)) {
      return readFile(p, 'utf-8');
    }
  }
  return null;
}

/** Walk up from start looking for dbt_project.yml */
export async function findDbtProjectRoot(start: string): Promise<string | null> {
  let dir = resolvePath(start);
  for (let i = 0; i < 12; i++) {
    if (await fileExists(join(dir, 'dbt_project.yml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function detectMode(): 'mf' | 'dbt-sl' {
  const mode = (process.env.DVFC_METRICFLOW_MODE || 'auto').toLowerCase();
  if (mode === 'mf' || mode === 'metricflow') return 'mf';
  if (mode === 'dbt-sl' || mode === 'dbt_sl' || mode === 'sl') return 'dbt-sl';
  // auto: prefer DVFC_METRICFLOW_BIN hint, else mf
  const bin = process.env.DVFC_METRICFLOW_BIN || '';
  if (bin.includes('dbt')) return 'dbt-sl';
  return 'mf';
}

/**
 * Extract SQL from MetricFlow / dbt sl explain/compile output.
 * Strips spinner lines and takes the largest SELECT-looking block.
 */
export function extractSqlFromMetricFlowOutput(stdout: string): string {
  const cleaned = stdout
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/.test(t)) return false;
      if (/^initiating query/i.test(t)) return false;
      if (/^🔎/.test(t)) return false;
      if (/^sql:/i.test(t)) return false;
      return true;
    })
    .join('\n');

  // Prefer fenced sql blocks
  const fence = cleaned.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (fence?.[1]?.trim()) return fence[1].trim();

  // Find SELECT … to end (or first blank line after substantial SQL)
  const selectIdx = cleaned.search(/\bselect\b/i);
  if (selectIdx >= 0) {
    let sql = cleaned.slice(selectIdx).trim();
    // Cut trailing status lines
    sql = sql.replace(/\n(?:Query|Returned|Success|Error).*$/is, '').trim();
        if (sql.length > 10) return sql;
  }

  throw new Error(
    'Could not parse SQL from MetricFlow output. Use --explain/--compile and ensure mf/dbt sl is configured.'
  );
}

function buildArgs(
  mode: 'mf' | 'dbt-sl',
  ref: DataRefDbtMetric
): { bin: string; args: string[] } {
  const metrics = ref.metric;
  const groupBy = (ref.group_by ?? ['metric_time']).join(',');
  const where = ref.where;

  if (mode === 'dbt-sl') {
    const bin = process.env.DVFC_METRICFLOW_BIN || 'dbt';
    const args = [
      'sl',
      'query',
      '--metrics',
      metrics,
      '--group-by',
      groupBy,
      '--compile',
    ];
    if (where) args.push('--where', where);
    return { bin, args };
  }

  const bin = process.env.DVFC_METRICFLOW_BIN || 'mf';
  const args = [
    'query',
    '--metrics',
    metrics,
    '--group-by',
    groupBy,
    '--explain',
  ];
  if (where) args.push('--where', where);
  // Prefer quiet if available (MetricFlow ≥ Feb 2025)
  args.push('--quiet');
  return { bin, args };
}

/**
 * Invoke MetricFlow CLI to compile metric SQL.
 */
export async function invokeMetricFlow(
  ref: DataRefDbtMetric,
  opts: MetricFlowCompileOptions
): Promise<string> {
  if (opts.skipInvoke || process.env.DVFC_METRICFLOW_SKIP === '1') {
    throw new Error('MetricFlow invoke skipped (DVFC_METRICFLOW_SKIP or skipInvoke)');
  }

  const cwd =
    opts.dbtProjectDir ||
    process.env.DVFC_DBT_PROJECT ||
    (await findDbtProjectRoot(opts.specDir)) ||
    (await findDbtProjectRoot(opts.projectRoot ?? opts.specDir)) ||
    opts.projectRoot ||
    opts.specDir;

  const mode = detectMode();
  const { bin, args } = buildArgs(mode, ref);

  let stdout: string;
  let stderr: string;
  try {
    const result = await execFileAsync(bin, args, {
      cwd,
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120_000,
    });
    stdout = result.stdout || '';
    stderr = result.stderr || '';
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    // Some mf versions write SQL to stdout even on non-zero; try parse
    if (e.stdout && /\bselect\b/i.test(e.stdout)) {
      stdout = e.stdout;
      stderr = e.stderr || '';
    } else {
      // Retry without --quiet if unsupported
      if (args.includes('--quiet')) {
        const retryArgs = args.filter((a) => a !== '--quiet');
        try {
          const result = await execFileAsync(bin, retryArgs, {
            cwd,
            env: process.env,
            maxBuffer: 10 * 1024 * 1024,
            timeout: 120_000,
          });
          stdout = result.stdout || '';
          stderr = result.stderr || '';
        } catch (err2: unknown) {
          const e2 = err2 as { stdout?: string; stderr?: string; message?: string };
          throw new Error(
            `MetricFlow invoke failed (${bin} ${retryArgs.join(' ')}) in ${cwd}:\n` +
              `${e2.stderr || e2.stdout || e2.message || String(err2)}`
          );
        }
      } else {
        throw new Error(
          `MetricFlow invoke failed (${bin} ${args.join(' ')}) in ${cwd}:\n` +
            `${e.stderr || e.stdout || e.message || String(err)}`
        );
      }
    }
  }

  const combined = `${stdout}\n${stderr}`;
  return extractSqlFromMetricFlowOutput(combined);
}

/**
 * Resolve dbt_metric → SQL string (fixture first, then live MetricFlow).
 */
export async function compileDbtMetricSql(
  ref: DataRefDbtMetric,
  opts: MetricFlowCompileOptions & { dbtStubDir?: string }
): Promise<{ sql: string; source: 'fixture' | 'metricflow' }> {
  const fixture = await findMetricFixtureSql(ref.metric, opts);
  if (fixture) {
    return { sql: fixture, source: 'fixture' };
  }

  try {
    const sql = await invokeMetricFlow(ref, opts);
    const cache =
      opts.cache === true || process.env.DVFC_METRICFLOW_CACHE === '1';
    if (cache) {
      const out = join(opts.specDir, 'semantic', `${ref.metric}.sql`);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(
        out,
        `-- Compiled by MetricFlow for metric ${ref.metric}\n${sql}\n`
      );
    }
    return { sql, source: 'metricflow' };
  } catch (err) {
    throw new Error(
      `dbt_metric '${ref.metric}' not resolved.\n` +
        `  Tried fixtures under semantic/${ref.metric}.sql and metrics/${ref.metric}.sql\n` +
        `  MetricFlow: ${err instanceof Error ? err.message : String(err)}\n` +
        `  Tip: run \`dbt parse\` then \`mf query --metrics ${ref.metric} --group-by metric_time --explain\`, ` +
        `or commit compiled SQL under semantic/. See docs/dbt-metrics.md.`
    );
  }
}
