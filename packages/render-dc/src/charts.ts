/**
 * ChartSpec → dc.js chart setup code (runs in browser after crossfilter is ready).
 */

import type { ChartSpec } from '@dvfc/core';

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function publishedName(chart: ChartSpec): string | undefined {
  const i = chart.interaction;
  return i?.selection ?? i?.publishes;
}

function wantsBrush(chart: ChartSpec): boolean {
  return Boolean(chart.interaction?.brush);
}

function dimVar(chartId: string): string {
  return `dim_${chartId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

function grpVar(chartId: string): string {
  return `grp_${chartId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

function chartVar(chartId: string): string {
  return `chart_${chartId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
}

/** Year / ordinal numeric fields should not use d3 time scales. */
function isTemporalField(chart: ChartSpec): boolean {
  const t = chart.encoding?.x?.type;
  if (t === 'temporal') return true;
  if (t === 'ordinal' || t === 'nominal' || t === 'quantitative') return false;
  const f = (chart.encoding?.x?.field || '').toLowerCase();
  return /date|time|timestamp/.test(f) && !/year|yr\b/.test(f);
}

/**
 * Generate JS that creates dimension/group + dc chart for one ChartSpec.
 * Assumes `cf_<dataSource>` crossfilter and `dc` / `d3` globals.
 */
export function generateDcChartCode(chart: ChartSpec): string {
  if (chart.type === 'text') {
    return `  // text chart ${chart.id}: rendered as static HTML`;
  }

  const ds = chart.dataSource;
  if (!ds) return `  console.warn('Chart ${chart.id}: missing dataSource');`;

  const cf = `cf_${ds.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const el = `#dc-${chart.id}`;
  const w = chart.width || 420;
  const h = chart.height || 260;
  const dim = dimVar(chart.id);
  const grp = grpVar(chart.id);
  const ch = chartVar(chart.id);
  const x = chart.encoding?.x?.field;
  const y = chart.encoding?.y?.field;
  const yAgg = chart.encoding?.y?.aggregate || 'sum';
  const color = typeof chart.encoding?.color === 'object' ? chart.encoding.color?.field : undefined;
  const brush = wantsBrush(chart);
  const pub = publishedName(chart);
  const xLabel = esc(chart.encoding?.x?.label || x || '');
  const yLabel = esc(chart.encoding?.y?.label || y || 'Value');

  const reduce = (() => {
    if (!y) return `.group().reduceCount()`;
    if (yAgg === 'count') return `.group().reduceCount()`;
    if (yAgg === 'avg') {
      return `.group().reduce(
      (p, v) => { p.count++; p.total += +v['${esc(y)}'] || 0; p.avg = p.count ? p.total / p.count : 0; return p; },
      (p, v) => { p.count--; p.total -= +v['${esc(y)}'] || 0; p.avg = p.count ? p.total / p.count : 0; return p; },
      () => ({ count: 0, total: 0, avg: 0 })
    )`;
    }
    return `.group().reduceSum((d) => +d['${esc(y)}'] || 0)`;
  })();

  const valueAccessor =
    yAgg === 'avg'
      ? `.valueAccessor((d) => d.value.avg)`
      : '';

  switch (chart.type) {
    case 'bar': {
      if (!x) return `  console.warn('bar ${chart.id}: needs x');`;
      return `
  const ${dim} = ${cf}.dimension((d) => d['${esc(x)}']);
  const ${grp} = ${dim}${reduce};
  const ${ch} = new dc.BarChart('${el}');
  ${ch}
    .width(${w})
    .height(${h})
    .margins({ top: 20, right: 24, bottom: 56, left: 56 })
    .dimension(${dim})
    .group(${grp})
    ${valueAccessor}
    .x(d3.scaleBand())
    .xUnits(dc.units.ordinal)
    .brushOn(${brush || pub ? 'true' : 'false'})
    .elasticY(true)
    .renderHorizontalGridLines(true)
    .transitionDuration(750)
    .colors(['#1e3a5f'])
    .xAxisLabel('${xLabel}')
    .yAxisLabel('${yLabel}');
  ${ch}.yAxis().ticks(5).tickFormat(d3.format('~s'));
  charts.push(${ch});`;
    }

    case 'line':
    case 'area': {
      if (!x || !y) return `  console.warn('${chart.type} ${chart.id}: needs x,y');`;
      const isArea = chart.type === 'area';
      const temporal = isTemporalField(chart);

      if (temporal) {
        return `
  const ${dim} = ${cf}.dimension((d) => {
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
    .width(${w})
    .height(${h})
    .margins({ top: 20, right: 24, bottom: 56, left: 56 })
    .dimension(${dim})
    .group(${grp})
    ${valueAccessor}
    .x(d3.scaleTime().domain(_ext_${ch}))
    .renderArea(${isArea})
    .brushOn(${brush || pub ? 'true' : 'false'})
    .renderDataPoints({ radius: 2.5, fillOpacity: 0.85, strokeOpacity: 0.8 })
    .renderHorizontalGridLines(true)
    .transitionDuration(750)
    .colors(['#1e3a5f'])
    .xAxisLabel('${xLabel}')
    .yAxisLabel('${yLabel}');
  ${ch}.xAxis().ticks(6);
  ${ch}.yAxis().ticks(5).tickFormat(d3.format('~s'));
  charts.push(${ch});`;
      }

      // Ordinal / quantitative x (e.g. discovery_year): numeric linear axis, not time
      return `
  const ${dim} = ${cf}.dimension((d) => {
    const v = d['${esc(x)}'];
    const n = +v;
    return Number.isFinite(n) ? n : v;
  });
  const ${grp} = ${dim}${reduce};
  const ${ch} = new dc.LineChart('${el}');
  const _xs_${ch} = ${cf}.all().map((d) => +d['${esc(x)}']).filter(Number.isFinite);
  const _xdom_${ch} = _xs_${ch}.length ? d3.extent(_xs_${ch}) : [0, 1];
  ${ch}
    .width(${w})
    .height(${h})
    .margins({ top: 20, right: 24, bottom: 56, left: 56 })
    .dimension(${dim})
    .group(${grp})
    ${valueAccessor}
    .x(d3.scaleLinear().domain(_xdom_${ch}))
    .xUnits(dc.units.integers)
    .renderArea(${isArea})
    .brushOn(${brush || pub ? 'true' : 'false'})
    .renderDataPoints({ radius: 2.5, fillOpacity: 0.85, strokeOpacity: 0.8 })
    .renderHorizontalGridLines(true)
    .transitionDuration(750)
    .colors(['#1e3a5f'])
    .xAxisLabel('${xLabel}')
    .yAxisLabel('${yLabel}');
  ${ch}.xAxis().ticks(6).tickFormat(d3.format('d'));
  ${ch}.yAxis().ticks(5).tickFormat(d3.format('~s'));
  charts.push(${ch});`;
    }

    case 'pie':
    case 'donut': {
      if (!x) return `  console.warn('pie ${chart.id}: needs x');`;
      const inner = chart.type === 'donut' ? Math.min(w, h) * 0.22 : 0;
      return `
  const ${dim} = ${cf}.dimension((d) => d['${esc(x)}'] ?? 'Unknown');
  const ${grp} = ${dim}${reduce};
  const ${ch} = new dc.PieChart('${el}');
  ${ch}
    .width(${w})
    .height(${h})
    .dimension(${dim})
    .group(${grp})
    ${valueAccessor}
    .innerRadius(${inner})
    .externalLabels(20)
    .externalRadiusPadding(28)
    .drawPaths(true)
    .minAngleForLabel(0.25)
    .label((d) => {
      const total = ${grp}.all().reduce((s, g) => s + (g.value || 0), 0) || 1;
      const pct = Math.round((100 * (d.value || 0)) / total);
      return pct < 4 ? '' : d.key + ' (' + pct + '%)';
    })
    .title((d) => {
      const total = ${grp}.all().reduce((s, g) => s + (g.value || 0), 0) || 1;
      const pct = ((100 * (d.value || 0)) / total).toFixed(1);
      return d.key + ': ' + d3.format(',')(d.value) + ' (' + pct + '%)';
    })
    .transitionDuration(750)
    .ordinalColors(['#1e3a5f', '#7ba3c9', '#a89b8c', '#4a7c9b', '#c4b5a0', '#5c6b73']);
  charts.push(${ch});`;
    }

    case 'scatter': {
      if (!x || !y) return `  console.warn('scatter ${chart.id}: needs x,y');`;
      return `
  const ${dim} = ${cf}.dimension((d) => [+d['${esc(x)}'] || 0, +d['${esc(y)}'] || 0]);
  const ${grp} = ${dim}.group();
  const ${ch} = new dc.ScatterPlot('${el}');
  const _sx_${ch} = d3.extent(${cf}.all(), (d) => +d['${esc(x)}'] || 0);
  const _sy_${ch} = d3.extent(${cf}.all(), (d) => +d['${esc(y)}'] || 0);
  ${ch}
    .width(${w})
    .height(${h})
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
    .yAxisLabel('${yLabel}');
  ${ch}.xAxis().ticks(6).tickFormat(d3.format('~s'));
  ${ch}.yAxis().ticks(5).tickFormat(d3.format('.1f'));
  charts.push(${ch});`;
    }

    case 'heatmap': {
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
  const ${dim} = ${cf}.dimension((d) => [String(d['${esc(x)}'] ?? ''), String(d['${esc(y)}'] ?? '')]);
  const ${grp} = ${dim}${heatReduce};
  const ${ch} = new dc.HeatMap('${el}');
  ${ch}
    .width(${w})
    .height(${h})
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
    .transitionDuration(750)
    .xBorderRadius(2)
    .yBorderRadius(2);
  charts.push(${ch});`;
    }

    case 'histogram': {
      if (!x) return `  console.warn('histogram ${chart.id}: needs x');`;
      const bins = chart.encoding?.x?.bins || 20;
      return `
  (function() {
    const vals = ${cf}.all().map((d) => +d['${esc(x)}']).filter((n) => Number.isFinite(n));
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
      .width(${w})
      .height(${h})
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
      .yAxisLabel('Frequency');
    ${ch}.xAxis().ticks(6).tickFormat(d3.format('~s'));
    ${ch}.yAxis().ticks(5).tickFormat(d3.format('~s'));
    charts.push(${ch});
  })();`;
    }

    case 'number': {
      const field = y || x || 'value';
      const agg = chart.encoding?.y?.aggregate || chart.encoding?.x?.aggregate || 'sum';
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

    case 'table': {
      const cols = [x, y, color].filter(Boolean) as string[];
      const colExprs =
        cols.length > 0
          ? cols.map((c) => `'${esc(c)}'`).join(', ')
          : `Object.keys(${cf}.all()[0] || {})`;
      const sortKey = cols[0] ? `'${esc(cols[0])}'` : `(Object.keys(${cf}.all()[0] || {})[0])`;
      return `
  const ${dim} = ${cf}.dimension((d) => d);
  const ${ch} = new dc.DataTable('${el}');
  ${ch}
    .dimension(${dim})
    .size(50)
    .columns([${colExprs}].flat().map((c) => ({
      label: c,
      format: (d) => d[c]
    })))
    .sortBy((d) => d[${sortKey}])
    .order(d3.ascending)
    .transitionDuration(750);
  charts.push(${ch});`;
    }

    case 'density':
    case 'boxplot':
      return `
  document.querySelector('${el}').innerHTML =
    '<p style="padding:1rem;color:#607078;font-size:0.85rem;">Chart type <code>${chart.type}</code> is not mapped in the dc.js renderer yet. Use <code>--format html</code> (Mosaic) for this mark.</p>';`;

    default:
      return `  console.warn('Unsupported dc chart type: ${chart.type}');`;
  }
}
