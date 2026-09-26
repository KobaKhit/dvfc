import type { DcMarkContext } from './shared.js';
import { esc, sizePrelude } from './shared.js';

export function generatePieMark(ctx: DcMarkContext): string {
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
    reduce,
    valueAccessor,
    valueExpr,
  } = ctx;
  if (!x) return `  console.warn('pie ${chart.id}: needs x');`;
  return `
${sizePrelude(el, ch, w, h)}  const ${dim} = ${cf}.dimension((d) => d['${esc(x)}'] ?? 'Unknown');
  const ${grp} = ${dim}${reduce};
  const ${ch} = new dc.PieChart('${el}');
  const _drawH_${ch} = Math.min(280, Math.max(140, _sz_${ch}.h - 56));
  const _side_${ch} = Math.min(_sz_${ch}.w, _drawH_${ch});
  const _r_${ch} = Math.round(_side_${ch} * 0.36);
  const _inner_${ch} = ${chart.type === 'donut' ? `Math.round(_r_${ch} * 0.55)` : '0'};
  const _cdom_${ch} = ${grp}.all().map((d) => d.key);
  const _cpal_${ch} = ['#1e3a5f', '#7ba3c9', '#a89b8c', '#4a7c9b', '#c4b5a0', '#5c6b73'];
  const _cscale_${ch} = d3.scaleOrdinal().domain(_cdom_${ch}).range(_cpal_${ch});
  const _val_${ch} = (d) => (${valueExpr}) || 0;
  ${ch}
    .width(_sz_${ch}.w)
    .height(_drawH_${ch})
    .dimension(${dim})
    .group(${grp})
    ${valueAccessor}
    .cx(Math.round(_sz_${ch}.w / 2))
    .cy(Math.round(_drawH_${ch} / 2))
    .radius(_r_${ch})
    .innerRadius(_inner_${ch})
    .externalLabels(false)
    .drawPaths(false)
    .minAngleForLabel(10)
    .label(() => '')
    .title((d) => {
      const total = ${grp}.all().reduce((s, g) => s + _val_${ch}(g), 0) || 1;
      const pct = ((100 * _val_${ch}(d)) / total).toFixed(1);
      return d.key + ': ' + d3.format(',')(_val_${ch}(d)) + ' (' + pct + '%)';
    })
    .colors(_cscale_${ch})
    .colorAccessor((d) => d.key)
    .transitionDuration(750);
  ${ch}.on('postRender.${ch}_leg', () => {
    const host = document.querySelector('${el}');
    if (!host) return;
    let leg = host.querySelector('.dvfc-scatter-legend');
    if (!leg) {
      leg = document.createElement('div');
      leg.className = 'dvfc-scatter-legend';
    }
    leg.innerHTML = ${grp}.all()
      .slice()
      .sort((a, b) => d3.descending(_val_${ch}(a), _val_${ch}(b)))
      .map((d) =>
        '<span class="dvfc-legend-item"><i style="background:' +
        _cscale_${ch}(d.key) +
        '"></i>' +
        d.key +
        '</span>'
      )
      .join('');
    host.appendChild(leg);
  });
  charts.push(${ch});`;
}
