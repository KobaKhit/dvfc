/**
 * @dvfc/resolve
 *
 * Public connector API. Implementation currently lives in @dvfc/core (normalize);
 * this package is the stable import path for resolve-layer consumers and
 * future MetricFlow / remote adapters.
 */

export {
  resolveDataRef,
  extractSqlFileRefs,
  findDbtStubDir,
  findDbtModelCsv,
  normalizeToDashboard,
  normalizeFile,
  type FileAsset,
  type ResolvedRelation,
  type NormalizeOptions,
  type NormalizeResult,
} from '@dvfc/core';

export type {
  DataRef,
  DataRefType,
  DataRefDbt,
  DataRefDbtMetric,
  DataRefSql,
  DataRefData,
} from '@dvfc/core';
