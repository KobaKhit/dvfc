/**
 * CLI commands for coordboard
 */
import type { DashboardSpec } from '@coordboard/core';
export interface InitOptions {
    fromDbt?: boolean;
    manifestPath?: string;
    outFile?: string;
}
/**
 * Init command - scaffold a new dashboard from dbt manifest
 */
export declare function init(options?: InitOptions): Promise<void>;
export interface PreviewOptions {
    port?: number;
    open?: boolean;
}
export interface BuildOptions {
    outDir?: string;
    minify?: boolean;
}
/**
 * Validate command - validate dashboard spec
 */
export declare function validate(specPath: string): Promise<boolean>;
/**
 * Preview command - start dev server with live reload
 */
export declare function preview(specPath: string, options?: PreviewOptions): Promise<void>;
/**
 * Build command - generate static HTML from dashboard spec
 */
export declare function build(specPath: string, options?: BuildOptions): Promise<void>;
/**
 * Load dashboard spec from YAML or JSON file
 */
export declare function loadSpec(path: string): Promise<DashboardSpec>;
