/**
 * Self-contained dc.js dashboard HTML page.
 */

import type { DashboardSpec } from '@dvfc/core';
import { resolvePalette } from '@dvfc/core';
import { generateDcChartCode } from './charts.js';
import { DVFC_TIP_JS } from './tips.js';
import { buildDcPage } from './shell.js';

/**
 * Build a full HTML document with embedded data + dc.js charts.
 */
export function generateDcHtml(
  spec: DashboardSpec,
  valuesBySource: Map<string, Record<string, unknown>[]>
): string {
  const dataSources = [...new Set(spec.charts.map((c) => c.dataSource).filter(Boolean))] as string[];

  const dataLiteral = Object.fromEntries(
    dataSources.map((id) => [id, valuesBySource.get(id) ?? []])
  );

  const cfSetup = dataSources
    .map((id) => {
      const safe = id.replace(/[^a-zA-Z0-9_]/g, '_');
      return `  const cf_${safe} = crossfilter(DATA['${id}'] || []);`;
    })
    .join('\n');

  const palette = resolvePalette(spec.theme);
  const chartCode = spec.charts.map((c) => generateDcChartCode(c, palette)).join('\n');

  const scriptsHtml = `<script src="https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/crossfilter2@1.5.4/crossfilter.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dc@4.2.7/dist/dc.min.js"></script>
  <script>
(function () {
  const DATA = ${JSON.stringify(dataLiteral)};
  const charts = [];

  function dvfcSize(sel, fallbackW, fallbackH) {
    const host = document.querySelector(sel);
    const w = Math.max(160, Math.floor((host && host.clientWidth) || fallbackW));
    const rawH = host ? host.clientHeight : 0;
    const h = rawH > 48 ? rawH : fallbackH;
    return { w, h };
  }
${DVFC_TIP_JS}

  dc.config.defaultColors(${JSON.stringify(palette)});

${cfSetup}

${chartCode}

  document.getElementById('reset-all')?.addEventListener('click', () => {
    dc.filterAll();
    dc.redrawAll();
  });

  dc.renderAll();
  dvfcInstallTips();
})();
  </script>`;

  return buildDcPage({
    spec,
    badgeHtml:
      'dc.js · static · crossfilter · <span class="reset" id="reset-all">reset filters</span>',
    footerHtml:
      'Built with dvfc · <a href="https://dc-js.github.io/dc.js/">dc.js</a> · static (CDN + inlined CSV)',
    scriptsHtml,
  });
}
