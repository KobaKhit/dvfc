/**
 * @dvfc/render-dc — dc.js + crossfilter HTML (static CDN or DuckDB-WASM)
 */
export {
  exportDcDashboard,
  generateDcHtml,
  generateDcChartCode,
  type DcExportOptions,
} from './export.js';

export {
  generateDcWasmMainScript,
  generateDcWasmHTML,
  type DcWasmGeneratorContext,
} from './wasm.js';
