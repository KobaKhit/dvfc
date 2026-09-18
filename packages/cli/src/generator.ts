/**
 * Code generator for Mosaic dashboards
 * Transforms DashboardSpec into executable vgplot code
 */

import type { DashboardSpec, ChartSpec } from '@dvfc/core';

export interface GeneratorContext {
  spec: DashboardSpec;
  dataDir: string;
  outputDir: string;
  base?: string;
}

/**
 * Generate main.ts code from dashboard spec
 */
export function generateMainScript(ctx: GeneratorContext): string {
  const { spec } = ctx;
  
  // Generate unique selection names
  const selections = new Map<string, string>();
  spec.charts.forEach(chart => {
    if (chart.interaction?.selection) {
      selections.set(chart.interaction.selection, chart.interaction.selection);
    }
  });

  const selectionDeclarations = Array.from(selections.keys())
    .map(sel => `const ${sel} = vg.Selection.intersect();`)
    .join('\n  ');

  // Generate chart code
  const chartCode = spec.charts.map(chart => generateChart(chart, ctx)).join('\n\n  ');

  return `import * as vg from '@uwdata/vgplot';

// Initialize Mosaic coordinator with DuckDB-WASM
vg.coordinator().databaseConnector(vg.wasmConnector());

// URL state management for shareable filters
function saveStateToURL() {
  const selections = {};
  ${Array.from(selections.keys()).map(sel => 
    `if (${sel}.value) selections['${sel}'] = ${sel}.value;`
  ).join('\n  ')}
  
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(selections)) {
    if (value) params.set(key, JSON.stringify(value));
  }
  
  const newURL = params.toString() 
    ? \`\${window.location.pathname}?\${params}\`
    : window.location.pathname;
  window.history.replaceState({}, '', newURL);
}

function restoreStateFromURL() {
  const params = new URLSearchParams(window.location.search);
  const selections = {};
  
  for (const [key, value] of params.entries()) {
    try {
      selections[key] = JSON.parse(value);
    } catch (e) {
      console.warn(\`Failed to parse selection '\${key}' from URL\`, e);
    }
  }
  
  return selections;
}

async function loadData() {
  const base = '${ctx.base || '/'}';
  const dataPath = base.endsWith('/') ? base + 'data/' : base + '/data/';
  
${spec.data.map(ds => `  await vg.coordinator().exec(\`
    CREATE TABLE IF NOT EXISTS ${ds.id} AS 
    SELECT * FROM read_csv_auto('\${window.location.origin}\${dataPath}${ds.id}.csv')
  \`);`).join('\n')}
}

async function createDashboard() {
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'Loading data...';

  try {
    await loadData();
    if (statusEl) statusEl.textContent = 'Creating visualizations...';

    // Create selections
    ${selectionDeclarations}
    
    // Restore selections from URL
    const savedSelections = restoreStateFromURL();
    ${Array.from(selections.keys()).map(sel => 
      `if (savedSelections['${sel}']) ${sel}.update(savedSelections['${sel}']);`
    ).join('\n    ')}
    
    // Save state on selection change
    ${Array.from(selections.keys()).map(sel => 
      `${sel}.addEventListener('value', () => setTimeout(saveStateToURL, 100));`
    ).join('\n    ')}

    // Create charts
    ${chartCode}

    if (statusEl) {
      statusEl.textContent = '✅ Dashboard ready! Brush line charts to filter other charts. Share URL to preserve filters.';
      statusEl.style.color = 'green';
    }
  } catch (error) {
    console.error('Error:', error);
    if (statusEl) {
      statusEl.textContent = \`❌ Error: \${error instanceof Error ? error.message : String(error)}\`;
      statusEl.style.color = 'red';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createDashboard);
} else {
  createDashboard();
}
`;
}

/**
 * Generate code for a single chart
 */
function generateChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const containerId = `chart-${chart.id}`;
  const { encoding, interaction } = chart;
  
  // Handle special chart types
  if (chart.type === 'number') {
    return generateNumberChart(chart, ctx);
  }
  
  if (chart.type === 'table') {
    return generateTableChart(chart, ctx);
  }
  
  if (chart.type === 'text') {
    return generateTextChart(chart, ctx);
  }
  
  if (chart.type === 'pie' || chart.type === 'donut') {
    return generatePieChart(chart, ctx);
  }
  
  // Handle histogram
  if (chart.type === 'histogram') {
    return generateHistogramChart(chart, ctx);
  }
  
  // Handle boxplot
  if (chart.type === 'boxplot') {
    return generateBoxplotChart(chart, ctx);
  }
  
  // Handle density
  if (chart.type === 'density') {
    return generateDensityChart(chart, ctx);
  }
  
  // Encoding is required for standard charts
  if (!encoding) {
    throw new Error(`Chart ${chart.id}: encoding is required for ${chart.type} charts`);
  }
  
  // Determine mark type for standard charts
  const mark = chart.type === 'line' ? 'lineY' : 
               chart.type === 'bar' ? 'barY' : 
               chart.type === 'area' ? 'areaY' :
               chart.type === 'scatter' ? 'dot' :
               chart.type === 'heatmap' ? 'cell' :
               'barY';

  // Build encoding
  const xEncoding = encoding.x ? 
    encoding.x.aggregate ? 
      `${encoding.x.aggregate}('${encoding.x.field}')` :
      `'${encoding.x.field}'` :
    undefined;

  const yEncoding = encoding.y ?
    encoding.y.aggregate ?
      `vg.${encoding.y.aggregate}('${encoding.y.field}')` :
      `'${encoding.y.field}'` :
    undefined;

  const colorEncoding = typeof encoding.color === 'string' ? 
    `'${encoding.color}'` : 
    encoding.color?.field ? `'${encoding.color.field}'` : undefined;

  // Build mark options
  const markOptions: string[] = [];
  if (xEncoding) markOptions.push(`x: ${xEncoding}`);
  if (yEncoding) markOptions.push(`y: ${yEncoding}`);
  if (colorEncoding) markOptions.push(`fill: ${colorEncoding}`);
  
  // Chart-type specific styling
  if (chart.type === 'line') markOptions.push('stroke: fill', 'strokeWidth: 2');
  if (chart.type === 'bar') markOptions.push('fillOpacity: 0.8');
  if (chart.type === 'area') markOptions.push('fillOpacity: 0.6');
  if (chart.type === 'heatmap') markOptions.push('fillOpacity: 1');

  // Build from clause with optional filterBy
  const dataSource = chart.dataSource || '';
  const fromClause = interaction?.filterBy ?
    `vg.from('${dataSource}', { filterBy: ${interaction.filterBy} })` :
    `vg.from('${dataSource}')`;

  // Build interaction
  const interactionCode = interaction?.brush ?
    `vg.interval${interaction.brushAxis?.toUpperCase() === 'Y' ? 'Y' : 'X'}({ as: ${interaction.selection} })` :
    '';

  // Build plot marks array (main mark + overlays)
  const marks: string[] = [
    `vg.${mark}(
        ${fromClause},
        {
          ${markOptions.join(',\n          ')}
        }
      )`
  ];
  
  // Add overlay marks if specified
  if (chart.overlays && chart.overlays.length > 0) {
    const overlayMarks = generateOverlayMarks(chart, ctx);
    marks.push(...overlayMarks);
  }

  // Build plot options
  const plotOptions: string[] = [];
  if (interactionCode) plotOptions.push(interactionCode);
  if (encoding.x?.label) plotOptions.push(`vg.xLabel('${encoding.x.label}')`);
  if (encoding.y?.label) plotOptions.push(`vg.yLabel('${encoding.y.label}')`);
  if (chart.width) plotOptions.push(`vg.width(${chart.width})`);
  if (chart.height) plotOptions.push(`vg.height(${chart.height})`);

  const plotOptionsStr = plotOptions.length > 0 ? 
    ',\n      ' + plotOptions.join(',\n      ') :
    '';

  return `const container${chart.id} = document.getElementById('${containerId}');
  if (container${chart.id}) {
    const chart${chart.id} = vg.plot(
      ${marks.join(',\n      ')}${plotOptionsStr}
    );
    container${chart.id}.appendChild(chart${chart.id});
  }`;
}

/**
 * Generate a number/KPI chart (single metric display)
 */
function generateNumberChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const containerId = `chart-${chart.id}`;
  const { encoding, dataSource, interaction } = chart;
  
  if (!dataSource || !encoding) {
    throw new Error(`Chart ${chart.id}: number charts require dataSource and encoding`);
  }
  
  // Number charts typically show a single aggregated value
  const field = encoding.y?.field || encoding.x?.field || 'value';
  const aggregate = encoding.y?.aggregate || encoding.x?.aggregate || 'sum';
  
  const filterClause = interaction?.filterBy ? `, { filterBy: ${interaction.filterBy} }` : '';
  
  return `const container${chart.id} = document.getElementById('${containerId}');
  if (container${chart.id}) {
    // Query the aggregated value
    const result = await vg.coordinator().query(\`
      SELECT ${aggregate.toUpperCase()}(${field}) as value
      FROM ${dataSource}
      \${${interaction?.filterBy ? interaction.filterBy + '.sql ? "WHERE " + ' + interaction.filterBy + '.sql : ""' : '""'}}
    \`);
    
    const value = result[0]?.value || 0;
    const formatted = typeof value === 'number' ? 
      value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 
      value;
    
    container${chart.id}.innerHTML = \`
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 3rem; font-weight: bold; color: #2d3748;">\${formatted}</div>
        <div style="font-size: 1rem; color: #718096; margin-top: 0.5rem;">${chart.title || field}</div>
      </div>
    \`;
  }`;
}

/**
 * Generate a table chart (data grid)
 */
function generateTableChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const containerId = `chart-${chart.id}`;
  const { dataSource, interaction } = chart;
  
  if (!dataSource) {
    throw new Error(`Chart ${chart.id}: table charts require dataSource`);
  }
  
  const filterClause = interaction?.filterBy ? `, { filterBy: ${interaction.filterBy} }` : '';
  
  return `const container${chart.id} = document.getElementById('${containerId}');
  if (container${chart.id}) {
    // Query the data
    const result = await vg.coordinator().query(\`
      SELECT * FROM ${dataSource}
      \${${interaction?.filterBy ? interaction.filterBy + '.sql ? "WHERE " + ' + interaction.filterBy + '.sql : ""' : '""'}}
      LIMIT 100
    \`);
    
    if (result.length > 0) {
      const columns = Object.keys(result[0]);
      const tableHTML = \`
        <div style="overflow-x: auto; max-height: 400px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
            <thead style="background: #f7fafc; position: sticky; top: 0;">
              <tr>
                \${columns.map(col => \`<th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e2e8f0;">\${col}</th>\`).join('')}
              </tr>
            </thead>
            <tbody>
              \${result.map(row => \`
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  \${columns.map(col => \`<td style="padding: 0.75rem;">\${row[col]}</td>\`).join('')}
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      \`;
      container${chart.id}.innerHTML = tableHTML;
    }
  }`;
}

/**
 * Generate a pie/donut chart
 * Note: Pie charts in Mosaic are limited; this is a basic implementation
 */
function generatePieChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const containerId = `chart-${chart.id}`;
  const { encoding, dataSource, interaction } = chart;
  
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
  const innerRadius = isDoughnut ? 0.5 : 0;
  
  const filterClause = interaction?.filterBy ? `, { filterBy: ${interaction.filterBy} }` : '';
  
  return `const container${chart.id} = document.getElementById('${containerId}');
  if (container${chart.id}) {
    // Query aggregated data
    const result = await vg.coordinator().query(\`
      SELECT ${categoryField}, ${aggregate.toUpperCase()}(${valueField}) as value
      FROM ${dataSource}
      \${${interaction?.filterBy ? interaction.filterBy + '.sql ? "WHERE " + ' + interaction.filterBy + '.sql : ""' : '""'}}
      GROUP BY ${categoryField}
      ORDER BY value DESC
    \`);
    
    if (result.length === 0) {
      container${chart.id}.innerHTML = '<p style="text-align: center; color: #999;">No data</p>';
    } else {
      // Calculate pie slices
      const total = result.reduce((sum, d) => sum + d.value, 0);
      let currentAngle = -Math.PI / 2; // Start at top
      
      const slices = result.map((d, i) => {
        const value = d.value;
        const angle = (value / total) * 2 * Math.PI;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;
        
        const color = \`hsl(\${(i * 360 / result.length)}, 70%, 60%)\`;
        
        return { ...d, startAngle, endAngle, color };
      });
      
      // SVG dimensions
      const width = ${chart.width || 400};
      const height = ${chart.height || 400};
      const radius = Math.min(width, height) / 2 - 40;
      const innerR = radius * ${innerRadius};
      
      // Generate SVG paths
      const paths = slices.map(slice => {
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
        
        // Label position
        const midAngle = (slice.startAngle + slice.endAngle) / 2;
        const labelR = radius * 0.75;
        const labelX = Math.cos(midAngle) * labelR;
        const labelY = Math.sin(midAngle) * labelR;
        const pct = ((slice.value / total) * 100).toFixed(1);
        
        return \`
          <path d="\${path}" fill="\${slice.color}" stroke="white" stroke-width="2" opacity="0.9">
            <title>\${slice.${categoryField}}: \${slice.value.toFixed(2)} (\${pct}%)</title>
          </path>
          \${pct > 5 ? \`<text x="\${labelX}" y="\${labelY}" text-anchor="middle" font-size="12" fill="white" font-weight="bold">\${pct}%</text>\` : ''}
        \`;
      }).join('');
      
      // Legend
      const legend = slices.map((slice, i) => \`
        <div style="display: flex; align-items: center; gap: 0.5rem; margin: 0.25rem 0;">
          <div style="width: 12px; height: 12px; background: \${slice.color}; border-radius: 2px;"></div>
          <span style="font-size: 0.875rem;">\${slice.${categoryField}} (\${((slice.value / total) * 100).toFixed(1)}%)</span>
        </div>
      \`).join('');
      
      container${chart.id}.innerHTML = \`
        <div style="display: flex; gap: 2rem; align-items: center; justify-content: center;">
          <svg width="\${width}" height="\${height}" style="flex-shrink: 0;">
            <g transform="translate(\${width/2}, \${height/2})">
              \${paths}
            </g>
          </svg>
          <div style="max-width: 200px;">
            \${legend}
          </div>
        </div>
      \`;
    }
  }`;
}

/**
 * Generate overlay marks for analysis (mean, median, trend, moving average)
 */
function generateOverlayMarks(chart: ChartSpec, ctx: GeneratorContext): string[] {
  if (!chart.overlays || !chart.encoding) return [];
  
  const marks: string[] = [];
  const yField = chart.encoding.y?.field;
  const xField = chart.encoding.x?.field;
  
  if (!yField) return marks;
  
  for (const overlay of chart.overlays) {
    const field = overlay.field || yField;
    const color = overlay.color || '#e53e3e';
    const label = overlay.label || overlay.type;
    
    switch (overlay.type) {
      case 'mean':
        marks.push(`vg.ruleY(
        vg.from('${chart.dataSource}'),
        {
          y: vg.avg('${field}'),
          stroke: '${color}',
          strokeWidth: 2,
          strokeDasharray: '4 4'
        }
      )`);
        break;
        
      case 'median':
        marks.push(`vg.ruleY(
        vg.from('${chart.dataSource}'),
        {
          y: vg.median('${field}'),
          stroke: '${color}',
          strokeWidth: 2,
          strokeDasharray: '4 4'
        }
      )`);
        break;
        
      case 'trend':
        // Linear regression line using SQL window functions
        marks.push(`vg.lineY(
        vg.from(\`(
          SELECT 
            ${xField},
            regr_intercept(${field}, row_number() over (order by ${xField})) over () + 
            regr_slope(${field}, row_number() over (order by ${xField})) over () * 
            row_number() over (order by ${xField}) as trend_value
          FROM ${chart.dataSource}
          ORDER BY ${xField}
        )\`),
        {
          x: '${xField}',
          y: 'trend_value',
          stroke: '${color}',
          strokeWidth: 2,
          strokeDasharray: '2 2'
        }
      )`);
        break;
        
      case 'moving_average':
        const window = overlay.window || 7;
        marks.push(`vg.lineY(
        vg.from(\`(
          SELECT 
            ${xField},
            AVG(${field}) OVER (
              ORDER BY ${xField} 
              ROWS BETWEEN ${window - 1} PRECEDING AND CURRENT ROW
            ) as ma_value
          FROM ${chart.dataSource}
          ORDER BY ${xField}
        )\`),
        {
          x: '${xField}',
          y: 'ma_value',
          stroke: '${color}',
          strokeWidth: 2
        }
      )`);
        break;
    }
  }
  
  return marks;
}

/**
 * Generate a text chart (narrative Markdown blocks)
 */
function generateTextChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const containerId = `chart-${chart.id}`;
  const content = chart.content || '';
  
  // Simple Markdown to HTML conversion (basic subset)
  const htmlContent = content
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  return `const container${chart.id} = document.getElementById('${containerId}');
  if (container${chart.id}) {
    container${chart.id}.innerHTML = \`
      <div style="padding: 1.5rem; background: #f7fafc; border-radius: 0.5rem; line-height: 1.6;">
        <p>${htmlContent}</p>
      </div>
    \`;
  }`;
}

/**
 * Generate a histogram chart (frequency distribution)
 */
function generateHistogramChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const containerId = `chart-${chart.id}`;
  const { encoding, dataSource, interaction } = chart;
  
  if (!dataSource || !encoding || !encoding.x) {
    throw new Error(`Chart ${chart.id}: histogram charts require dataSource and x encoding`);
  }
  
  const field = encoding.x.field;
  const bins = encoding.x.bins || 20;
  
  // Build from clause with optional filterBy
  const fromClause = interaction?.filterBy ?
    `vg.from('${dataSource}', { filterBy: ${interaction.filterBy} })` :
    `vg.from('${dataSource}')`;
  
  // Build interaction
  const interactionCode = interaction?.brush ?
    `vg.intervalX({ as: ${interaction.selection} })` :
    '';
  
  // Build plot options
  const plotOptions: string[] = [];
  if (interactionCode) plotOptions.push(interactionCode);
  if (encoding.x?.label) plotOptions.push(`vg.xLabel('${encoding.x.label}')`);
  plotOptions.push(`vg.yLabel('Frequency')`);
  if (chart.width) plotOptions.push(`vg.width(${chart.width})`);
  if (chart.height) plotOptions.push(`vg.height(${chart.height})`);
  
  const plotOptionsStr = plotOptions.length > 0 ? 
    `,\n      ${plotOptions.join(',\n      ')}` : '';
  
  return `const container${chart.id} = document.getElementById('${containerId}');
  if (container${chart.id}) {
    const chart${chart.id} = vg.plot(
      vg.rectY(
        ${fromClause},
        vg.bin('${field}', { thresholds: ${bins} }),
        { y: vg.count(), fill: 'steelblue', fillOpacity: 0.8 }
      )${plotOptionsStr}
    );
    container${chart.id}.appendChild(chart${chart.id});
  }`;
}

/**
 * Generate a boxplot chart (statistical distribution)
 */
function generateBoxplotChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const containerId = `chart-${chart.id}`;
  const { encoding, dataSource, interaction } = chart;
  
  if (!dataSource || !encoding || !encoding.y) {
    throw new Error(`Chart ${chart.id}: boxplot charts require dataSource and y encoding`);
  }
  
  const valueField = encoding.y.field;
  const categoryField = encoding.x?.field;
  
  // Build from clause with optional filterBy
  const fromClause = interaction?.filterBy ?
    `vg.from('${dataSource}', { filterBy: ${interaction.filterBy} })` :
    `vg.from('${dataSource}')`;
  
  // Build plot options
  const plotOptions: string[] = [];
  if (encoding.x?.label) plotOptions.push(`vg.xLabel('${encoding.x.label}')`);
  if (encoding.y?.label) plotOptions.push(`vg.yLabel('${encoding.y.label}')`);
  if (chart.width) plotOptions.push(`vg.width(${chart.width})`);
  if (chart.height) plotOptions.push(`vg.height(${chart.height})`);
  
  const plotOptionsStr = plotOptions.length > 0 ? 
    `,\n      ${plotOptions.join(',\n      ')}` : '';
  
  // boxY mark requires category and value
  const boxOptions = categoryField ? 
    `{ x: '${categoryField}', y: '${valueField}', fill: 'steelblue' }` :
    `{ y: '${valueField}', fill: 'steelblue' }`;
  
  return `const container${chart.id} = document.getElementById('${containerId}');
  if (container${chart.id}) {
    const chart${chart.id} = vg.plot(
      vg.boxY(
        ${fromClause},
        ${boxOptions}
      )${plotOptionsStr}
    );
    container${chart.id}.appendChild(chart${chart.id});
  }`;
}

/**
 * Generate a density chart (kernel density estimation)
 */
function generateDensityChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const containerId = `chart-${chart.id}`;
  const { encoding, dataSource, interaction } = chart;
  
  if (!dataSource || !encoding || !encoding.x) {
    throw new Error(`Chart ${chart.id}: density charts require dataSource and x encoding`);
  }
  
  const field = encoding.x.field;
  
  // Build from clause with optional filterBy
  const fromClause = interaction?.filterBy ?
    `vg.from('${dataSource}', { filterBy: ${interaction.filterBy} })` :
    `vg.from('${dataSource}')`;
  
  // Build interaction
  const interactionCode = interaction?.brush ?
    `vg.intervalX({ as: ${interaction.selection} })` :
    '';
  
  // Build plot options
  const plotOptions: string[] = [];
  if (interactionCode) plotOptions.push(interactionCode);
  if (encoding.x?.label) plotOptions.push(`vg.xLabel('${encoding.x.label}')`);
  plotOptions.push(`vg.yLabel('Density')`);
  if (chart.width) plotOptions.push(`vg.width(${chart.width})`);
  if (chart.height) plotOptions.push(`vg.height(${chart.height})`);
  
  const plotOptionsStr = plotOptions.length > 0 ? 
    `,\n      ${plotOptions.join(',\n      ')}` : '';
  
  return `const container${chart.id} = document.getElementById('${containerId}');
  if (container${chart.id}) {
    const chart${chart.id} = vg.plot(
      vg.areaY(
        ${fromClause},
        vg.densityX('${field}'),
        { y: 'density', fill: 'steelblue', fillOpacity: 0.6 }
      )${plotOptionsStr}
    );
    container${chart.id}.appendChild(chart${chart.id});
  }`;
}

/**
 * Generate index.html from dashboard spec
 */
export function generateHTML(ctx: GeneratorContext): string {
  const { spec } = ctx;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.meta.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${spec.theme?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'};
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: ${spec.theme?.backgroundColor || 'white'};
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }

    h1 {
      color: #2d3748;
      margin-bottom: 0.5rem;
      font-size: 2rem;
    }

    .subtitle {
      color: #718096;
      margin-bottom: 1.5rem;
      font-size: 1rem;
    }

    #status {
      padding: 1rem;
      background: #edf2f7;
      border-left: 4px solid #4299e1;
      margin-bottom: 2rem;
      border-radius: 4px;
      color: #2d3748;
      font-weight: 500;
    }

    .chart-container {
      margin-bottom: 2rem;
    }

    ${spec.layout?.type === 'grid' ? `
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(${spec.layout.columns || 2}, 1fr);
      gap: ${spec.layout.gap || 24}px;
    }
    
    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }
    ` : spec.layout?.type === 'flex' ? `
    .charts-flex {
      display: flex;
      flex-wrap: wrap;
      gap: ${spec.layout.gap || 24}px;
    }
    
    .charts-flex > * {
      flex: 1 1 calc(50% - ${(spec.layout.gap || 24) / 2}px);
      min-width: 300px;
    }
    ` : ''}

    .info-box {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 2rem;
    }

    .info-box h3 {
      color: #2d3748;
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }

    .info-box p {
      color: #4a5568;
      line-height: 1.6;
    }

    footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid #e2e8f0;
      color: #718096;
      text-align: center;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      .container {
        padding: 1rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${spec.meta.title}</h1>
    ${spec.meta.description ? `<p class="subtitle">${spec.meta.description}</p>` : ''}

    <div id="status">Initializing...</div>

    <div class="info-box">
      <h3>📊 How to Use Crossfiltering</h3>
      <p>
        Click and drag horizontally on the time series charts to select a date range.
        Other charts will automatically filter to show only data from the selected period.
        Click outside the selection to reset.
      </p>
    </div>

    <div class="${spec.layout?.type === 'grid' ? 'charts-grid' : spec.layout?.type === 'flex' ? 'charts-flex' : ''}">
${spec.charts.map(chart => `      <div id="chart-${chart.id}" class="chart-container">${chart.title ? `<h3 style="margin-bottom: 1rem; color: #2d3748;">${chart.title}</h3>` : ''}</div>`).join('\n')}
    </div>

    <footer>
      <p>Built with <a href="https://idl.uw.edu/mosaic/" target="_blank">UW Mosaic</a> + Data Viz Factory</p>
    </footer>
  </div>

  <script type="module" src="/main.ts"></script>
</body>
</html>`;
}
