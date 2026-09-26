import type { ChartSpec } from '@dvfc/core';
import type { GeneratorContext } from '../generator.js';
import {
  chartFilterVar,
  chartPublishVar,
  filterSqlExpr,
  queryJsonRows,
  wrapReactiveFilterRender,
} from './helpers.js';
import { pieColorExpr } from './theme.js';

/**
 * Generate a pie/donut chart over Mosaic JSON query rows.
 * Uses a floating HTML tooltip (SVG <title> is unreliable under overlay text).
 * When publishing a selection, slice/legend clicks update via clausePoint.
 */
export function generatePieChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const { encoding, dataSource } = chart;

  if (!dataSource || !encoding) {
    throw new Error(`Chart ${chart.id}: pie/donut charts require dataSource and encoding`);
  }

  if (!encoding.x || !encoding.y) {
    return `console.error('Pie chart ${chart.id} requires x (category) and y (value) encodings');`;
  }

  const categoryField = encoding.x.field;
  const valueField = encoding.y.field;
  const aggregate = encoding.y.aggregate || 'sum';
  const isDoughnut = chart.type === 'donut';
  const innerRadius = isDoughnut ? 0.58 : 0;
  const filterBy = chartFilterVar(chart, ctx);
  const publishAs = chartPublishVar(chart, ctx);
  // Skip this chart's own publish clause so a slice click does not collapse the pie
  const skipSource = publishAs != null ? `container${chart.id}.__dvfcPieSource` : undefined;
  const whereExpr = filterSqlExpr(filterBy, skipSource);
  const colorAt = pieColorExpr(ctx, 'i', 'result.length');
  const catLabel = encoding.x.label || categoryField;
  const valLabel = encoding.y.label || 'Value';

  const sql = `
        SELECT ${categoryField}, ${aggregate.toUpperCase()}(${valueField}) as value
        FROM ${dataSource}
        \${${whereExpr}}
        GROUP BY ${categoryField}
        ORDER BY value DESC
      `;

  const initSource =
    publishAs != null
      ? `if (!container${chart.id}.__dvfcPieSource) container${chart.id}.__dvfcPieSource = {};
      const __pieSource = container${chart.id}.__dvfcPieSource;`
      : '';

  const publishBlock =
    publishAs != null
      ? `
        const __pieSelected = ${publishAs}.value;
        const selectSlice = (label) => {
          if (__pieSelected != null && String(__pieSelected) === String(label)) {
            ${publishAs}.update(clausePoint('${categoryField}', undefined, { source: __pieSource }));
          } else {
            ${publishAs}.update(clausePoint('${categoryField}', label, { source: __pieSource }));
          }
        };
        container${chart.id}.querySelectorAll('.dvfc-pie-slice').forEach((el) => {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const slice = slices[Number(el.getAttribute('data-idx'))];
            if (slice) selectSlice(slice.label);
          });
        });
        container${chart.id}.querySelectorAll('.dvfc-pie-legend').forEach((el) => {
          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const slice = slices[Number(el.getAttribute('data-idx'))];
            if (slice) selectSlice(slice.label);
          });
        });
        if (__pieSelected != null) {
          container${chart.id}.querySelectorAll('.dvfc-pie-slice').forEach((el, i) => {
            const on = String(slices[i]?.label) === String(__pieSelected);
            el.setAttribute('opacity', on ? '1' : '0.4');
          });
        }`
      : '';

  return wrapReactiveFilterRender(
    chart.id,
    filterBy,
    `      ${initSource}
      ${queryJsonRows(sql)}
      
      if (result.length === 0) {
        container${chart.id}.innerHTML = '<p style="text-align: center; color: #999;">No data</p>';
      } else {
        const total = result.reduce((sum, d) => sum + Number(d.value || 0), 0);
        let currentAngle = -Math.PI / 2;
        
        const slices = result.map((d, i) => {
          const value = Number(d.value || 0);
          const angle = total > 0 ? (value / total) * 2 * Math.PI : 0;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;
          const color = ${colorAt};
          const pct = total > 0 ? (value / total) * 100 : 0;
          return {
            ...d,
            value,
            startAngle,
            endAngle,
            color,
            pct,
            label: String(d.${categoryField} ?? ''),
          };
        });
        
        const hostW = container${chart.id}.clientWidth || ${chart.width || 280};
        const hostH = container${chart.id}.clientHeight > 40
          ? container${chart.id}.clientHeight
          : ${chart.height || 220};
        const stacked = hostW < 280 || hostH > hostW + 40;
        const pieSize = stacked
          ? Math.max(100, Math.min(hostW - 16, hostH - 108))
          : Math.max(132, Math.min(Math.floor(hostW * 0.58), hostH - 8));
        const width = pieSize;
        const height = pieSize;
        const radius = Math.min(width, height) / 2 - 28;
        const innerR = radius * ${innerRadius};
        
        const paths = slices.map((slice, idx) => {
          const outerX1 = Math.cos(slice.startAngle) * radius;
          const outerY1 = Math.sin(slice.startAngle) * radius;
          const outerX2 = Math.cos(slice.endAngle) * radius;
          const outerY2 = Math.sin(slice.endAngle) * radius;
          
          const innerX1 = Math.cos(slice.startAngle) * innerR;
          const innerY1 = Math.sin(slice.startAngle) * innerR;
          const innerX2 = Math.cos(slice.endAngle) * innerR;
          const innerY2 = Math.sin(slice.endAngle) * innerR;
          
          const largeArc = (slice.endAngle - slice.startAngle) > Math.PI ? 1 : 0;
          
          const path = ${isDoughnut} ?
            \`M \${innerX1} \${innerY1} L \${outerX1} \${outerY1} A \${radius} \${radius} 0 \${largeArc} 1 \${outerX2} \${outerY2} L \${innerX2} \${innerY2} A \${innerR} \${innerR} 0 \${largeArc} 0 \${innerX1} \${innerY1} Z\` :
            \`M 0 0 L \${outerX1} \${outerY1} A \${radius} \${radius} 0 \${largeArc} 1 \${outerX2} \${outerY2} Z\`;
          
          const midAngle = (slice.startAngle + slice.endAngle) / 2;
          const labelR = radius * 0.72;
          const labelX = Math.cos(midAngle) * labelR;
          const labelY = Math.sin(midAngle) * labelR;
          const pctText = slice.pct.toFixed(1);
          
          return \`
            <path
              class="dvfc-pie-slice"
              data-idx="\${idx}"
              d="\${path}"
              fill="\${slice.color}"
              stroke="white"
              stroke-width="2"
              opacity="0.95"
              style="cursor: pointer;"
            ></path>
            \${slice.pct > 6 ? \`<text x="\${labelX}" y="\${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="white" font-weight="600" style="pointer-events: none;">\${pctText}%</text>\` : ''}
          \`;
        }).join('');

        const centerLabel = ${isDoughnut} ? \`
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
            <div style="font-size: 1.35rem; font-weight: 700; color: #102129; letter-spacing: -0.02em;">\${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div style="font-size: 0.72rem; color: #607078; margin-top: 0.15rem;">Total</div>
          </div>
        \` : '';
        
        const legend = slices.map((slice, idx) => \`
          <div class="dvfc-pie-legend" data-idx="\${idx}" style="display: flex; align-items: center; gap: 0.4rem; margin: 0.12rem 0; cursor: pointer;">
            <div style="width: 8px; height: 8px; background: \${slice.color}; border-radius: 2px; flex-shrink: 0;"></div>
            <span style="font-size: 0.7rem; color: #102129;">\${slice.label} <span style="color: #607078;">(\${slice.pct.toFixed(1)}%)</span></span>
          </div>
        \`).join('');
        
        container${chart.id}.innerHTML = \`
          <div class="dvfc-pie-root dvfc-smooth" style="position: relative; display: flex; flex-direction: \${stacked ? 'column' : 'row'}; gap: \${stacked ? '0.4rem' : '1.15rem'}; align-items: center; justify-content: center; min-height: \${Math.max(0, hostH)}px;">
            <div style="position: relative; width: \${width}px; height: \${height}px; flex-shrink: 0;">
              <svg width="\${width}" height="\${height}">
                <g transform="translate(\${width/2}, \${height/2})">
                  \${paths}
                </g>
              </svg>
              \${centerLabel}
            </div>
            <div style="max-width: 220px; min-width: 140px;">
              \${legend}
            </div>
            <div class="dvfc-pie-tip" style="
              display: none;
              position: fixed;
              z-index: 40;
              pointer-events: none;
              background: #102129;
              color: #fff;
              font-size: 12px;
              line-height: 1.35;
              padding: 0.45rem 0.65rem;
              border-radius: 4px;
              box-shadow: 0 8px 24px rgba(16,33,41,0.22);
              max-width: 240px;
            "></div>
          </div>
        \`;

        const tip = container${chart.id}.querySelector('.dvfc-pie-tip');
        const root = container${chart.id}.querySelector('.dvfc-pie-root');
        const showTip = (idx, clientX, clientY) => {
          const slice = slices[idx];
          if (!slice || !tip) return;
          const valueText = slice.value.toLocaleString(undefined, { maximumFractionDigits: 2 });
          tip.innerHTML = \`
            <div style="font-weight: 650; margin-bottom: 0.15rem;">\${slice.label}</div>
            <div style="opacity: 0.9;">${catLabel}: \${slice.label}</div>
            <div style="opacity: 0.9;">${valLabel}: \${valueText}</div>
            <div style="opacity: 0.9;">Share: \${slice.pct.toFixed(1)}%</div>
          \`;
          tip.style.display = 'block';
          const pad = 12;
          tip.style.left = (clientX + pad) + 'px';
          tip.style.top = (clientY + pad) + 'px';
          container${chart.id}.querySelectorAll('.dvfc-pie-slice').forEach((el, i) => {
            el.setAttribute('opacity', i === idx ? '1' : '0.45');
          });
        };
        const hideTip = () => {
          if (tip) tip.style.display = 'none';
          container${chart.id}.querySelectorAll('.dvfc-pie-slice').forEach((el) => {
            el.setAttribute('opacity', '0.95');
          });
        };

        container${chart.id}.querySelectorAll('.dvfc-pie-slice').forEach((el) => {
          el.addEventListener('pointerenter', (e) => {
            showTip(Number(el.getAttribute('data-idx')), e.clientX, e.clientY);
          });
          el.addEventListener('pointermove', (e) => {
            showTip(Number(el.getAttribute('data-idx')), e.clientX, e.clientY);
          });
          el.addEventListener('pointerleave', hideTip);
        });
        container${chart.id}.querySelectorAll('.dvfc-pie-legend').forEach((el) => {
          el.addEventListener('pointerenter', (e) => {
            showTip(Number(el.getAttribute('data-idx')), e.clientX, e.clientY);
          });
          el.addEventListener('pointermove', (e) => {
            showTip(Number(el.getAttribute('data-idx')), e.clientX, e.clientY);
          });
          el.addEventListener('pointerleave', hideTip);
        });
        if (root) root.addEventListener('pointerleave', hideTip);
        ${publishBlock}
      }`
  );
}
