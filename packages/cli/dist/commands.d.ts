/**
 * CLI commands for Data Viz Factory
 */
import type { DashboardSpec } from '@dvfc/core';
import { type NormalizeResult } from '@dvfc/core';
export interface InitOptions {
    fromDbt?: boolean;
    manifestPath?: string;
    outFile?: string;
}
/**
 * Init command - scaffold a new dash from dbt manifest
 */
export declare function init(options?: InitOptions): Promise<void>;
export interface PreviewOptions {
    port?: number;
    open?: boolean;
}
export interface BuildOptions {
    outDir?: string;
    minify?: boolean;
    chartId?: string;
    base?: string;
    format?: 'html' | 'svg' | 'png';
}
export interface ExportPdfOptions {
    outFile?: string;
    useBrowser?: boolean;
}
/**
 * Export dashboard to PDF
 */
export declare function exportPdf(specPath: string, options?: ExportPdfOptions): Promise<void>;
/**
 * Validate command - chart or dash
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
export declare function loadNormalized(path: string): Promise<NormalizeResult>;
/**
 * Dump normalized DashboardSpec (legacy Mosaic shape) for debugging / adapters
 */
export declare function normalizeCommand(specPath: string, options?: {
    outFile?: string;
}): Promise<void>;
/** List registered chart types (builtins + any loaded plugins) */
export declare function printChartTypes(): void;
