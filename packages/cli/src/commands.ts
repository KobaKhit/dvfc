/**
 * CLI commands for Data Viz Factory
 */

import { writeFile, mkdir } from 'fs/promises';
import { join, dirname, resolve as resolvePath } from 'path';
import { stringify as stringifyYAML } from 'yaml';
import { watch } from 'chokidar';
import type { DashboardSpec } from '@dvfc/core';
import {
  listChartTypes,
  normalizeFile,
  applyDvfcConfig,
  type NormalizeResult,
} from '@dvfc/core';
import {
  validateSpecFile,
  buildHtmlDashboard,
  buildStaticChart,
  buildDcDashboard,
  buildDcWasmDashboard,
  generatePreviewFiles,
  createPreviewViteConfig,
  createViteServer,
  loadSpec as buildLoadSpec,
  loadNormalized as buildLoadNormalized,
  scaffoldDashFromManifest,
  scaffoldBlankDashYaml,
} from '@dvfc/build';

export interface InitOptions {
  name?: string;
  template?: 'blank' | 'sales' | 'analytics';
  outDir?: string;
  fromDbt?: boolean;
  manifestPath?: string;
  outFile?: string;
}

/** Init — scaffold a new dash (optionally from dbt manifest) */
export async function init(options: InitOptions = {}): Promise<void> {
  const outFile = options.outFile || 'dashboard.dash.yaml';

  if (options.fromDbt) {
    console.log(`Scaffolding dashboard from dbt manifest\n`);
    const manifestPath = options.manifestPath || 'dbt-stub/manifest.json';
    try {
      const { yaml, projectName, modelCount } = await scaffoldDashFromManifest(manifestPath);
      console.log(`Found dbt project: ${projectName}`);
      console.log(`Found ${modelCount} model(s) to visualize`);
      await writeFile(outFile, yaml);
      console.log(`\nCreated ${outFile}`);
      console.log(`\nNext steps:`);
      console.log(`  1. dvfc validate ${outFile}`);
      console.log(`  2. dvfc preview ${outFile}`);
      console.log(`  3. Edit ${outFile} to customize\n`);
    } catch (error) {
      throw new Error(
        `Failed to read dbt manifest at ${manifestPath}\n` +
          `  Error: ${error instanceof Error ? error.message : String(error)}\n` +
          `  Tip: Run this command from your dbt project directory or specify --manifest-path`
      );
    }
    return;
  }

  console.log(`Creating basic dash template\n`);
  await writeFile(outFile, scaffoldBlankDashYaml());
  console.log(`Created ${outFile}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Edit ${outFile} with your data sources and charts`);
  console.log(`  2. dvfc validate ${outFile}`);
  console.log(`  3. dvfc preview ${outFile}\n`);
}

export interface PreviewOptions {
  port?: number;
  open?: boolean;
}

export interface BuildOptions {
  outDir?: string;
  minify?: boolean;
  chartId?: string;
  base?: string;
  format?:
    | 'html'
    | 'svg'
    | 'png'
    | 'html-static'
    | 'html-dc'
    | 'html-dc-static'
    | 'html-dc-wasm';
}

export interface ExportPdfOptions {
  outFile?: string;
  useBrowser?: boolean;
}

/** Export dashboard to PDF */
export async function exportPdf(specPath: string, options: ExportPdfOptions = {}): Promise<void> {
  const outFile = options.outFile || 'dashboard.pdf';
  console.log(`Exporting dashboard to PDF: ${outFile}\n`);
  const tmpDir = '.dvfc-pdf-build';
  await build(specPath, { outDir: tmpDir, minify: false });
  const htmlPath = join(tmpDir, 'index.html');

  if (options.useBrowser !== false) {
    try {
      const playwrightModule = await (eval('import("playwright")') as Promise<{
        chromium: { launch: () => Promise<{
          newPage: () => Promise<{
            goto: (url: string, opts: object) => Promise<unknown>;
            addStyleTag: (opts: object) => Promise<unknown>;
            pdf: (opts: object) => Promise<unknown>;
          }>;
          close: () => Promise<void>;
        }> };
      }>);
      const { chromium } = playwrightModule;
      console.log('Using Playwright for PDF generation...');
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto(`file://${resolvePath(htmlPath)}`, { waitUntil: 'networkidle' });
      await page.addStyleTag({
        content: `@media print { body { margin: 0; } .no-print { display: none; } }`,
      });
      await page.pdf({
        path: outFile,
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });
      await browser.close();
      console.log(`\nPDF exported: ${outFile}\n`);
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ERR_MODULE_NOT_FOUND') {
        console.log('\nPlaywright not found. Install it for automated PDF generation:');
        console.log('   npm install -D playwright');
        console.log('\nAlternative: Use browser print-to-PDF');
        console.log(`   1. Open ${htmlPath} in your browser`);
        console.log('   2. Press Ctrl+P (Cmd+P on Mac)');
        console.log('   3. Select "Save as PDF"');
        console.log('   4. Click Save\n');
      } else {
        throw error;
      }
    }
  } else {
    console.log('\nManual print-to-PDF required:');
    console.log(`   1. Open ${htmlPath} in your browser`);
    console.log('   2. Press Ctrl+P (Cmd+P on Mac)');
    console.log('   3. Select "Save as PDF"');
    console.log('   4. Click Save\n');
  }
}

/** Validate command - chart or dash */
export async function validate(specPath: string): Promise<boolean> {
  // applyDvfcConfig runs inside validateSpecFile
  return validateSpecFile(specPath, { projectRoot: process.cwd() });
}

/** Preview command - start dev server with live reload */
export async function preview(specPath: string, options: PreviewOptions = {}): Promise<void> {
  const port = options.port || 3000;
  console.log(`Starting preview server for: ${specPath}`);
  console.log(`   Port: ${port}\n`);

  try {
    await applyDvfcConfig(process.cwd());
    const isValid = await validate(specPath);
    if (!isValid) throw new Error('Spec validation failed');

    const tempDir = join(process.cwd(), '.dvfc-preview');
    await mkdir(tempDir, { recursive: true });
    await mkdir(join(tempDir, 'data'), { recursive: true });
    await generatePreviewFiles(specPath, tempDir, { projectRoot: process.cwd() });

    const server = await createViteServer(
      createPreviewViteConfig(tempDir, { port, open: options.open })
    );
    await server.listen();

    console.log(`\nPreview server running!`);
    console.log(`   URL: http://localhost:${port}`);
    console.log(`   Watching: ${specPath}\n`);
    console.log('Press Ctrl+C to stop\n');

    const watcher = watch(specPath, { persistent: true, ignoreInitial: true });
    watcher.on('change', async () => {
      console.log('Spec changed, regenerating...');
      try {
        if (await validate(specPath)) {
          await generatePreviewFiles(specPath, tempDir, { projectRoot: process.cwd() });
          console.log('Files regenerated\n');
          server.ws.send({ type: 'full-reload' });
        }
      } catch (err) {
        console.error('Regeneration failed:', err);
      }
    });

    process.on('SIGINT', async () => {
      console.log('\n\nShutting down preview server...');
      watcher.close();
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('\nPreview failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/** Build command - Mosaic HTML, dc.js (static/WASM), or Vega SVG/PNG/html-static */
export async function build(specPath: string, options: BuildOptions = {}): Promise<void> {
  const format = options.format || 'html';
  if (format === 'svg' || format === 'png' || format === 'html-static') {
    await buildStaticChart(specPath, {
      format,
      outDir: options.outDir,
      chartId: options.chartId,
      projectRoot: process.cwd(),
    });
    return;
  }

  if (format === 'html-dc' || format === 'html-dc-static') {
    await buildDcDashboard(specPath, {
      outDir: options.outDir || 'dist',
      chartId: options.chartId,
      projectRoot: process.cwd(),
    });
    return;
  }

  if (format === 'html-dc-wasm') {
    await buildDcWasmDashboard(specPath, {
      outDir: options.outDir || 'dist',
      base: options.base,
      minify: options.minify,
      chartId: options.chartId,
      projectRoot: process.cwd(),
    });
    return;
  }

  try {
    await buildHtmlDashboard(specPath, {
      outDir: options.outDir || 'dist',
      base: options.base,
      minify: options.minify,
      chartId: options.chartId,
      projectRoot: process.cwd(),
    });
  } catch (error) {
    console.error('\nBuild failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function loadSpec(path: string): Promise<DashboardSpec> {
  return buildLoadSpec(path, process.cwd());
}

export async function loadNormalized(path: string): Promise<NormalizeResult> {
  return buildLoadNormalized(path, process.cwd());
}

export async function normalizeCommand(
  specPath: string,
  options: { outFile?: string } = {}
): Promise<void> {
  await applyDvfcConfig(process.cwd());
  const result = await normalizeFile(specPath, process.cwd());
  const yaml = stringifyYAML({
    kind: result.kind,
    meta: result.spec.meta,
    data: result.spec.data,
    charts: result.spec.charts,
    layout: result.spec.layout,
    theme: result.spec.theme,
    assets: result.assets.map((a) => ({ dest: a.destName, src: a.absPath })),
  });
  if (options.outFile) {
    await mkdir(dirname(resolvePath(options.outFile)), { recursive: true });
    await writeFile(options.outFile, yaml);
    console.log(`Wrote normalized dash → ${options.outFile} (${result.kind})`);
  } else {
    console.log(yaml);
  }
}

/** List registered chart types (builtins + plugins from dvfc.config) */
export async function printChartTypes(): Promise<void> {
  await applyDvfcConfig(process.cwd());
  const types = listChartTypes();
  console.log('Registered chart types:\n');
  for (const t of types) {
    const caps = [
      t.capabilities.mosaic ? 'mosaic' : null,
      t.capabilities.vegaLite ? 'vega-lite' : null,
      ...(t.capabilities.interaction ?? []),
    ]
      .filter(Boolean)
      .join(', ');
    console.log(`  ${t.id.padEnd(12)} ${(t.label ?? '').padEnd(16)} ${caps}`);
  }
  console.log(
    `\n${types.length} types (add plugins via dvfc.config.js chartTypes, see docs/ARCHITECTURE.md)\n`
  );
}
