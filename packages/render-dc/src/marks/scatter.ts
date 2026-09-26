import type { DcMarkContext } from './shared.js';
import { esc, sizePrelude, tipHitLayerCode } from './shared.js';

export function generateScatterMark(ctx: DcMarkContext): string {
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
    xLabel,
    yLabel,
  } = ctx;
  if (!x || !y) return `  console.warn('scatter ${chart.id}: needs x,y');`;
  const colorField = color;
  if (colorField) {
    // Note: dc.ScatterPlot.legendables() calls getColor() with no datum — cannot use dc.Legend.
    // Color points via key[2] and render a small HTML legend instead.
    const tipHits = tipHitLayerCode(ch, {
      eventSuffix: 'raise',
      className: 'dvfc-scatter-hits',
      radius: 7,
      mode: 'scatter',
    });
    return `
${sizePrelude(el, ch, w, h)}  const ${dim} = ${cf}.dimension((d) => [
    +d['${esc(x)}'] || 0,
    +d['${esc(y)}'] || 0,
    String(d['${esc(colorField)}'] ?? 'Unknown'),
  ]);
  const ${grp} = ${dim}.group();
  const ${ch} = new dc.ScatterPlot('${el}');
  const _sx_${ch} = d3.extent(${cf}.all(), (d) => +d['${esc(x)}'] || 0);
  const _sy_${ch} = d3.extent(${cf}.all(), (d) => +d['${esc(y)}'] || 0);
  const _cdom_${ch} = [...new Set(${cf}.all().map((d) => String(d['${esc(colorField)}'] ?? 'Unknown')))].sort();
  const _cpal_${ch} = ['#1e3a5f', '#7ba3c9', '#a89b8c', '#4a7c9b', '#c4b5a0', '#5c6b73', '#2f6f94', '#8b7355'];
  const _cscale_${ch} = d3.scaleOrdinal().domain(_cdom_${ch}).range(_cpal_${ch});
  ${ch}
    .width(_sz_${ch}.w)
    .height(_sz_${ch}.h)
    .margins({ top: 20, right: 24, bottom: 56, left: 56 })
    .dimension(${dim})
    .group(${grp})
    .x(d3.scaleLinear().domain(_sx_${ch}))
    .y(d3.scaleLinear().domain(_sy_${ch}))
    .keyAccessor((d) => (d && d.key ? d.key[0] : 0))
    .valueAccessor((d) => (d && d.key ? d.key[1] : 0))
    .colorAccessor((d) => (d && d.key ? String(d.key[2] ?? 'Unknown') : 'Unknown'))
    .colors(_cscale_${ch})
    .brushOn(true)
    .symbolSize(8)
    .clipPadding(10)
    .transitionDuration(750)
    .xAxisLabel('${xLabel}')
    .yAxisLabel('${yLabel}')
    .title((d) => {
      if (!d || !d.key) return '';
      return String(d.key[2] ?? '') +
        '\\n${xLabel}: ' + d3.format('~s')(d.key[0]) +
        '\\n${yLabel}: ' + d3.format('.2f')(d.key[1]);
    });
  ${ch}.xAxis().ticks(6).tickFormat(d3.format('~s'));
  ${ch}.yAxis().ticks(5).tickFormat(d3.format('.1f'));
  ${ch}.on('postRender.${ch}_leg', () => {
    const host = document.querySelector('${el}');
    if (!host) return;
    let leg = host.querySelector('.dvfc-scatter-legend');
    if (!leg) {
      leg = document.createElement('div');
      leg.className = 'dvfc-scatter-legend';
    }
    leg.innerHTML = _cdom_${ch}
      .map((name) =>
        '<span class="dvfc-legend-item"><i style="background:' +
        _cscale_${ch}(name) +
        '"></i>' +
        name +
        '</span>'
      )
      .join('');
    host.appendChild(leg);
  });
  // Raise symbols above the brush overlay so hover tooltips work while brush still works on empty space
${tipHits}
  charts.push(${ch});`;
  }
  return `
${sizePrelude(el, ch, w, h)}  const ${dim} = ${cf}.dimension((d) => [+d['${esc(x)}'] || 0, +d['${esc(y)}'] || 0]);
  const ${grp} = ${dim}.group();
  const ${ch} = new dc.ScatterPlot('${el}');
  const _sx_${ch} = d3.extent(${cf}.all(), (d) => +d['${esc(x)}'] || 0);
  const _sy_${ch} = d3.extent(${cf}.all(), (d) => +d['${esc(y)}'] || 0);
  ${ch}
    .width(_sz_${ch}.w)
    .height(_sz_${ch}.h)
    .margins({ top: 20, right: 24, bottom: 56, left: 56 })
    .dimension(${dim})
    .group(${grp})
    .x(d3.scaleLinear().domain(_sx_${ch}))
    .y(d3.scaleLinear().domain(_sy_${ch}))
    .brushOn(true)
    .symbolSize(7)
    .clipPadding(10)
    .transitionDuration(750)
    .colors(['#1e3a5f'])
    .xAxisLabel('${xLabel}')
    .yAxisLabel('${yLabel}')
    .title((d) => {
      if (!d || !d.key) return '';
      return '${xLabel}: ' + d3.format('~s')(d.key[0]) +
        '\\n${yLabel}: ' + d3.format('.2f')(d.key[1]);
    });
  ${ch}.xAxis().ticks(6).tickFormat(d3.format('~s'));
  ${ch}.yAxis().ticks(5).tickFormat(d3.format('.1f'));
  charts.push(${ch});`;
}
