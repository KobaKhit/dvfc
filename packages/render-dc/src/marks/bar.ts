import type { DcMarkContext } from './shared.js';
import { esc, sizePrelude } from './shared.js';

export function generateBarMark(ctx: DcMarkContext): string {
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
    brush,
    pub,
    xLabel,
    yLabel,
    reduce,
    valueAccessor,
    palette,
    titleValue,
  } = ctx;
  if (!x) return `  console.warn('bar ${chart.id}: needs x');`;
  return `
${sizePrelude(el, ch, w, h)}  const ${dim} = ${cf}.dimension((d) => d['${esc(x)}']);
  const ${grp} = ${dim}${reduce};
  const ${ch} = new dc.BarChart('${el}');
  ${ch}
    .width(_sz_${ch}.w)
    .height(_sz_${ch}.h)
    .margins({ top: 20, right: 24, bottom: 56, left: 56 })
    .dimension(${dim})
    .group(${grp})
    ${valueAccessor}
    .x(d3.scaleBand())
    .xUnits(dc.units.ordinal)
    .brushOn(${brush || pub ? 'true' : 'false'})
    .elasticY(true)
    .renderHorizontalGridLines(false)
    .transitionDuration(750)
    .colors(${JSON.stringify([palette[0]])})
    .xAxisLabel('${xLabel}')
    .yAxisLabel('${yLabel}')
    .title((d) => String(d.key) + '\\n${yLabel}: ' + ${titleValue});
  ${ch}.yAxis().ticks(5).tickFormat(d3.format('~s'));
  charts.push(${ch});`;
}
