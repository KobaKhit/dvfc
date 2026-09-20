import type { ChartSpec } from '@dvfc/core';
import { baseSpec } from './theme.js';
import { channelType } from './channel.js';

export function pieToVegaLite(
  chart: ChartSpec,
  values: Record<string, unknown>[],
  options: { innerRadius?: number } = {}
): Record<string, unknown> {
  const x = chart.encoding?.x;
  const y = chart.encoding?.y;
  if (!x || !y) {
    return {
      ...baseSpec(chart, values),
      mark: { type: 'point' },
      encoding: {},
    };
  }

  return {
    ...baseSpec(chart, values),
    mark: {
      type: 'arc',
      innerRadius: options.innerRadius ?? 0,
      outerRadius: 124,
      cornerRadius: 4,
      padAngle: 0.02,
    },
    encoding: {
      theta: {
        field: y.field,
        type: 'quantitative',
        aggregate: y.aggregate ?? 'sum',
        stack: true,
      },
      color: {
        field: x.field,
        type: channelType(x) ?? 'nominal',
        title: x.label,
      },
      tooltip: [
        { field: x.field, type: channelType(x) ?? 'nominal', title: x.label },
        {
          field: y.field,
          type: 'quantitative',
          aggregate: y.aggregate ?? 'sum',
          title: y.label,
          format: ',.2f',
        },
      ],
    },
  };
}
