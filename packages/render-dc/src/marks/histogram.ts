import type { DcMarkContext } from './shared.js';
import { esc, sizePrelude } from './shared.js';

export function generateHistogramMark(ctx: DcMarkContext): string {
  const { chart, cf, el, w, h, dim, grp, ch, x, xLabel } = ctx;
  if (!x) return `  console.warn('histogram ${chart.id}: needs x');`;
  const bins = chart.encoding?.x?.bins || 20;
  return `
  (function() {
${sizePrelude(el, ch, w, h)}    const vals = ${cf}.all().map((d) => +d['${esc(x)}']).filter((n) => Number.isFinite(n));
    const [lo, hi] = d3.extent(vals);
    const span = (hi - lo) || 1;
    const step = span / ${bins};
    const ${dim} = ${cf}.dimension((d) => {
      const v = +d['${esc(x)}'];
      if (!Number.isFinite(v)) return null;
      return lo + Math.floor((v - lo) / step) * step;
    });
    const ${grp} = ${dim}.group().reduceCount();
    const ${ch} = new dc.BarChart('${el}');
    ${ch}
      .width(_sz_${ch}.w)
      .height(_sz_${ch}.h)
      .margins({ top: 20, right: 24, bottom: 56, left: 56 })
      .dimension(${dim})
      .group(${grp})
      .x(d3.scaleLinear().domain([lo, hi + step]))
      .xUnits(dc.units.fp.precision(step))
      .brushOn(true)
      .elasticY(true)
      .transitionDuration(750)
      .colors(['#1e3a5f'])
      .xAxisLabel('${xLabel}')
      .yAxisLabel('Frequency')
      .title((d) => String(d.key) + ': ' + d3.format(',')(d.value));
    ${ch}.xAxis().ticks(6).tickFormat(d3.format('~s'));
    ${ch}.yAxis().ticks(5).tickFormat(d3.format('~s'));
    charts.push(${ch});
  })();`;
}
