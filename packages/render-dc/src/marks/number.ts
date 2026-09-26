import type { DcMarkContext } from './shared.js';
import { esc } from './shared.js';

export function generateNumberMark(ctx: DcMarkContext): string {
  const { cf, el, dim, grp, ch, x, y } = ctx;
  const field = y || x || 'value';
  const agg = ctx.chart.encoding?.y?.aggregate || ctx.chart.encoding?.x?.aggregate || 'sum';
  const isCount = agg === 'count';
  const reduceBody = isCount
    ? `.groupAll().reduceCount()`
    : agg === 'avg'
      ? `.groupAll().reduce(
      (p, v) => { p.count++; p.total += +v['${esc(field)}'] || 0; return p; },
      (p, v) => { p.count--; p.total -= +v['${esc(field)}'] || 0; return p; },
      () => ({ count: 0, total: 0 })
    )`
      : `.groupAll().reduceSum((d) => +d['${esc(field)}'] || 0)`;
  const numAccessor = isCount
    ? `(d) => (typeof d === 'number' ? d : 0)`
    : agg === 'avg'
      ? `(d) => (d && d.count ? d.total / d.count : 0)`
      : `(d) => (typeof d === 'number' ? d : 0)`;
  const fmt = isCount ? `d3.format(',')` : `d3.format(',.2f')`;
  return `
  const ${dim} = ${cf}.dimension(() => 'all');
  const ${grp} = ${dim}${reduceBody};
  const ${ch} = new dc.NumberDisplay('${el}');
  ${ch}
    .group(${grp})
    .valueAccessor(${numAccessor})
    .formatNumber(${fmt})
    .html({
      one: '%number',
      some: '%number',
      none: '0'
    })
    .transitionDuration(750);
  charts.push(${ch});`;
}
