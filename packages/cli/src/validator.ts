/**
 * Validation utilities using JSON Schema
 */

import Ajv from 'ajv';
import type { DashboardSpec } from '@coordboard/core';
import { DashboardSpecSchema } from '@coordboard/core';

const ajv = new Ajv({ allErrors: true, verbose: true });

export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate dashboard spec against JSON Schema
 */
export function validateDashboardSpec(spec: unknown): ValidationResult {
  const validate = ajv.compile(DashboardSpecSchema);
  const valid = validate(spec);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = (validate.errors || []).map(err => {
    const path = err.instancePath || '/';
    let message = err.message || 'Validation error';
    
    // Enhance error messages
    if (err.keyword === 'required') {
      message = `Missing required field: ${err.params.missingProperty}`;
    } else if (err.keyword === 'enum') {
      message = `Invalid value. Must be one of: ${err.params.allowedValues?.join(', ')}`;
    } else if (err.keyword === 'type') {
      message = `Expected type ${err.params.type}, got ${typeof err.data}`;
    }

    return {
      path: path === '/' ? '(root)' : path,
      message,
      value: err.data
    };
  });

  return { valid: false, errors };
}

/**
 * Validate and provide detailed error report
 */
export function validateWithReport(spec: unknown): { valid: boolean; report: string } {
  const result = validateDashboardSpec(spec);
  
  if (result.valid) {
    return {
      valid: true,
      report: '✅ Dashboard spec is valid'
    };
  }

  const lines = ['❌ Dashboard spec validation failed:\n'];
  
  result.errors.forEach((err, i) => {
    lines.push(`${i + 1}. Path: ${err.path}`);
    lines.push(`   Error: ${err.message}`);
    if (err.value !== undefined) {
      lines.push(`   Value: ${JSON.stringify(err.value)}`);
    }
    lines.push('');
  });

  return {
    valid: false,
    report: lines.join('\n')
  };
}

/**
 * Additional semantic validation beyond schema
 */
export function validateSemantics(spec: DashboardSpec): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check that all chart data sources exist
  const dataSourceIds = new Set(spec.data.map(ds => ds.id));
  spec.charts.forEach(chart => {
    if (!dataSourceIds.has(chart.dataSource)) {
      errors.push({
        path: `/charts/${chart.id}/dataSource`,
        message: `Data source '${chart.dataSource}' not found in spec.data`
      });
    }
  });
  
  // Check that filterBy references valid selections
  const selectionNames = new Set<string>();
  spec.charts.forEach(chart => {
    if (chart.interaction?.selection) {
      selectionNames.add(chart.interaction.selection);
    }
  });
  
  spec.charts.forEach(chart => {
    if (chart.interaction?.filterBy && !selectionNames.has(chart.interaction.filterBy)) {
      errors.push({
        path: `/charts/${chart.id}/interaction/filterBy`,
        message: `Selection '${chart.interaction.filterBy}' not found. Available: ${Array.from(selectionNames).join(', ')}`
      });
    }
  });
  
  // Check for duplicate chart IDs
  const chartIds = new Set<string>();
  spec.charts.forEach(chart => {
    if (chartIds.has(chart.id)) {
      errors.push({
        path: `/charts/${chart.id}`,
        message: `Duplicate chart ID: ${chart.id}`
      });
    }
    chartIds.add(chart.id);
  });
  
  // Check for duplicate data source IDs
  const dsIds = new Set<string>();
  spec.data.forEach(ds => {
    if (dsIds.has(ds.id)) {
      errors.push({
        path: `/data/${ds.id}`,
        message: `Duplicate data source ID: ${ds.id}`
      });
    }
    dsIds.add(ds.id);
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
