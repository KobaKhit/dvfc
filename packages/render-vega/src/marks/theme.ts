import type { ChartSpec } from '@dvfc/core';

/** Shared Vega-Lite theme config used by all builtin marks. */
export const themeConfig = {
  view: { stroke: null },
  axis: {
    labelColor: '#607078',
    titleColor: '#24343c',
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
    category: [
      '#0b7f6e',
      '#36a18f',
      '#2f6f94',
      '#7a86c2',
      '#c47a1a',
      '#e1ad56',
      '#724f91',
      '#cc6b72',
    ],
  },
} as const;

export const ACCENT = '#0b7f6e';

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
