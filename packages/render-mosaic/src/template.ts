import type { GeneratorContext } from './generator.js';
import { embedRowTracks, resolveGridLayout } from '@dvfc/core';

/**
 * Generate index.html from dashboard spec
 */
export function generateHTML(ctx: GeneratorContext): string {
  const { spec } = ctx;
  const bordered = spec.theme?.chartBorders === true;
  const grid = resolveGridLayout(spec.layout);
  const gap = spec.layout?.gap ?? 24;
  const spanRules =
    grid.spans
      ?.map(
        (span, i) =>
          `    .charts-grid > :nth-child(${i + 1}) { grid-column: span ${span}; }`
      )
      .join('\n') ?? '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.meta.title}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #102129;
      --muted: #607078;
      --line: #e4eaee;
      --paper: #ffffff;
      --navy: #1e3a5f;
      --sky: #7ba3c9;
      --sand: #a89b8c;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: ${spec.theme?.fontFamily || 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'};
      color: var(--ink);
      background: #f7f8fa;
      min-height: 100vh;
      padding: clamp(0.85rem, 2.2vw, 1.75rem);
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: ${spec.theme?.backgroundColor || 'white'};
      border: 1px solid rgba(16, 33, 41, 0.08);
      border-radius: 4px;
      padding: clamp(1.15rem, 2.4vw, 2rem);
      box-shadow: 0 1px 2px rgba(16, 33, 41, 0.04);
    }

    h1 {
      font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
      color: var(--ink);
      margin-bottom: 0.3rem;
      font-size: clamp(1.55rem, 2.8vw, 2.05rem);
      letter-spacing: -0.02em;
      line-height: 1.15;
      font-weight: 600;
    }

    .subtitle {
      color: var(--muted);
      margin-bottom: 1rem;
      font-size: 0.92rem;
    }

    #status {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.6rem;
      background: rgba(30, 58, 95, 0.07);
      border: 1px solid rgba(30, 58, 95, 0.14);
      margin-bottom: 1rem;
      border-radius: 4px;
      color: var(--navy);
      font-size: 0.76rem;
      font-weight: 600;
    }

    .chart-container {
      min-width: 0;
      overflow: hidden;
      margin: 0;
      padding: ${bordered ? '1rem 1rem 0.75rem' : '0'};
      border: ${bordered ? '1px solid var(--line)' : '0'};
      border-radius: ${bordered ? '4px' : '0'};
      background: ${bordered ? '#fff' : 'transparent'};
      box-shadow: none;
      display: flex;
      flex-direction: column;
    }

    .chart-container .dvfc-plot {
      flex: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .chart-container > h3 {
      font-size: 0.88rem !important;
      letter-spacing: -0.01em;
      color: var(--ink) !important;
      margin-bottom: 0.55rem !important;
      font-weight: 650 !important;
      flex-shrink: 0;
    }

    /* Soften crossfilter redraws (Mosaic re-renders SVG; Fixed domains keep scales stable) */
    .chart-container svg {
      transition: opacity 0.28s ease;
    }
    .chart-container.dvfc-filtering svg {
      opacity: 0.55;
    }
    .dvfc-smooth {
      transition: opacity 0.28s ease;
      opacity: 1;
    }
    .dvfc-smooth.dvfc-smooth-out {
      opacity: 0.35;
    }
    .dvfc-smooth.dvfc-smooth-in {
      opacity: 0.35;
    }
    .dvfc-smooth.dvfc-smooth-on {
      opacity: 1;
    }
    .dvfc-kpi-value {
      transition: opacity 0.28s ease, transform 0.28s ease;
    }

    ${spec.layout?.type === 'grid' ? `
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(${grid.columns}, minmax(0, 1fr));
      gap: ${gap}px;
    }
${spanRules}

    @media (max-width: 768px) {
      body:not(.is-embedded) .charts-grid {
        grid-template-columns: 1fr;
      }
      body:not(.is-embedded) .charts-grid > * {
        grid-column: auto !important;
      }
    }
    ` : spec.layout?.type === 'flex' ? `
    .charts-flex {
      display: flex;
      flex-wrap: wrap;
      gap: ${gap}px;
    }

    .charts-flex > * {
      flex: 1 1 calc(50% - ${gap / 2}px);
      min-width: 300px;
    }
    ` : ''}

    .info-box {
      background: rgba(30, 58, 95, 0.05);
      border: 1px solid rgba(30, 58, 95, 0.12);
      border-radius: 4px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
    }

    .info-box h3 {
      color: var(--ink);
      margin-bottom: 0.2rem;
      font-size: 0.88rem;
    }

    .info-box p {
      color: var(--muted);
      line-height: 1.45;
      font-size: 0.82rem;
    }

    footer {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
      color: var(--muted);
      text-align: center;
      font-size: 0.78rem;
    }

    footer a {
      color: var(--navy);
    }

    html.is-embedded,
    body.is-embedded {
      height: 100%;
    }

    body.is-embedded {
      padding: 0;
      background: #fff;
      overflow: hidden;
    }

    body.is-embedded .container {
      border: 0;
      border-radius: 0;
      box-shadow: none;
      padding: 0.7rem 0.85rem 0.6rem;
      max-width: none;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    body.is-embedded h1,
    body.is-embedded .subtitle {
      display: none;
    }

    body.is-embedded #status {
      margin-bottom: 0.65rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.68rem;
    }

    body.is-embedded .info-box,
    body.is-embedded #status,
    body.is-embedded footer {
      display: none;
    }

    body.is-embedded .chart-container {
      padding: ${bordered ? '0.5rem 0.55rem 0.4rem' : '0'};
      min-height: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
    }

    body.is-embedded .chart-container[data-chart-type="pie"],
    body.is-embedded .chart-container[data-chart-type="donut"] {
      overflow: visible;
      justify-content: flex-start;
    }

    body.is-embedded .chart-container--compact {
      justify-content: center;
    }

    body.is-embedded .chart-container svg,
    body.is-embedded .chart-container .dvfc-plot > div {
      max-width: 100%;
    }

    body.is-embedded .chart-container h3 {
      margin-bottom: 0.3rem !important;
      font-size: 0.78rem !important;
      flex-shrink: 0;
    }

    body.is-embedded .charts-grid,
    body.is-embedded .charts-flex {
      flex: 1;
      min-height: 0;
      gap: 0.7rem 0.85rem;
    }

    body.is-embedded .charts-grid {
      grid-template-columns: repeat(${grid.columns}, minmax(0, 1fr));
      grid-template-rows: ${embedRowTracks(spec.layout, spec.charts)};
      align-items: stretch;
    }

    body.is-embedded .dvfc-kpi {
      min-height: 0 !important;
      padding: 0.15rem 0.25rem !important;
    }

    body.is-embedded .dvfc-kpi-value {
      font-size: clamp(1.7rem, 3vw, 2.35rem) !important;
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
      <h3>How to use crossfiltering</h3>
      <p>
        Click and drag on a series chart, click bars or heatmap tiles, or drag a box on a scatter plot to filter linked views. Click empty space to clear.
      </p>
    </div>

    <div class="${spec.layout?.type === 'grid' ? 'charts-grid' : spec.layout?.type === 'flex' ? 'charts-flex' : ''}">
${spec.charts.map((chart) => {
  const compact = chart.type === 'number' || chart.type === 'text' ? ' chart-container--compact' : '';
  const title = chart.title
    ? `<h3 style="margin-bottom: 1rem; color: #2d3748;">${chart.title}</h3>`
    : '';
  return `      <div id="chart-${chart.id}" class="chart-container${compact}" data-chart-type="${chart.type}">${title}<div class="dvfc-plot"></div></div>`;
}).join('\n')}
    </div>

    <footer>
      <p>Generated by <strong>dvfc</strong> · Powered by <a href="https://idl.uw.edu/mosaic/" target="_blank">UW Mosaic</a></p>
    </footer>
  </div>

  <script>
    if (new URLSearchParams(location.search).get('embed') === '1') {
      document.documentElement.classList.add('is-embedded');
      document.body.classList.add('is-embedded');
      const grid = document.querySelector('.charts-grid');
      if (grid) {
        grid.style.gridTemplateColumns = 'repeat(${grid.columns}, minmax(0, 1fr))';
      }
    }
  </script>
  <script type="module" src="/main.ts"></script>
</body>
</html>`;
}
