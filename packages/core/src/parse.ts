/**
 * Parse chart/dash/board specs from YAML, TOML, or JSON
 */

import { parse as parseYAML } from 'yaml';
import { parse as parseTOML } from 'smol-toml';
import { basename, extname } from 'path';
import type { DashboardSpec } from './types.js';
import type { ChartIR, DashIR, SpecKind } from './ir.js';
import { isChartIR, isDashIR } from './ir.js';
import { isDashboardSpec } from './types.js';
import { boardToDash } from './compat.js';

export type ParsedSpec =
  | { kind: 'chart'; chart: ChartIR; raw: unknown }
  | { kind: 'dash'; dash: DashIR; raw: unknown }
  | { kind: 'board'; board: DashboardSpec; dash: DashIR; raw: unknown };

export function detectKindFromPath(filePath: string): SpecKind | 'unknown' {
  const base = basename(filePath).toLowerCase();
  if (base.endsWith('.chart.yaml') || base.endsWith('.chart.yml') || base.endsWith('.chart.json') || base.endsWith('.chart.toml')) {
    return 'chart';
  }
  if (base.endsWith('.dash.yaml') || base.endsWith('.dash.yml') || base.endsWith('.dash.json') || base.endsWith('.dash.toml')) {
    return 'dash';
  }
  if (base === 'board.yaml' || base === 'board.yml' || base === 'board.json' || base.includes('board.')) {
    return 'board';
  }
  return 'unknown';
}

export function parseSpecContent(content: string, format: 'yaml' | 'toml' | 'json'): unknown {
  switch (format) {
    case 'yaml':
      return parseYAML(content);
    case 'toml':
      return parseTOML(content);
    case 'json':
      return JSON.parse(content);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

export function formatFromPath(filePath: string): 'yaml' | 'toml' | 'json' {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.toml') return 'toml';
  if (ext === '.json') return 'json';
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  // *.chart.yaml → ext is .yaml
  throw new Error(`Cannot determine format from path: ${filePath}`);
}

/**
 * Infer kind from object shape when filename is ambiguous
 */
export function detectKindFromObject(obj: unknown): SpecKind | 'unknown' {
  if (isDashboardSpec(obj)) return 'board';
  if (isDashIR(obj)) return 'dash';
  if (isChartIR(obj)) return 'chart';
  return 'unknown';
}

/**
 * Parse a loaded object into a typed ParsedSpec
 */
export function interpretSpec(
  raw: unknown,
  opts: { path?: string; prefer?: SpecKind } = {}
): ParsedSpec {
  const fromPath = opts.path ? detectKindFromPath(opts.path) : 'unknown';
  const fromObj = detectKindFromObject(raw);
  const kind = opts.prefer ?? (fromPath !== 'unknown' ? fromPath : fromObj);

  if (kind === 'chart') {
    if (!isChartIR(raw)) {
      throw new Error('File declared as chart but missing id/type');
    }
    return { kind: 'chart', chart: raw, raw };
  }

  if (kind === 'dash') {
    if (!isDashIR(raw)) {
      throw new Error('File declared as dash but missing id/charts');
    }
    return { kind: 'dash', dash: raw, raw };
  }

  if (kind === 'board' || isDashboardSpec(raw)) {
    if (!isDashboardSpec(raw)) {
      throw new Error('File declared as board but invalid DashboardSpec shape');
    }
    const idGuess =
      opts.path != null
        ? basename(opts.path).replace(/\.(yaml|yml|json|toml)$/i, '') || 'board'
        : 'board';
    // Prefer parent folder name for examples/sales-board/board.yaml
    let dashId = idGuess;
    if (opts.path) {
      const parts = opts.path.replace(/\\/g, '/').split('/');
      const boardIdx = parts.findIndex((p) => p === 'board.yaml' || p === 'board.yml' || p === 'board.json');
      if (boardIdx > 0) {
        dashId = parts[boardIdx - 1] || dashId;
      }
    }
    return {
      kind: 'board',
      board: raw,
      dash: boardToDash(raw, { id: dashId === 'board' ? 'legacy-board' : dashId }),
      raw,
    };
  }

  // Fallback heuristics
  if (isDashIR(raw)) {
    return { kind: 'dash', dash: raw, raw };
  }
  if (isChartIR(raw)) {
    return { kind: 'chart', chart: raw, raw };
  }

  throw new Error(
    'Unrecognized spec: expected chart (id+type), dash (id+charts), or legacy board (meta+data+charts)'
  );
}

export function parseSpecString(
  content: string,
  opts: { path?: string; format?: 'yaml' | 'toml' | 'json'; prefer?: SpecKind } = {}
): ParsedSpec {
  const format =
    opts.format ??
    (opts.path ? formatFromPath(opts.path) : 'yaml');
  const raw = parseSpecContent(content, format);
  return interpretSpec(raw, { path: opts.path, prefer: opts.prefer });
}
