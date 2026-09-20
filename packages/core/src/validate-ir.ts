/**
 * Validate ChartIR / DashIR against schemas + chart type registry
 */

import type { ChartIR, DashIR } from './ir.js';
import { isDashChartRef } from './ir.js';
import { ChartIRSchema, DashIRSchema } from './ir-schema.js';
import { getChartType, hasChartType, listChartTypes } from './registry.js';
import { registerBuiltinChartTypes } from './builtins.js';

export interface IrValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface IrValidationResult {
  valid: boolean;
  errors: IrValidationError[];
}

type AjvLike = {
  compile: (schema: object) => ((data: unknown) => boolean) & {
    errors?: Array<{
      instancePath?: string;
      message?: string;
      params?: Record<string, unknown>;
      data?: unknown;
      keyword?: string;
    }> | null;
  };
};

function formatAjvErrors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  validate: any
): IrValidationError[] {
  return (validate.errors || []).map((err: {
    instancePath?: string;
    message?: string;
    params?: { missingProperty?: string; allowedValues?: string[]; type?: string };
    data?: unknown;
    keyword?: string;
  }) => {
    const path = err.instancePath || '/';
    let message = err.message || 'Validation error';
    if (err.keyword === 'required') {
      message = `Missing required field: ${err.params?.missingProperty}`;
    } else if (err.keyword === 'enum') {
      message = `Invalid value. Must be one of: ${err.params?.allowedValues?.join(', ')}`;
    } else if (err.keyword === 'type') {
      message = `Expected type ${err.params?.type}`;
    } else if (err.keyword === 'oneOf') {
      message = 'Must match exactly one allowed chart entry shape (ref or inline chart)';
    }
    return {
      path: path === '/' ? '(root)' : path,
      message,
      value: err.data,
    };
  });
}

/**
 * Validate with an Ajv instance passed from the CLI (keeps ajv out of core deps optional).
 * If ajv is omitted, only structural + registry checks run.
 */
export function validateChartIR(
  chart: unknown,
  opts: { ajv?: AjvLike; ensureBuiltins?: boolean } = {}
): IrValidationResult {
  if (opts.ensureBuiltins !== false) {
    registerBuiltinChartTypes();
  }

  const errors: IrValidationError[] = [];

  if (opts.ajv) {
    const validate = opts.ajv.compile(ChartIRSchema as object);
    if (!validate(chart)) {
      errors.push(...formatAjvErrors(validate));
    }
  } else if (!chart || typeof chart !== 'object') {
    errors.push({ path: '(root)', message: 'Chart must be an object' });
  }

  const c = chart as Partial<ChartIR>;
  if (c && typeof c === 'object') {
    if (typeof c.type === 'string' && !hasChartType(c.type)) {
      errors.push({
        path: '/type',
        message: `Unknown chart type '${c.type}'. Registered: ${getChartTypeList()}`,
      });
    } else if (typeof c.type === 'string') {
      const mod = getChartType(c.type);
      if (mod?.validate) {
        errors.push(...mod.validate(chart));
      }
    }

    if (c.type !== 'text') {
      if (!c.data && !c.dataSource) {
        errors.push({
          path: '/data',
          message: 'Chart requires `data` (dbt_metric|dbt|sql|data) or legacy `dataSource`',
        });
      }
      if (c.data) {
        errors.push(...validateDataRef(c.data, '/data'));
      }
      if (Array.isArray(c.measures) && c.measures.length > 1) {
        errors.push(...validateMeasureGrain(c, '/measures'));
      }
    } else if (!c.content) {
      errors.push({ path: '/content', message: 'Text charts require content' });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateDashIR(
  dash: unknown,
  opts: { ajv?: AjvLike; ensureBuiltins?: boolean } = {}
): IrValidationResult {
  if (opts.ensureBuiltins !== false) {
    registerBuiltinChartTypes();
  }

  const errors: IrValidationError[] = [];

  if (opts.ajv) {
    const validate = opts.ajv.compile(DashIRSchema as object);
    if (!validate(dash)) {
      errors.push(...formatAjvErrors(validate));
    }
  } else if (!dash || typeof dash !== 'object') {
    errors.push({ path: '(root)', message: 'Dash must be an object' });
  }

  const d = dash as Partial<DashIR>;
  if (d && typeof d === 'object' && Array.isArray(d.charts)) {
    const dataIds = new Set((d.data ?? []).map((x) => x.id));
    const published = new Set<string>();

    d.charts.forEach((entry, i) => {
      const path = `/charts/${i}`;
      if (isDashChartRef(entry)) {
        if (!entry.chart) {
          errors.push({ path: `${path}/chart`, message: 'Chart ref requires chart id/path' });
        }
        return;
      }

      const chartResult = validateChartIR(entry, { ajv: opts.ajv, ensureBuiltins: false });
      for (const err of chartResult.errors) {
        errors.push({ ...err, path: `${path}${err.path === '(root)' ? '' : err.path}` });
      }

      if (entry.dataSource && dataIds.size > 0 && !dataIds.has(entry.dataSource)) {
        errors.push({
          path: `${path}/dataSource`,
          message: `dataSource '${entry.dataSource}' not found in dash.data`,
        });
      }

      const pub = entry.interaction?.publishes ?? entry.interaction?.selection;
      if (pub) published.add(pub);
    });

    d.charts.forEach((entry, i) => {
      if (isDashChartRef(entry)) return;
      const filterBy = entry.interaction?.filterBy;
      if (filterBy && published.size > 0 && !published.has(filterBy)) {
        // Soft: refs may publish after resolve — only error when all charts are inline
        const allInline = d.charts!.every((e) => !isDashChartRef(e));
        if (allInline) {
          errors.push({
            path: `/charts/${i}/interaction/filterBy`,
            message: `Selection '${filterBy}' not published by any chart. Available: ${Array.from(published).join(', ') || '(none)'}`,
          });
        }
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

function validateDataRef(
  data: ChartIR['data'],
  path: string
): IrValidationError[] {
  if (!data) return [];
  const errors: IrValidationError[] = [];
  switch (data.type) {
    case 'dbt_metric':
      if (!data.metric) errors.push({ path: `${path}/metric`, message: 'dbt_metric requires metric' });
      break;
    case 'dbt':
      if (!data.model) errors.push({ path: `${path}/model`, message: 'dbt requires model' });
      break;
    case 'sql':
      if (!data.sql) errors.push({ path: `${path}/sql`, message: 'sql requires sql string' });
      break;
    case 'data':
      if (!data.path && !data.table) {
        errors.push({ path, message: 'data requires path or table' });
      }
      break;
    default:
      errors.push({ path: `${path}/type`, message: `Unknown data type` });
  }
  return errors;
}

/**
 * Multi-measure charts must share a grain: either all measures use the chart-level
 * data binding (field only), or each measure's DataRef must be the same connector kind
 * and not mix incompatible bindings without a shared chart.data / dataSource.
 */
function validateMeasureGrain(
  chart: Partial<ChartIR>,
  path: string
): IrValidationError[] {
  const measures = chart.measures ?? [];
  const errors: IrValidationError[] = [];
  const withOwnData = measures.filter((m) => m.data);
  const fieldOnly = measures.filter((m) => !m.data && m.field);

  if (withOwnData.length && fieldOnly.length && !chart.data && !chart.dataSource) {
    errors.push({
      path,
      message:
        'Grain mismatch: mix of measures with own `data` and field-only measures requires chart-level `data` or `dataSource`',
    });
  }

  if (withOwnData.length > 1) {
    const kinds = new Set(withOwnData.map((m) => m.data!.type));
    if (kinds.size > 1) {
      errors.push({
        path,
        message: `Grain mismatch: measures use incompatible connector types (${[...kinds].join(', ')}). Align to one kind or use a shared chart.data relation.`,
      });
    }
    const groupBys = withOwnData
      .map((m) =>
        m.data?.type === 'dbt_metric' ? (m.data.group_by ?? []).join(',') : null
      )
      .filter((g): g is string => g !== null);
    if (groupBys.length > 1 && new Set(groupBys).size > 1) {
      errors.push({
        path,
        message: `Grain mismatch: dbt_metric measures have different group_by grains (${groupBys.join(' vs ')})`,
      });
    }
  }

  return errors;
}

function getChartTypeList(): string {
  registerBuiltinChartTypes();
  return listChartTypes()
    .map((t) => t.id)
    .join(', ');
}
