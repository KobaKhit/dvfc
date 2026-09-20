/**
 * Shared JSON Schema fragments used by both DashboardSpec and Chart/Dash IR schemas.
 * Theme + layout are derived from Zod (single source); encoding/overlays stay hand-written
 * for $ref-friendly embedding.
 */

import { themeConfigJsonSchema, layoutConfigJsonSchema } from './zod-schema.js';

export const channelEncodingSchema = {
  type: 'object',
  required: ['field'],
  properties: {
    field: { type: 'string' },
    type: {
      type: 'string',
      enum: ['quantitative', 'temporal', 'nominal', 'ordinal'],
    },
    aggregate: {
      type: 'string',
      enum: ['sum', 'avg', 'count', 'min', 'max', 'median'],
    },
    label: { type: 'string' },
    bins: { type: 'number' },
    sql: { type: 'string' },
  },
  additionalProperties: true,
} as const;

export const analysisOverlaySchema = {
  type: 'object',
  required: ['type'],
  properties: {
    type: {
      type: 'string',
      enum: ['mean', 'median', 'trend', 'moving_average'],
    },
    field: { type: 'string' },
    color: { type: 'string' },
    label: { type: 'string' },
    window: { type: 'number', minimum: 2 },
  },
} as const;

export const encodingSpecSchema = {
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
  additionalProperties: true,
} as const;

function asObjectSchema(raw: Record<string, unknown>): {
  type: 'object';
  properties: Record<string, unknown>;
  additionalProperties?: boolean;
} {
  const props = (raw.properties ?? {}) as Record<string, unknown>;
  return {
    type: 'object',
    properties: props,
    additionalProperties:
      typeof raw.additionalProperties === 'boolean' ? raw.additionalProperties : false,
  };
}

/** ThemeConfig — derived from ThemeConfigZ in zod-schema.ts */
export const themeConfigSchema = asObjectSchema(themeConfigJsonSchema());

/** LayoutConfig — derived from LayoutConfigZ */
export const layoutConfigSchema = asObjectSchema(layoutConfigJsonSchema());

export const sharedDefinitions = {
  channelEncoding: channelEncodingSchema,
  analysisOverlay: analysisOverlaySchema,
  encodingSpec: encodingSpecSchema,
  layoutConfig: layoutConfigSchema,
  themeConfig: themeConfigSchema,
};
