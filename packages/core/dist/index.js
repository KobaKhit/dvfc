/**
 * Fix isDashChartRef - a ref has `chart` string and typically no `type`.
 * Inline charts have `type`. An object with both shouldn't happen.
 */
/**
 * @dvfc/core
 * Core types, IR (chart/dash), schemas, parse, registry
 */
export * from './types.js';
export * from './schema.js';
export * from './ir.js';
export * from './ir-schema.js';
export * from './compat.js';
export * from './parse.js';
export * from './registry.js';
export * from './builtins.js';
export * from './validate-ir.js';
export * from './normalize.js';
