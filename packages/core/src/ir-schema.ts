/**
 * JSON Schemas for ChartIR and DashIR.
 * Encoding / overlay / theme / layout fragments come from schema-shared.
 */

import {
  channelEncodingSchema,
  analysisOverlaySchema,
  themeConfigSchema,
  layoutConfigSchema,
} from './schema-shared.js';

const dataRef = {
  type: 'object',
  required: ['type'],
  properties: {
    type: {
      type: 'string',
      enum: ['dbt_metric', 'dbt', 'sql', 'data'],
    },
    metric: { type: 'string' },
    group_by: { type: 'array', items: { type: 'string' } },
    where: { type: 'string' },
    model: { type: 'string' },
    sql: { type: 'string' },
    path: { type: 'string' },
    table: { type: 'string' },
  },
  additionalProperties: true,
} as const;

const interaction = {
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
  additionalProperties: false,
} as const;

/** Shared chart body (standalone or inline in a dash) */
export const ChartBodySchema = {
  type: 'object',
  required: ['id', 'type'],
  properties: {
    id: { type: 'string', minLength: 1 },
    type: { type: 'string', minLength: 1 },
    title: { type: 'string' },
    description: { type: 'string' },
    data: dataRef,
    dataSource: { type: 'string' },
    encoding: {
      type: 'object',
      properties: {
        x: channelEncodingSchema,
        y: channelEncodingSchema,
        color: {
          oneOf: [channelEncodingSchema, { type: 'string' }],
        },
        size: {
          oneOf: [channelEncodingSchema, { type: 'number' }],
        },
      },
      additionalProperties: true,
    },
    content: { type: 'string' },
    measures: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
          field: { type: 'string' },
          data: dataRef,
          label: { type: 'string' },
        },
      },
    },
    interaction,
    overlays: {
      type: 'array',
      items: analysisOverlaySchema,
    },
    width: { type: 'number', minimum: 0 },
    height: { type: 'number', minimum: 0 },
    options: { type: 'object' },
  },
  additionalProperties: true,
} as const;

export const ChartIRSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://dvfc.dev/schema/chart.json',
  title: 'ChartIR',
  description: 'dvfc atomic chart specification',
  ...ChartBodySchema,
} as const;

const dashChartRef = {
  type: 'object',
  required: ['chart'],
  properties: {
    chart: { type: 'string', minLength: 1 },
    id: { type: 'string' },
    title: { type: 'string' },
  },
  additionalProperties: false,
} as const;

export const DashIRSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://dvfc.dev/schema/dash.json',
  title: 'DashIR',
  description: 'dvfc dash (composed charts) specification',
  type: 'object',
  required: ['id', 'charts'],
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string' },
    description: { type: 'string' },
    version: { type: 'string' },
    meta: { type: 'object', additionalProperties: true },
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
      },
    },
    charts: {
      type: 'array',
      minItems: 0,
      items: {
        oneOf: [dashChartRef, ChartBodySchema],
      },
    },
    layout: layoutConfigSchema,
    coordination: {
      type: 'object',
      properties: {
        auto: { type: 'boolean' },
        selections: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            required: ['source'],
            properties: {
              source: { type: 'string' },
              axis: { type: 'string', enum: ['x', 'y', 'xy'] },
            },
          },
        },
      },
    },
    theme: themeConfigSchema,
  },
  additionalProperties: true,
} as const;
