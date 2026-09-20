/**
 * @dvfc/resolve
 *
 * Public connector API: DataRef resolve + MetricFlow compile for dbt_metric.
 */

export {
  resolveDataRef,
  extractSqlFileRefs,
  findDbtStubDir,
  findDbtModelCsv,
  normalizeToDashboard,
  normalizeFile,
  compileDbtMetricSql,
  invokeMetricFlow,
  findMetricFixtureSql,
  extractSqlFromMetricFlowOutput,
  findDbtProjectRoot,
  type FileAsset,
  type ResolvedRelation,
  type NormalizeOptions,
  type NormalizeResult,
  type MetricFlowCompileOptions,
} from '@dvfc/core';

export type {
  DataRef,
  DataRefType,
  DataRefDbt,
  DataRefDbtMetric,
  DataRefSql,
  DataRefData,
} from '@dvfc/core';
