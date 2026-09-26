import type { DcMarkContext } from './shared.js';
import { esc, isTemporalField, sizePrelude, tipHitLayerCode } from './shared.js';

export function generateLineMark(ctx: DcMarkContext): string {
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
    brush,
    pub,
    xLabel,
    yLabel,
    reduce,
    valueAccessor,
    titleValue,
  } = ctx;
  if (!x || !y) return `  console.warn('${chart.type} ${chart.id}: needs x,y');`;
  const isArea = chart.type === 'area';
  const temporal = isTemporalField(chart);
  const tipHits = tipHitLayerCode(ch, {
    eventSuffix: 'hits',
    className: 'dvfc-tip-hits',
    radius: 8,
    mode: 'line',
  });

  if (temporal) {
    return `
${sizePrelude(el, ch, w, h)}  const ${dim} = ${cf}.dimension((d) => {
    const v = d['${esc(x)}'];
    const t = v instanceof Date ? v : new Date(v);
    return isNaN(t.getTime()) ? null : t;
  });
  const ${grp} = ${dim}${reduce};
  const ${ch} = new dc.LineChart('${el}');
  const _ext_${ch} = d3.extent(${cf}.all(), (d) => {
    const v = d['${esc(x)}'];
    const t = v instanceof Date ? v : new Date(v);
    return isNaN(t.getTime()) ? null : t;
  }).filter(Boolean);
  ${ch}
    .width(_sz_${ch}.w)
    .height(_sz_${ch}.h)
    .margins({ top: 20, right: 24, bottom: 56, left: 56 })
    .dimension(${dim})
    .group(${grp})
    ${valueAccessor}
    .x(d3.scaleTime().domain(_ext_${ch}))
    .renderArea(${isArea})
    .brushOn(${brush || pub ? 'true' : 'false'})
    .renderDataPoints({ radius: 3, fillOpacity: 0.9, strokeOpacity: 0.9 })
    .renderHorizontalGridLines(false)
    .transitionDuration(750)
    .colors(['#1e3a5f'])
    .xAxisLabel('${xLabel}')
    .yAxisLabel('${yLabel}')
    .title((d) => {
      const k = d.key instanceof Date ? d3.timeFormat('%Y-%m-%d')(d.key) : String(d.key);
      return k + ': ' + ${titleValue};
    });
  ${ch}.xAxis().ticks(6);
  ${ch}.yAxis().ticks(5).tickFormat(d3.format('~s'));
${tipHits}
  charts.push(${ch});`;
  }

  // Ordinal / quantitative x (e.g. discovery_year): numeric linear axis, not time
  return `
${sizePrelude(el, ch, w, h)}  const ${dim} = ${cf}.dimension((d) => {
    const v = d['${esc(x)}'];
    const n = +v;
    return Number.isFinite(n) ? n : v;
  });
  const ${grp} = ${dim}${reduce};
  const ${ch} = new dc.LineChart('${el}');
  const _xs_${ch} = ${cf}.all().map((d) => +d['${esc(x)}']).filter(Number.isFinite);
  const _xdom_${ch} = _xs_${ch}.length ? d3.extent(_xs_${ch}) : [0, 1];
  ${ch}
    .width(_sz_${ch}.w)
    .height(_sz_${ch}.h)
    .margins({ top: 20, right: 24, bottom: 56, left: 56 })
    .dimension(${dim})
    .group(${grp})
    ${valueAccessor}
    .x(d3.scaleLinear().domain(_xdom_${ch}))
    .xUnits(dc.units.integers)
    .renderArea(${isArea})
    .brushOn(${brush || pub ? 'true' : 'false'})
    .renderDataPoints({ radius: 3, fillOpacity: 0.9, strokeOpacity: 0.9 })
    .renderHorizontalGridLines(false)
    .transitionDuration(750)
    .colors(['#1e3a5f'])
    .xAxisLabel('${xLabel}')
    .yAxisLabel('${yLabel}')
    .title((d) => String(d.key) + ': ' + ${titleValue});
  ${ch}.xAxis().ticks(6).tickFormat(d3.format('d'));
  ${ch}.yAxis().ticks(5).tickFormat(d3.format('~s'));
${tipHits}
  charts.push(${ch});`;
}
