/**
 * JSON Schema for DashboardSpec validation.
 * Theme / layout / encoding fragments come from schema-shared (single source).
 */

import {
  sharedDefinitions,
  themeConfigSchema,
  layoutConfigSchema,
} from './schema-shared.js';
import { BUILTIN_CHART_TYPE_IDS } from './chart-types.js';

export const DashboardSpecSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://dvfc.dev/schema/dashboard-spec.json',
  title: 'DashboardSpec',
  description: 'Schema for Data Viz Factory dashboard specifications',
  type: 'object',
  required: ['meta', 'data', 'charts'],
  properties: {
    meta: {
      type: 'object',
      required: ['title', 'version'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
      },
      additionalProperties: true,
    },
    data: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type'],
        properties: {
          id: { type: 'string' },
          type: {
            type: 'string',
            enum: ['dbt', 'csv', 'parquet', 'url', 'sql'],
          },
          model: { type: 'string' },
          path: { type: 'string' },
          sql: { type: 'string' },
        },
        oneOf: [{ required: ['model'] }, { required: ['path'] }],
      },
    },
    charts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type'],
        properties: {
          id: { type: 'string' },
          type: {
            type: 'string',
            enum: [...BUILTIN_CHART_TYPE_IDS],
          },
          dataSource: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
          encoding: {
            type: 'object',
            properties: {
              x: { $ref: '#/definitions/channelEncoding' },
              y: { $ref: '#/definitions/channelEncoding' },
              color: {
                oneOf: [{ $ref: '#/definitions/channelEncoding' }, { type: 'string' }],
              },
              size: {
                oneOf: [{ $ref: '#/definitions/channelEncoding' }, { type: 'number' }],
              },
            },
          },
          overlays: {
            type: 'array',
            items: { $ref: '#/definitions/analysisOverlay' },
          },
          interaction: {
            type: 'object',
            properties: {
              brush: { type: 'boolean' },
              brushAxis: { type: 'string', enum: ['x', 'y', 'xy'] },
              select: {
                oneOf: [
                  { type: 'boolean' },
                  { type: 'string', enum: ['auto', 'x', 'y', 'xy'] },
                ],
              },
              selection: { type: 'string' },
              publishes: { type: 'string' },
              filterBy: { type: 'string' },
            },
          },
          width: { type: 'number', minimum: 0 },
          height: { type: 'number', minimum: 0 },
        },
        if: { properties: { type: { const: 'text' } } },
        then: { required: ['id', 'type', 'content'] },
        else: { required: ['id', 'type', 'dataSource', 'encoding'] },
      },
    },
    layout: layoutConfigSchema,
    theme: themeConfigSchema,
  },
  definitions: {
    channelEncoding: sharedDefinitions.channelEncoding,
    analysisOverlay: sharedDefinitions.analysisOverlay,
  },
} as const;

/**
 * Shallow structural check (meta/data/charts present).
 * For IR authoring validation use `@dvfc/build`'s `validateChartWithReport` /
 * `validateDashWithReport`.
 */
export function validateDashboardSpecShape(spec: unknown): {
  valid: boolean;
  errors?: string[];
} {
  const errors: string[] = [];

  if (typeof spec !== 'object' || spec === null) {
    return { valid: false, errors: ['Spec must be an object'] };
  }

  const s = spec as Record<string, unknown>;

  if (!s.meta || typeof s.meta !== 'object') {
    errors.push('Missing or invalid "meta" field');
  }
  if (!Array.isArray(s.data)) {
    errors.push('Missing or invalid "data" array');
  }
  if (!Array.isArray(s.charts)) {
    errors.push('Missing or invalid "charts" array');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
