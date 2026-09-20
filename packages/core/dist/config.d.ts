/**
 * Load dvfc.config.js / .mjs / .cjs / .json from a project root.
 * Config may declare extra chart type modules to load.
 */
export interface DvfcConfig {
    /** Module paths (relative to project root, absolute, or package names) for chart type plugins */
    chartTypes?: string[];
    /** Extra options reserved for future use */
    [key: string]: unknown;
}
/**
 * Find and load dvfc.config.* from projectRoot. Returns {} if none found.
 */
export declare function loadDvfcConfig(projectRoot?: string): Promise<DvfcConfig>;
/**
 * Register builtins then load chartTypes from dvfc.config (if present).
 */
export declare function applyDvfcConfig(projectRoot?: string): Promise<DvfcConfig>;
