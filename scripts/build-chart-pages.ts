/**
 * Generate the chart gallery and one editorial page per built-in chart example.
 *
 * The SVGs are produced by dvfc itself in scripts/build-site.sh. This script only
 * assembles the website pages around those artifacts.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseSpecString } from '../packages/core/dist/index.js';

type ChartEntry = {
  id: string;
  type: string;
  title?: string;
  dataSource?: string;
  encoding?: Record<string, unknown>;
  content?: string;
  width?: number;
  height?: number;
};

type Example = {
  slug: string;
  chartId: string;
  name: string;
  eyebrow: string;
  description: string;
  insight: string;
  accent: string;
  tag: string;
  svg?: string;
};

const root = process.cwd();
const siteDir = join(root, 'site');
const dashPath = join(root, 'examples/site-gallery/cosmic-atlas.dash.yaml');
const dataPath = join(root, 'examples/site-gallery/exoplanets.csv');

const examples: Example[] = [
  {
    slug: 'line',
    chartId: 'discovery_timeline',
    name: 'Line',
    eyebrow: 'Change over time',
    description: 'Trace three decades of exoplanet discoveries with a continuous temporal signal.',
    insight: 'Transit missions turned a trickle of discoveries into a sustained era of planetary census.',
    accent: '#0b7f6e',
    tag: 'temporal',
    svg: 'chart-line.svg',
  },
  {
    slug: 'bar',
    chartId: 'discovery_methods',
    name: 'Bar',
    eyebrow: 'Compare categories',
    description: 'Rank the techniques astronomers use to detect worlds orbiting other stars.',
    insight: 'Transit photometry dominates this curated set because it scales from one star to thousands.',
    accent: '#2f6f94',
    tag: 'comparison',
    svg: 'chart-bar.svg',
  },
  {
    slug: 'area',
    chartId: 'habitable_momentum',
    name: 'Area',
    eyebrow: 'Magnitude over time',
    description: 'See the growing habitability signal as new generations of surveys come online.',
    insight: 'The filled area is a running total of habitability scores, not a claim of life. It makes the change in pace hard to miss.',
    accent: '#0b7f6e',
    tag: 'temporal',
    svg: 'chart-area.svg',
  },
  {
    slug: 'scatter',
    chartId: 'world_scatter',
    name: 'Scatter',
    eyebrow: 'Find relationships',
    description: 'Compare planetary temperature and size, colored by the mission behind each discovery.',
    insight: 'The most Earth-like worlds gather at the cool, compact edge while hot giants stretch the scale.',
    accent: '#724f91',
    tag: 'correlation',
    svg: 'chart-scatter.svg',
  },
  {
    slug: 'pie',
    chartId: 'method_share',
    name: 'Pie',
    eyebrow: 'Share of a whole',
    description: 'Show how the discovery catalog divides across observation techniques.',
    insight: 'A compact part-to-whole view works here because the category count is small and the leader is clear.',
    accent: '#c47a1a',
    tag: 'composition',
    svg: 'chart-pie.svg',
  },
  {
    slug: 'donut',
    chartId: 'mission_mix',
    name: 'Donut',
    eyebrow: 'Portfolio mix',
    description: 'Compare the missions and observatories contributing to the atlas.',
    insight: 'Kepler and TESS anchor the modern census, while ground surveys supply many of the nearest targets.',
    accent: '#cc6b72',
    tag: 'composition',
    svg: 'chart-donut.svg',
  },
  {
    slug: 'histogram',
    chartId: 'temperature_histogram',
    name: 'Histogram',
    eyebrow: 'Frequency distribution',
    description: 'Bin equilibrium temperatures to reveal the climates represented in the catalog.',
    insight: 'Temperate rocky worlds form a visible cluster, separated from ultra-hot giants and lava worlds.',
    accent: '#0b7f6e',
    tag: 'distribution',
    svg: 'chart-histogram.svg',
  },
  {
    slug: 'density',
    chartId: 'radius_density',
    name: 'Density',
    eyebrow: 'Distribution shape',
    description: 'Smooth the radius distribution to reveal the dominant scales of discovered worlds.',
    insight: 'A strong Earth-sized peak gives way to a long tail of Neptune- and Jupiter-scale planets.',
    accent: '#36a18f',
    tag: 'distribution',
    svg: 'chart-density.svg',
  },
  {
    slug: 'heatmap',
    chartId: 'constellation_heatmap',
    name: 'Heatmap',
    eyebrow: 'Two-dimensional pattern',
    description: 'Map constellations against discovery methods to expose where the catalog clusters.',
    insight: 'Cygnus dominates the transit column because Kepler stared at one patch of sky in that constellation for four years.',
    accent: '#2f6f94',
    tag: 'matrix',
    svg: 'chart-heatmap.svg',
  },
  {
    slug: 'boxplot',
    chartId: 'radius_boxplot',
    name: 'Boxplot',
    eyebrow: 'Compare distributions',
    description: 'Contrast planet-size distributions across the major discovery techniques.',
    insight: 'Direct imaging selects for giant young worlds; transit and radial-velocity surveys reach rocky scales.',
    accent: '#7a86c2',
    tag: 'statistics',
    svg: 'chart-boxplot.svg',
  },
  {
    slug: 'number',
    chartId: 'world_count',
    name: 'Number',
    eyebrow: 'Single KPI',
    description: 'Give one important measure the space and hierarchy it deserves.',
    insight: 'The curated atlas contains landmark worlds rather than the complete scientific catalog.',
    accent: '#0b7f6e',
    tag: 'summary',
    svg: 'chart-number.svg',
  },
  {
    slug: 'table',
    chartId: 'candidate_table',
    name: 'Table',
    eyebrow: 'Inspect the details',
    description: 'Rank promising nearby worlds while preserving exact values and identifiers.',
    insight: 'Tables are the handoff from pattern recognition to investigation: names, distances, temperatures, and scores.',
    accent: '#2f6f94',
    tag: 'detail',
  },
  {
    slug: 'text',
    chartId: 'field_note',
    name: 'Text',
    eyebrow: 'Explain what matters',
    description: 'Place interpretation beside the evidence so a dashboard says what the numbers mean.',
    insight: 'Narrative is a first-class chart type because analysis without context is just decoration.',
    accent: '#c47a1a',
    tag: 'narrative',
  },
];

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      result.push(current);
      current = '';
    } else current += char;
  }
  result.push(current);
  return result;
}

function tablePreview(csv: string): string {
  const [header, ...lines] = csv.trim().split('\n').map(parseCsvLine);
  const rows = lines
    .map((line) => Object.fromEntries(header.map((key, i) => [key, line[i]])))
    .sort((a, b) => Number(b.habitability_score) - Number(a.habitability_score))
    .slice(0, 8);

  return `<div class="data-table-wrap">
    <table class="data-table">
      <thead><tr><th>World</th><th>Distance</th><th>Temp.</th><th>Score</th><th>Status</th></tr></thead>
      <tbody>${rows
        .map(
          (row) => `<tr>
            <td><strong>${escapeHtml(row.planet)}</strong><small>${escapeHtml(row.constellation)}</small></td>
            <td>${escapeHtml(row.distance_ly)} ly</td>
            <td>${escapeHtml(row.equilibrium_k)} K</td>
            <td><span class="score">${Math.round(Number(row.habitability_score) * 100)}</span></td>
            <td>${escapeHtml(row.status)}</td>
          </tr>`
        )
        .join('')}</tbody>
    </table>
  </div>`;
}

function textPreview(): string {
  return `<article class="field-note">
    <span class="field-note-index">FIELD NOTE 07</span>
    <h2>Proximity is not familiarity.</h2>
    <p>A high habitability score is a prompt for observation, not proof of life.</p>
    <p>The most interesting worlds in this atlas orbit small red stars. Their closeness makes atmospheric follow-up possible, while stellar flares make those atmospheres difficult to keep.</p>
    <blockquote>Good visual analysis tells you what to look at next, not what to believe.</blockquote>
  </article>`;
}

function sharedHead(title: string, description: string): string {
  return `<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | dvfc</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="stylesheet" href="/dvfc/style.css?v=20260920b">`;
}

function extractChartYaml(source: string, chartId: string): string {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line === `  - id: ${chartId}`);
  if (start < 0) return `id: ${chartId}`;
  let end = start + 1;
  while (
    end < lines.length &&
    !lines[end].startsWith('  - id: ') &&
    !lines[end].startsWith('layout:')
  ) {
    end++;
  }
  return lines
    .slice(start, end)
    .map((line) => (line.startsWith('  ') ? line.slice(2) : line))
    .join('\n')
    .trim();
}

function nav(): string {
  return `<nav class="nav" aria-label="Primary">
    <div class="wrap nav-inner">
      <a class="brand" href="/dvfc/">dv<em>fc</em></a>
      <ul class="nav-links">
        <li><a href="/dvfc/#how">How it works</a></li>
        <li><a href="/dvfc/#gallery">Examples</a></li>
        <li><a href="/dvfc/charts.html">Chart types</a></li>
        <li><a href="https://github.com/KobaKhit/dvfc" target="_blank" rel="noopener">GitHub</a></li>
        <li><a class="btn btn-primary btn-sm" href="/dvfc/#demo">Live demo</a></li>
      </ul>
    </div>
  </nav>`;
}

function chartPage(
  example: Example,
  chart: ChartEntry,
  index: number,
  csv: string,
  snippet: string
): string {
  const previous = examples[(index - 1 + examples.length) % examples.length];
  const next = examples[(index + 1) % examples.length];
  const visual = example.svg
    ? `<img class="chart-page-svg" src="/dvfc/assets/previews/${example.svg}" alt="${escapeHtml(
        chart.title ?? example.name
      )} generated by dvfc" width="760" height="460">`
    : example.slug === 'table'
      ? tablePreview(csv)
      : textPreview();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${sharedHead(`${example.name} chart`, example.description)}
</head>
<body class="chart-example-page" style="--example-accent:${example.accent}">
  ${nav()}
  <main>
    <header class="example-hero wrap">
      <div>
        <a class="breadcrumb" href="/dvfc/charts.html">← All chart types</a>
        <p class="section-kicker">${escapeHtml(example.eyebrow)}</p>
        <h1>${escapeHtml(example.name)} chart</h1>
        <p>${escapeHtml(example.description)}</p>
      </div>
      <div class="example-number">${String(index + 1).padStart(2, '0')}</div>
    </header>

    <section class="example-stage wrap-wide">
      <div class="example-visual">${visual}</div>
      <aside class="example-insight">
        <span class="tag">${escapeHtml(example.tag)}</span>
        <h2>${escapeHtml(chart.title ?? example.name)}</h2>
        <p>${escapeHtml(example.insight)}</p>
        <dl>
          <div><dt>Dataset</dt><dd>Landmark exoplanets</dd></div>
          <div><dt>Renderer</dt><dd>${example.svg ? 'Vega-Lite SVG' : 'Mosaic HTML'}</dd></div>
          <div><dt>Source</dt><dd><code>cosmic-atlas.dash.yaml</code></dd></div>
        </dl>
      </aside>
    </section>

    <section class="example-code wrap">
      <div>
        <p class="section-kicker">Source</p>
        <h2>The spec behind this chart</h2>
        <p>Copy this block into a dash file, point <code>dataSource</code> at your own data, and run <code>dvfc build</code>.</p>
      </div>
      <pre><code>${escapeHtml(snippet)}</code></pre>
    </section>

    <nav class="example-pagination wrap" aria-label="Chart examples">
      <a href="/dvfc/charts/${previous.slug}/"><span>Previous</span><strong>← ${previous.name}</strong></a>
      <a href="/dvfc/charts/${next.slug}/"><span>Next</span><strong>${next.name} →</strong></a>
    </nav>
  </main>
</body>
</html>`;
}

function galleryPage(): string {
  const cards = examples
    .map(
      (example, index) => `<a class="chart-catalog-card reveal" href="/dvfc/charts/${example.slug}/" style="--card-accent:${example.accent};--delay:${index * 35}ms">
        <div class="chart-catalog-visual">
          ${
            example.svg
              ? `<img src="/dvfc/assets/previews/${example.svg}" alt="${escapeHtml(example.name)} example" loading="lazy">`
              : example.slug === 'table'
                ? '<div class="mini-table"><i></i><i></i><i></i><i></i></div>'
                : '<div class="mini-note"><b>Field note</b><span></span><span></span><span></span></div>'
          }
          <span class="chart-catalog-index">${String(index + 1).padStart(2, '0')}</span>
        </div>
        <div class="chart-catalog-meta">
          <div><span>${escapeHtml(example.eyebrow)}</span><h2>${escapeHtml(example.name)}</h2></div>
          <span class="catalog-arrow">↗</span>
        </div>
        <p>${escapeHtml(example.description)}</p>
      </a>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  ${sharedHead('Chart gallery', 'Every dvfc chart type rendered from a real exoplanet dataset.')}
</head>
<body>
  <div class="site">
    ${nav()}
    <header class="catalog-hero">
      <div class="wrap">
        <p class="section-kicker">13 chart types, one spec format</p>
        <h1>Every chart type, built from one real dataset.</h1>
        <p>The previews below are SVG files exported by dvfc from a catalog of 43 confirmed exoplanets. Open any chart to see it at full size next to the YAML that produced it.</p>
        <div class="catalog-orbit" aria-hidden="true"><i></i><i></i><i></i></div>
      </div>
    </header>
    <main class="wrap">
      <div class="catalog-filter" aria-label="Chart categories">
        <span>All 13</span><span>Time</span><span>Comparison</span><span>Distribution</span><span>Composition</span><span>Detail</span>
      </div>
      <div class="chart-catalog">${cards}</div>
      <section class="cta-band catalog-cta">
        <div><h2>See them linked together</h2><p>The live demo uses the same dataset with brushing across four charts.</p></div>
        <a class="btn btn-primary" href="/dvfc/examples/showcase/">Open the live demo</a>
      </section>
    </main>
  </div>
  <script>
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('is-visible'));
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  </script>
</body>
</html>`;
}

async function main(): Promise<void> {
  const dashSource = await readFile(dashPath, 'utf-8');
  const parsed = parseSpecString(dashSource, { path: dashPath });
  if (parsed.kind !== 'dash') throw new Error(`Expected dash spec at ${dashPath}`);
  const dash = parsed.dash as { charts: ChartEntry[] };
  const csv = await readFile(dataPath, 'utf-8');
  const byId = new Map(dash.charts.map((chart) => [chart.id, chart]));

  await writeFile(join(siteDir, 'charts.html'), galleryPage());
  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    const chart = byId.get(example.chartId);
    if (!chart) throw new Error(`Missing chart '${example.chartId}' in ${dashPath}`);
    const outDir = join(siteDir, 'charts', example.slug);
    await mkdir(outDir, { recursive: true });
    await writeFile(
      join(outDir, 'index.html'),
      chartPage(example, chart, i, csv, extractChartYaml(dashSource, example.chartId))
    );
  }
  console.log(`✓ Generated ${examples.length} chart example pages`);
}

await main();
