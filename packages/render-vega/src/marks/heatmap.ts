import type { ChartSpec } from '@dvfc/core';
import { baseSpec } from './theme.js';
import { channelType } from './channel.js';

export function heatmapToVegaLite(
  chart: ChartSpec,
  values: Record<string, unknown>[]
): Record<string, unknown> {
  const x = chart.encoding?.x;
  const y = chart.encoding?.y;
  const color = chart.encoding?.color;
  if (!x || !y) {
    return {
      ...baseSpec(chart, values),
      mark: { type: 'point' },
      encoding: {},
    };
  }

  const colorChannel =
    color && typeof color !== 'string'
      ? {
          field: color.field,
          type: channelType(color) ?? 'quantitative',
          aggregate: color.aggregate ?? 'mean',
          title: color.label,
          scale: { scheme: 'teals' },
        }
      : { aggregate: 'count', type: 'quantitative', scale: { scheme: 'teals' } };

  return {
    ...baseSpec(chart, values),
    mark: { type: 'rect', cornerRadius: 3, stroke: '#ffffff', strokeWidth: 2 },
    encoding: {
      x: { field: x.field, type: channelType(x) ?? 'nominal', title: x.label },
      y: { field: y.field, type: channelType(y) ?? 'nominal', title: y.label },
      color: colorChannel,
      tooltip: [
        { field: x.field, type: channelType(x) ?? 'nominal', title: x.label },
        { field: y.field, type: channelType(y) ?? 'nominal', title: y.label },
        colorChannel,
      ],
    },
  };
}
