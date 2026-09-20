/**
 * @dvfc/build — shared validate + build pipeline for CLI and MCP
 */

export {
  validateSpecFile,
  validateSpecFileWithResult,
  loadSpec,
  loadNormalized,
  applyDvfcConfig,
  type ValidateOptions,
  type ValidateSpecResult,
} from './validate-spec.js';

export {
  validateChartWithReport,
  validateDashWithReport,
  type ValidationError,
  type ValidationResult,
} from './validator.js';

export {
  buildHtmlDashboard,
  generatePreviewFiles,
  createPreviewViteConfig,
  createViteServer,
  type BuildHtmlOptions,
  type PreviewFilesOptions,
} from './html-build.js';

export {
  buildStaticChart,
  type BuildStaticOptions,
  type StaticFormat,
} from './static-export.js';

export {
  buildDcDashboard,
  type BuildDcOptions,
} from './dc-export.js';

export {
  buildDcWasmDashboard,
  createDcWasmPreviewViteConfig,
  type BuildDcWasmOptions,
} from './dc-wasm-build.js';

export {
  mosaicRuntimeAliases,
  dcRuntimeAliases,
  resolvePkgRoot,
} from './resolve-runtime.js';

export {
  scaffoldDashFromManifest,
  scaffoldBlankDashYaml,
  dashboardSpecToDashYaml,
  blankDashSpec,
} from './scaffold.js';

export {
  addChartToSpecFile,
  updateChartInSpecFile,
  explainCoordination,
  applyFilterPlan,
} from './dash-mutate.js';
