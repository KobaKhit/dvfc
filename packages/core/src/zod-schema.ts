/**
 * Zod schemas — single source of truth for ThemeConfig and LayoutConfig.
 * JSON Schema fragments for Ajv / Python are derived via z.toJSONSchema.
 */

import { z } from 'zod';

export const ThemeConfigZ = z
  .object({
    colors: z.array(z.string()).optional(),
    fontFamily: z.string().optional(),
    backgroundColor: z.string().optional(),
    /** Draw bordered cards around each chart. Off by default. */
    chartBorders: z.boolean().optional(),
  })
  .strict();

export type ThemeConfigZod = z.infer<typeof ThemeConfigZ>;

export const LayoutConfigZ = z
  .object({
    type: z.enum(['grid', 'flex', 'stack']).optional(),
    columns: z.number().min(1).optional(),
    gap: z.number().min(0).optional(),
  })
  .strict();

export type LayoutConfigZod = z.infer<typeof LayoutConfigZ>;

/** Draft-07-ish JSON Schema fragment for ThemeConfig (for embedding in larger schemas). */
export function themeConfigJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(ThemeConfigZ) as Record<string, unknown>;
}

export function layoutConfigJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(LayoutConfigZ) as Record<string, unknown>;
}

export function parseThemeConfig(input: unknown): ThemeConfigZod {
  return ThemeConfigZ.parse(input);
}
