import type { DcMarkContext } from './shared.js';
import { esc, sizePrelude } from './shared.js';

export function generateHeatmapMark(ctx: DcMarkContext): string {
  const {
    chart,
    cf,
    el,
    w,
    h,
    dim,
    grp,
    ch,
    x,
    y,
    color,
    yAgg,
  } = ctx;
  if (!x || !y) return `  console.warn('heatmap ${chart.id}: needs x,y');`;
  // Array keys — string "\\0" keys break dc filters (cannot set isFiltered on string)
  const zField = color || y;
  const colorAgg =
    chart.encoding?.color &&
    typeof chart.encoding.color === 'object' &&
    chart.encoding.color.aggregate === 'count'
      ? 'count'
      : yAgg === 'count' && zField === y
        ? 'count'
        : 'sum';
  const heatReduce =
    colorAgg === 'count'
      ? `.group().reduceCount()`
      : `.group().reduceSum((d) => +d['${esc(zField!)}'] || 1)`;
  return `
${sizePrelude(el, ch, w, h)}  const ${dim} = ${cf}.dimension((d) => [String(d['${esc(x)}'] ?? ''), String(d['${esc(y)}'] ?? '')]);
  const ${grp} = ${dim}${heatReduce};
  const ${ch} = new dc.HeatMap('${el}');
  ${ch}
    .width(_sz_${ch}.w)
    .height(_sz_${ch}.h)
    .margins({ top: 16, right: 24, bottom: 72, left: 110 })
    .dimension(${dim})
    .group(${grp})
    .keyAccessor((d) => d.key[0])
    .valueAccessor((d) => d.key[1])
    .colorAccessor((d) => d.value)
    .colors(d3.scaleSequential(d3.interpolateBlues))
    .calculateColorDomain()
    .colsLabel((d) => d)
    .rowsLabel((d) => d)
    .title((d) => d.key[0] + ' × ' + d.key[1] + ': ' + d3.format(',')(d.value))
    .transitionDuration(0)
    .xBorderRadius(2)
    .yBorderRadius(2);
  charts.push(${ch});`;
}
