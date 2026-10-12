import type { ChartSpec } from '@dvfc/core';
import { DEFAULT_CATEGORICAL } from '@dvfc/core';

/** Shared Vega-Lite theme config used by all builtin marks. */
export const themeConfig = {
  view: { stroke: null },
  axis: {
    labelColor: '#607078',
    titleColor: '#24343c',
    grid: false,
    gridColor: '#e7edef',
    domainColor: '#c5d0d4',
    tickColor: '#c5d0d4',
    labelFont: 'Inter, system-ui, sans-serif',
    titleFont: 'Inter, system-ui, sans-serif',
  },
  title: {
    color: '#13242c',
    font: 'Inter, system-ui, sans-serif',
    fontSize: 16,
    anchor: 'start',
  },
  range: {
    category: [...DEFAULT_CATEGORICAL],
  },
} as const;

/** Single-series mark color: first entry of the shared categorical palette. */
export const ACCENT = DEFAULT_CATEGORICAL[0];

/** Merge a categorical palette into a Vega-Lite top-level `config`. */
export function withPalette(
  vl: Record<string, unknown>,
  palette?: readonly string[]
): Record<string, unknown> {
  if (palette?.length) {
    const prev = (vl.config ?? {}) as Record<string, unknown>;
    vl.config = { ...prev, range: { category: [...palette] } };
  }
  return vl;
}

export function baseSpec(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title: chart.title,
    data: { values },
    width: chart.width ?? 520,
    height: chart.height ?? 300,
    background: 'transparent',
    config: themeConfig,
  };
}
