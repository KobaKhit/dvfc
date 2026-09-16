/**
 * Code generator for Mosaic dashboards
 * Transforms DashboardSpec into executable vgplot code
 */

import type { DashboardSpec, ChartSpec } from '@coordboard/core';

export interface GeneratorContext {
  spec: DashboardSpec;
  dataDir: string;
  outputDir: string;
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

async function loadData() {
  const origin = window.location.origin;
  
${spec.data.map(ds => `  await vg.coordinator().exec(\`
    CREATE TABLE IF NOT EXISTS ${ds.id} AS 
    SELECT * FROM read_csv_auto('\${origin}/data/${ds.id}.csv')
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

    // Create charts
    ${chartCode}

    if (statusEl) {
      statusEl.textContent = '✅ Dashboard ready! Brush line charts to filter other charts.';
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
  
  // Determine mark type
  const mark = chart.type === 'line' ? 'lineY' : 
               chart.type === 'bar' ? 'barY' : 
               chart.type === 'area' ? 'areaY' :
               chart.type === 'scatter' ? 'dot' : 'barY';

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
  if (chart.type === 'line') markOptions.push('stroke: fill', 'strokeWidth: 2');
  if (chart.type === 'bar') markOptions.push('fillOpacity: 0.8');

  // Build from clause with optional filterBy
  const fromClause = interaction?.filterBy ?
    `vg.from('${chart.dataSource}', { filterBy: ${interaction.filterBy} })` :
    `vg.from('${chart.dataSource}')`;

  // Build interaction
  const interactionCode = interaction?.brush ?
    `vg.interval${interaction.brushAxis?.toUpperCase() === 'Y' ? 'Y' : 'X'}({ as: ${interaction.selection} })` :
    '';

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
      vg.${mark}(
        ${fromClause},
        {
          ${markOptions.join(',\n          ')}
        }
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

${spec.charts.map(chart => `    <div id="chart-${chart.id}" class="chart-container"></div>`).join('\n')}

    <footer>
      <p>Built with <a href="https://idl.uw.edu/mosaic/" target="_blank">UW Mosaic</a> + coordboard</p>
    </footer>
  </div>

  <script type="module" src="/main.ts"></script>
</body>
</html>`;
}
