/**
 * Parse chart/dash specs from YAML, TOML, or JSON.
 * Legacy board.yaml is not supported, use *.dash.yaml.
 */

import { parse as parseYAML } from 'yaml';
import { parse as parseTOML } from 'smol-toml';
import { basename, extname } from 'path';
import type { ChartIR, DashIR, SpecKind } from './ir.js';
import { isChartIR, isDashChartRef, isDashIR } from './ir.js';
import type { AggregateFunction, ChannelEncoding } from './types.js';
import { isDashboardSpec } from './types.js';

const FIELD_AGGREGATE = /^(sum|avg|count|min|max|median)\(([^)]+)\)$/;

/** `count(planet)` or `planet` → a channel. Objects with `field` pass through. */
export function parseChannelShorthand(value: unknown): ChannelEncoding | undefined {
  if (typeof value === 'string') {
    const text = value.trim();
    const match = text.match(FIELD_AGGREGATE);
    if (match) {
      return { field: match[2].trim(), aggregate: match[1] as AggregateFunction };
    }
    if (text) return { field: text };
    return undefined;
  }
  if (value && typeof value === 'object' && 'field' in value) {
    return value as ChannelEncoding;
  }
  return undefined;
}

/**
 * Accept the flat chart shape (`x: year`, `y: count(planet)`, `data: worlds`)
 * and the verbose encoding object. Existing specs are unchanged.
 */
export function expandChartShorthand(chart: ChartIR): ChartIR {
  const raw = chart as ChartIR & Record<string, unknown>;
  const encoding = { ...(raw.encoding ?? {}) } as Record<string, unknown>;
  for (const key of ['x', 'y', 'color', 'size'] as const) {
    const flat = raw[key];
    if (flat != null && encoding[key] == null) {
      const channel = parseChannelShorthand(flat);
      if (channel) encoding[key] = channel;
      delete raw[key];
    } else if (typeof encoding[key] === 'string') {
      const channel = parseChannelShorthand(encoding[key]);
      if (channel) encoding[key] = channel;
    }
  }
  if (Object.keys(encoding).length > 0) raw.encoding = encoding as ChartIR['encoding'];

  if (typeof raw.data === 'string') {
    raw.dataSource = raw.dataSource ?? raw.data;
    delete raw.data;
  }
  if (typeof raw.query === 'string') {
    raw.dataSource = raw.dataSource ?? raw.query;
    delete raw.query;
  }

  const interaction = { ...(raw.interaction ?? {}) } as Record<string, unknown>;
  for (const key of ['filterBy', 'publishes', 'brush', 'brushAxis', 'select'] as const) {
    if (raw[key] != null && interaction[key] == null) {
      interaction[key] = raw[key];
      delete raw[key];
    }
  }
  if (Object.keys(interaction).length > 0) {
    raw.interaction = interaction as ChartIR['interaction'];
  }
  return raw;
}

function expandDashCharts(dash: DashIR): void {
  for (const entry of dash.charts) {
    if (!isDashChartRef(entry)) expandChartShorthand(entry);
  }
}

export type ParsedSpec =
  | { kind: 'chart'; chart: ChartIR; raw: unknown }
  | { kind: 'dash'; dash: DashIR; raw: unknown };

export function detectKindFromPath(filePath: string): SpecKind | 'unknown' {
  const base = basename(filePath).toLowerCase();
  if (
    base.endsWith('.chart.yaml') ||
    base.endsWith('.chart.yml') ||
    base.endsWith('.chart.json') ||
    base.endsWith('.chart.toml')
  ) {
    return 'chart';
  }
  if (
    base.endsWith('.dash.yaml') ||
    base.endsWith('.dash.yml') ||
    base.endsWith('.dash.json') ||
    base.endsWith('.dash.toml')
  ) {
    return 'dash';
  }
  if (
    base === 'board.yaml' ||
    base === 'board.yml' ||
    base === 'board.json' ||
    /\.board\.(yaml|yml|json|toml)$/.test(base)
  ) {
    throw new Error(
      `Legacy board files are removed (${base}). Rename to *.dash.yaml (Dash IR). See docs/ARCHITECTURE.md.`
    );
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
  throw new Error(`Cannot determine format from path: ${filePath}`);
}

/**
 * Infer kind from object shape when filename is ambiguous
 */
export function detectKindFromObject(obj: unknown): SpecKind | 'unknown' {
  if (isDashIR(obj)) return 'dash';
  if (isChartIR(obj)) return 'chart';
  if (isDashboardSpec(obj)) {
    // meta+data+charts without dash id → old board shape
    return 'unknown';
  }
  return 'unknown';
}

/**
 * Parse a loaded object into a typed ParsedSpec
 */
export function interpretSpec(
  raw: unknown,
  opts: { path?: string; prefer?: SpecKind } = {}
): ParsedSpec {
  // Path check may throw for board.* filenames
  const fromPath = opts.path ? detectKindFromPath(opts.path) : 'unknown';
  const fromObj = detectKindFromObject(raw);
  const kind = opts.prefer ?? (fromPath !== 'unknown' ? fromPath : fromObj);

  if (kind === 'chart') {
    if (!isChartIR(raw)) {
      throw new Error('File declared as chart but missing id/type');
    }
    expandChartShorthand(raw);
    return { kind: 'chart', chart: raw, raw };
  }

  if (kind === 'dash') {
    if (!isDashIR(raw)) {
      throw new Error('File declared as dash but missing id/charts');
    }
    expandDashCharts(raw);
    return { kind: 'dash', dash: raw, raw };
  }

  if (isDashboardSpec(raw) && !isDashIR(raw)) {
    throw new Error(
      'Legacy board shape (meta + charts without dash `id`) is no longer supported. ' +
        'Convert to *.dash.yaml with top-level `id` and `charts`. See docs/ARCHITECTURE.md.'
    );
  }

  if (isDashIR(raw)) {
    expandDashCharts(raw);
    return { kind: 'dash', dash: raw, raw };
  }
  if (isChartIR(raw)) {
    expandChartShorthand(raw);
    return { kind: 'chart', chart: raw, raw };
  }

  throw new Error('Unrecognized spec: expected chart (id+type) or dash (id+charts)');
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
