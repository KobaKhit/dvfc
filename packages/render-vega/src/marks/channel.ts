import type { ChannelEncoding } from '@dvfc/core';

export function channelType(ch: ChannelEncoding | undefined): string | undefined {
  if (!ch) return undefined;
  const t = ch.type;
  if (t === 'quantitative') return 'quantitative';
  if (t === 'temporal') return 'temporal';
  if (t === 'ordinal') return 'ordinal';
  if (t === 'nominal') return 'nominal';
  if (ch.aggregate) return 'quantitative';
  return undefined;
}

/** Standard x/y/color encoding shared by cartesian marks. */
export function cartesianEncoding(chart: {
  encoding?: {
    x?: ChannelEncoding;
    y?: ChannelEncoding;
    color?: ChannelEncoding | string;
  };
}): Record<string, unknown> {
  const encoding: Record<string, unknown> = {};
  if (chart.encoding?.x) {
    encoding.x = {
      field: chart.encoding.x.field,
      type: channelType(chart.encoding.x) ?? 'nominal',
      title: chart.encoding.x.label,
      aggregate: chart.encoding.x.aggregate,
    };
  }
  if (chart.encoding?.y) {
    encoding.y = {
      field: chart.encoding.y.field,
      type: channelType(chart.encoding.y) ?? 'quantitative',
      title: chart.encoding.y.label,
      aggregate: chart.encoding.y.aggregate,
    };
  }
  if (chart.encoding?.color && typeof chart.encoding.color !== 'string') {
    encoding.color = {
      field: chart.encoding.color.field,
      type: channelType(chart.encoding.color) ?? 'nominal',
    };
  } else if (typeof chart.encoding?.color === 'string') {
    encoding.color = { value: chart.encoding.color };
  }
  return encoding;
}
