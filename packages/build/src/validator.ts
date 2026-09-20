/**
 * Spec validation (JSON Schema + semantics). Shared by CLI and MCP.
 * Authoring validate is ChartIR / DashIR only.
 */

import Ajv from 'ajv';
import type { ChartIR, DashIR } from '@dvfc/core';
import {
  validateChartIR,
  validateDashIR,
  registerBuiltinChartTypes,
} from '@dvfc/core';

const ajv = new Ajv({ allErrors: true, verbose: true, strict: false });

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateChartWithReport(chart: ChartIR): { valid: boolean; report: string } {
  registerBuiltinChartTypes();
  const result = validateChartIR(chart, { ajv });
  if (result.valid) {
    return { valid: true, report: '✅ Chart spec is valid' };
  }
  const lines = ['❌ Chart validation failed:\n'];
  result.errors.forEach((err, i) => {
    lines.push(`${i + 1}. Path: ${err.path}`);
    lines.push(`   Error: ${err.message}\n`);
  });
  return { valid: false, report: lines.join('\n') };
}

export function validateDashWithReport(dash: DashIR): { valid: boolean; report: string } {
  registerBuiltinChartTypes();
  const result = validateDashIR(dash, { ajv });
  if (result.valid) {
    return { valid: true, report: '✅ Dash spec is valid' };
  }
  const lines = ['❌ Dash validation failed:\n'];
  result.errors.forEach((err, i) => {
    lines.push(`${i + 1}. Path: ${err.path}`);
    lines.push(`   Error: ${err.message}\n`);
  });
  return { valid: false, report: lines.join('\n') };
}
