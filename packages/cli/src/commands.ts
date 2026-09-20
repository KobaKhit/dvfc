/**
 * CLI commands for Data Viz Factory
 */

import { readFile, writeFile, mkdir, cp } from 'fs/promises';
import { join, dirname, resolve as resolvePath } from 'path';
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import { watch } from 'chokidar';
import type { DashboardSpec } from '@dvfc/core';
import type { DbtManifest } from '@dvfc/dbt-adapter';
import { createDbtResolver } from '@dvfc/dbt-adapter';
import {
  parseSpecString,
  dashToBoard,
  registerBuiltinChartTypes,
  listChartTypes,
  normalizeFile,
  findDbtStubDir,
  type NormalizeResult,
} from '@dvfc/core';
import { generateMainScript, generateHTML, type GeneratorContext } from './generator.js';
import { build as viteBuild, createServer as createViteServer } from 'vite';
import {
  validateWithReport,
  validateSemantics,
  validateChartWithReport,
  validateDashWithReport,
  type ValidationResult,
} from './validator.js';

export interface InitOptions {
  fromDbt?: boolean;
  manifestPath?: string;
  outFile?: string;
}

/**
 * Init command - scaffold a new dashboard from dbt manifest
 */
export async function init(options: InitOptions = {}): Promise<void> {
  const outFile = options.outFile || 'board.yaml';
  
  if (options.fromDbt) {
    console.log(`📋 Scaffolding dashboard from dbt manifest\n`);
    
    // Find manifest.json
    const manifestPath = options.manifestPath || 'dbt-stub/manifest.json';
    
    try {
      const manifestData = JSON.parse(await readFile(manifestPath, 'utf-8')) as DbtManifest;
      const projectName = manifestData.metadata.project_name;
      
      console.log(`✓ Found dbt project: ${projectName}`);
      
      // Find mart models (models in marts schema or tagged with 'mart')
      const models = Object.values(manifestData.nodes)
        .filter(node => {
          if (node.resource_type !== 'model') return false;
          const isMart = node.schema?.includes('mart') || 
                        node.path?.includes('mart') ||
                        node.config?.tags?.includes('mart') ||
                        node.tags?.includes('mart');
          return isMart;
        });
      
      if (models.length === 0) {
        // Fall back to any models
        models.push(...Object.values(manifestData.nodes)
          .filter(node => node.resource_type === 'model')
          .slice(0, 3));
      }
      
      console.log(`✓ Found ${models.length} model(s) to visualize`);
      
      // Pick first 1-3 models
      const selectedModels = models.slice(0, Math.min(3, models.length));
      
      // Create spec
      const spec: DashboardSpec = {
        meta: {
          title: `${projectName} Dashboard`,
          description: `Analytics dashboard generated from dbt project ${projectName}`,
          version: '0.1.0'
        },
        data: selectedModels.map((model, i) => ({
          id: model.name,
          type: 'dbt' as const,
          model: model.name
        })),
        charts: []
      };
      
      // Create charts for each model
      selectedModels.forEach((model, modelIndex) => {
        const columns = model.columns ? Object.keys(model.columns) : [];
        
        // Try to find date/time column
        const dateCol = columns.find(c => 
          c.includes('date') || c.includes('time') || c.includes('_at')
        );
        
        // Try to find numeric column
        const numericCol = columns.find(c => 
          c.includes('amount') || c.includes('revenue') || c.includes('count') || c.includes('total')
        ) || columns.find(c => !c.includes('id') && !c.includes('name'));
        
        // Try to find categorical column
        const categoryCol = columns.find(c => 
          c.includes('status') || c.includes('type') || c.includes('category') || c.includes('method')
        );
        
        const selectionName = `${model.name}Brush`;
        
        if (dateCol && numericCol) {
          // Time series chart
          spec.charts.push({
            id: `${model.name}_trend`,
            type: 'line',
            dataSource: model.name,
            title: `${model.name} Trend`,
            encoding: {
              x: {
                field: dateCol,
                type: 'temporal',
                label: dateCol.replace(/_/g, ' ')
              },
              y: {
                field: numericCol,
                type: 'quantitative',
                aggregate: 'sum',
                label: numericCol.replace(/_/g, ' ')
              }
            },
            interaction: {
              brush: true,
              brushAxis: 'x',
              selection: selectionName
            },
            width: 700,
            height: 250
          });
        }
        
        if (categoryCol && numericCol) {
          // Bar chart
          spec.charts.push({
            id: `${model.name}_by_${categoryCol}`,
            type: 'bar',
            dataSource: model.name,
            title: `${model.name} by ${categoryCol.replace(/_/g, ' ')}`,
            encoding: {
              x: {
                field: categoryCol,
                type: 'nominal',
                label: categoryCol.replace(/_/g, ' ')
              },
              y: {
                field: numericCol,
                type: 'quantitative',
                aggregate: 'sum',
                label: numericCol.replace(/_/g, ' ')
              },
              color: 'steelblue'
            },
            interaction: dateCol ? {
              filterBy: selectionName
            } : undefined,
            width: 700,
            height: 300
          });
        }
      });
      
      // Write spec
      await writeFile(outFile, stringifyYAML(spec));
      
      console.log(`\n✅ Created ${outFile}`);
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
  } else {
    // Basic init without dbt
    console.log(`📋 Creating basic dashboard template\n`);
    
    const spec: DashboardSpec = {
      meta: {
        title: 'My Dashboard',
        description: 'A new analytics dashboard',
        version: '0.1.0'
      },
      data: [
        {
          id: 'my_data',
          type: 'dbt',
          model: 'my_model'
        }
      ],
      charts: [
        {
          id: 'trend',
          type: 'line',
          dataSource: 'my_data',
          title: 'Trend Over Time',
          encoding: {
            x: { field: 'date', type: 'temporal' },
            y: { field: 'value', aggregate: 'sum' }
          },
          interaction: {
            brush: true,
            selection: 'myBrush'
          },
          width: 700,
          height: 250
        },
        {
          id: 'breakdown',
          type: 'bar',
          dataSource: 'my_data',
          title: 'Breakdown by Category',
          encoding: {
            x: { field: 'category', type: 'nominal' },
            y: { field: 'value', aggregate: 'sum' }
          },
          interaction: {
            filterBy: 'myBrush'
          },
          width: 700,
          height: 300
        }
      ]
    };
    
    await writeFile(outFile, stringifyYAML(spec));
    
    console.log(`✅ Created ${outFile}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Edit ${outFile} with your data sources and charts`);
    console.log(`  2. dvfc validate ${outFile}`);
    console.log(`  3. dvfc preview ${outFile}\n`);
  }
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
  format?: 'html' | 'svg' | 'png';
}

export interface ExportPdfOptions {
  outFile?: string;
  useBrowser?: boolean;
}

/**
 * Export dashboard to PDF
 */
export async function exportPdf(specPath: string, options: ExportPdfOptions = {}): Promise<void> {
  const outFile = options.outFile || 'dashboard.pdf';
  
  console.log(`📄 Exporting dashboard to PDF: ${outFile}\n`);
  
  // First, build to HTML
  const tmpDir = '.dvfc-pdf-build';
  await build(specPath, { outDir: tmpDir, minify: false });
  
  const htmlPath = join(tmpDir, 'index.html');
  
  // Try to use playwright if available
  if (options.useBrowser !== false) {
    try {
      // Dynamic import to avoid hard dependency - use eval to bypass TypeScript
      const playwrightModule = await (eval('import("playwright")') as Promise<any>);
      const { chromium } = playwrightModule;
      
      console.log('📦 Using Playwright for PDF generation...');
      
      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.goto(`file://${resolvePath(htmlPath)}`, { waitUntil: 'networkidle' });
      
      // Add print styles
      await page.addStyleTag({
        content: `
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        `
      });
      
      await page.pdf({
        path: outFile,
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });
      
      await browser.close();
      
      console.log(`\n✅ PDF exported: ${outFile}\n`);
      
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND') {
        console.log('\n⚠️  Playwright not found. Install it for automated PDF generation:');
        console.log('   npm install -D playwright');
        console.log('\n📖 Alternative: Use browser print-to-PDF');
        console.log(`   1. Open ${htmlPath} in your browser`);
        console.log('   2. Press Ctrl+P (Cmd+P on Mac)');
        console.log('   3. Select "Save as PDF"');
        console.log('   4. Click Save\n');
      } else {
        throw error;
      }
    }
  } else {
    console.log('\n📖 Manual print-to-PDF required:');
    console.log(`   1. Open ${htmlPath} in your browser`);
    console.log('   2. Press Ctrl+P (Cmd+P on Mac)');
    console.log('   3. Select "Save as PDF"');
    console.log('   4. Click Save\n');
  }
}

/**
 * Validate command - chart, dash, or legacy board
 */
export async function validate(specPath: string): Promise<boolean> {
  console.log(`🔍 Validating: ${specPath}\n`);
  registerBuiltinChartTypes();

  try {
    const content = await readFile(specPath, 'utf-8');
    const parsed = parseSpecString(content, { path: specPath });

    if (parsed.kind === 'chart') {
      console.log('Kind: chart\n');
      const result = validateChartWithReport(parsed.chart);
      console.log(result.report);
      if (!result.valid) return false;
      console.log('\n✅ All validation checks passed!\n');
      return true;
    }

    if (parsed.kind === 'dash') {
      console.log('Kind: dash\n');
      const result = validateDashWithReport(parsed.dash);
      console.log(result.report);
      if (!result.valid) return false;
      console.log('\n✅ All validation checks passed!\n');
      return true;
    }

    // Legacy board
    console.log('Kind: board (legacy → also checked as dash)\n');
    console.warn(
      '⚠️  board.yaml is deprecated. Prefer *.dash.yaml (see docs/ARCHITECTURE.md). Compat remains until M5.\n'
    );
    const spec = parsed.board;
    const schemaResult = validateWithReport(spec);
    console.log(schemaResult.report);
    if (!schemaResult.valid) return false;

    const semanticResult = validateSemantics(spec);
    if (!semanticResult.valid) {
      console.log('\n⚠️  Semantic validation failed:\n');
      semanticResult.errors.forEach((err, i) => {
        console.log(`${i + 1}. Path: ${err.path}`);
        console.log(`   ${err.message}\n`);
      });
      return false;
    }

    const dashResult = validateDashWithReport(parsed.dash);
    if (!dashResult.valid) {
      console.log('\nDash IR (from board) checks:\n');
      console.log(dashResult.report);
      return false;
    }
    console.log('✓ Dash IR compat OK');

    const specDir = dirname(resolvePath(specPath));
    const hasDbtModels = spec.data.some((ds) => ds.type === 'dbt');

    if (hasDbtModels) {
      const dbtDataDir =
        (await findDbtStubDir({
          specDir,
          projectRoot: process.cwd(),
        })) ?? join(specDir, 'dbt-stub');
      const dbtManifestPath = join(dbtDataDir, 'manifest.json');

      try {
        const manifestData = JSON.parse(await readFile(dbtManifestPath, 'utf-8')) as DbtManifest;
        const resolver = await createDbtResolver(manifestData, { dataDir: dbtDataDir });

        console.log(`✓ dbt manifest found (${dbtDataDir})`);

        for (const dataSource of spec.data) {
          if (dataSource.type === 'dbt' && dataSource.model) {
            try {
              const path = resolver.ref(dataSource.model);
              console.log(`✓ dbt model '${dataSource.model}' → ${path}`);
            } catch {
              console.log(`❌ dbt model '${dataSource.model}' not found in manifest`);
              return false;
            }
          }
        }
      } catch {
        console.log(`❌ dbt manifest not found at ${dbtManifestPath}`);
        return false;
      }
    }

    console.log('\n✅ All validation checks passed!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Validation failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Preview command - start dev server with live reload
 */
export async function preview(specPath: string, options: PreviewOptions = {}): Promise<void> {
  const port = options.port || 3000;
  
  console.log(`🚀 Starting preview server for: ${specPath}`);
  console.log(`   Port: ${port}\n`);
  
  try {
    // Validate first
    const isValid = await validate(specPath);
    if (!isValid) {
      throw new Error('Spec validation failed');
    }
    
    // Load spec
    const spec = await loadSpec(specPath);
    const specDir = dirname(resolvePath(specPath));
    
    // Create temporary preview directory
    const tempDir = join(process.cwd(), '.dvfc-preview');
    await mkdir(tempDir, { recursive: true });
    await mkdir(join(tempDir, 'data'), { recursive: true });
    
    // Generate initial files
    await generatePreviewFiles(specPath, tempDir);
    
    // Create Vite server
    const server = await createViteServer({
      root: tempDir,
      server: {
        port,
        open: options.open,
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp'
        }
      },
      optimizeDeps: {
        exclude: ['@duckdb/duckdb-wasm']
      }
    });
    
    await server.listen();
    
    console.log(`\n✅ Preview server running!`);
    console.log(`   URL: http://localhost:${port}`);
    console.log(`   Watching: ${specPath}\n`);
    console.log('Press Ctrl+C to stop\n');
    
    // Watch spec file for changes
    const watcher = watch(specPath, {
      persistent: true,
      ignoreInitial: true
    });
    
    watcher.on('change', async () => {
      console.log('📝 Spec changed, regenerating...');
      try {
        const isValid = await validate(specPath);
        if (isValid) {
          await generatePreviewFiles(specPath, tempDir);
          console.log('✅ Files regenerated\n');
          // Trigger HMR
          server.ws.send({
            type: 'full-reload'
          });
        }
      } catch (err) {
        console.error('❌ Regeneration failed:', err);
      }
    });
    
    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down preview server...');
      watcher.close();
      await server.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('\n❌ Preview failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Install preview/build deps using pnpm (preferred) or npm
 */
async function installDeps(cwd: string): Promise<void> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execPromise = promisify(exec);
  const env = {
    ...process.env,
    PATH: `/home/koba/.local/share/pnpm:/home/koba/.local/share/pnpm/bin:${process.env.PATH || ''}`,
  };
  // Prevent parent pnpm workspace from swallowing this install
  await writeFile(join(cwd, '.npmrc'), 'ignore-workspace=true\n');
  try {
    await execPromise('pnpm install', { cwd, env });
  } catch {
    await execPromise('npm install --silent', { cwd, env });
  }
}

/**
 * Generate files for preview
 */
async function generatePreviewFiles(specPath: string, tempDir: string): Promise<void> {
  const normalized = await normalizeFile(specPath, process.cwd());
  const { spec, assets } = normalized;
  
  // Create package.json if it doesn't exist
  const tempPackageJson = {
    name: 'dvfc-preview',
    type: 'module',
    dependencies: {
      '@uwdata/vgplot': '^0.31.0',
      '@duckdb/duckdb-wasm': '^1.32.0',
      'apache-arrow': '^17.0.0'
    }
  };
  
  const packageJsonPath = join(tempDir, 'package.json');
  try {
    await readFile(packageJsonPath);
  } catch {
    await writeFile(packageJsonPath, JSON.stringify(tempPackageJson, null, 2));
    
    await installDeps(tempDir);
  }
  
  const ctx: GeneratorContext = {
    spec,
    dataDir: join(tempDir, 'data'),
    outputDir: tempDir,
    base: '/'
  };
  
  // Generate source files
  const mainScript = generateMainScript(ctx);
  const html = generateHTML(ctx);
  
  await writeFile(join(tempDir, 'main.ts'), mainScript);
  await writeFile(join(tempDir, 'index.html'), html);
  
  // Copy resolved assets
  for (const asset of assets) {
    await cp(asset.absPath, join(tempDir, 'data', asset.destName));
  }
}

/**
 * Build command - generate static HTML from dashboard spec
 */
export async function build(specPath: string, options: BuildOptions = {}): Promise<void> {
  const format = options.format || 'html';
  const outDir = options.outDir || 'dist';

  if (format === 'svg' || format === 'png') {
    const { exportStatic } = await import('./vega-export.js');
    // Policy: dash/board multi-chart → require --chart <id>
    const normalized = await normalizeFile(specPath, process.cwd());
    if (normalized.spec.charts.length !== 1 && !options.chartId) {
      throw new Error(
        `Static ${format} export from a dash/board requires --chart <id> ` +
          `(found ${normalized.spec.charts.length} charts). Policy: one chart per svg/png artifact.`
      );
    }
    const outFile =
      options.outDir && !options.outDir.endsWith(`.${format}`)
        ? join(options.outDir, `${options.chartId || 'chart'}.${format}`)
        : options.outDir || `chart.${format}`;
    console.log(`📦 Exporting ${format.toUpperCase()} from: ${specPath}`);
    const path = await exportStatic(specPath, {
      format,
      outFile,
      chartId: options.chartId,
      projectRoot: process.cwd(),
    });
    console.log(`\n✅ Wrote ${path}\n`);
    return;
  }
  
  console.log(`📦 Building dashboard from: ${specPath}`);
  console.log(`   Output: ${outDir}`);
  
  try {
    // Validate spec first
    console.log(`🔍 Validating spec...`);
    const isValid = await validate(specPath);
    if (!isValid) {
      throw new Error('Spec validation failed');
    }
    
    // Load and normalize dashboard / chart / dash
    const normalized = await normalizeFile(specPath, process.cwd());
    let { spec, assets } = normalized;
    console.log(`✓ Loaded spec: ${spec.meta.title} (${normalized.kind})`);
    
    // If chartId specified, filter to single chart
    if (options.chartId) {
      const chart = spec.charts.find(c => c.id === options.chartId);
      if (!chart) {
        throw new Error(`Chart '${options.chartId}' not found in spec`);
      }
      
      // Filter data sources to only those used by this chart
      const usedDataSources = new Set([chart.dataSource]);
      spec = {
        ...spec,
        data: spec.data.filter(ds => usedDataSources.has(ds.id)),
        charts: [chart],
      };
      assets = assets.filter(a =>
        spec.data.some(ds => a.destName === `${ds.id}.csv` || a.destName.startsWith(ds.id))
      );
      
      console.log(`✓ Building single chart: ${chart.id} (${chart.type})`);
      if (chart.title) console.log(`  Title: ${chart.title}`);
    }
    
    // Resolve dbt models if any (stub may live next to sibling examples)
    const specDir = dirname(resolvePath(specPath));
    const dbtDataDir =
      (await findDbtStubDir({
        specDir,
        projectRoot: process.cwd(),
      })) ?? join(specDir, 'dbt-stub');
    const dbtManifestPath = join(dbtDataDir, 'manifest.json');

    if (spec.data.some((ds) => ds.type === 'dbt')) {
      try {
        const manifestData = JSON.parse(await readFile(dbtManifestPath, 'utf-8')) as DbtManifest;
        const resolver = await createDbtResolver(manifestData, { dataDir: dbtDataDir });

        for (const dataSource of spec.data) {
          if (dataSource.type === 'dbt' && dataSource.model) {
            const path = resolver.ref(dataSource.model);
            await readFile(path, 'utf-8');
            console.log(`✓ Resolved dbt model: ${dataSource.model} → ${path}`);
          }
        }
      } catch (err) {
        // Assets already resolved by normalize — allow build if CSVs are present
        const missingAssets = spec.data.filter(
          (ds) =>
            ds.type === 'dbt' &&
            !assets.some((a) => a.destName === `${ds.id}.csv`)
        );
        if (missingAssets.length > 0) {
          if (err instanceof Error && err.message.includes('dbt model')) {
            throw err;
          }
          throw new Error(
            `dbt manifest not found at ${dbtManifestPath}\n` +
              `  Your spec references dbt models but no manifest.json was found.\n` +
              `  Tip: Place dbt-stub next to the spec or under examples/*/dbt-stub`
          );
        }
        console.log(`✓ Using resolved CSV assets (stub: ${dbtDataDir})`);
      }
    }
    
    // Create temporary build directory outside the monorepo (avoid pnpm workspace)
    const { mkdtemp } = await import('fs/promises');
    const { tmpdir } = await import('os');
    const tempDir = await mkdtemp(join(tmpdir(), 'dvfc-build-'));
    await mkdir(join(tempDir, 'data'), { recursive: true });
    // Create package.json with dependencies
    const tempPackageJson = {
      name: 'dvfc-temp-build',
      type: 'module',
      dependencies: {
        '@uwdata/vgplot': '^0.31.0',
        '@duckdb/duckdb-wasm': '^1.32.0',
        'apache-arrow': '^17.0.0'
      }
    };
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify(tempPackageJson, null, 2)
    );
    
    // Install dependencies in temp directory
    console.log(`📦 Installing dependencies...`);
    await installDeps(tempDir);
    console.log(`✓ Dependencies installed`);
    
    // Generate context
    const ctx: GeneratorContext = {
      spec,
      dataDir: dbtDataDir,
      outputDir: outDir,
      base: options.base || '/'
    };
    
    // Generate source files
    const mainScript = generateMainScript(ctx);
    const html = generateHTML(ctx);
    
    await writeFile(join(tempDir, 'main.ts'), mainScript);
    await writeFile(join(tempDir, 'index.html'), html);
    console.log(`✓ Generated dashboard code`);
    
    // Copy resolved assets
    for (const asset of assets) {
      await cp(asset.absPath, join(tempDir, 'data', asset.destName));
      console.log(`✓ Copied data: ${asset.destName}`);
    }
    
    // Create Vite config
    const viteConfig = {
      root: tempDir,
      base: options.base || '/',
      build: {
        outDir: resolvePath(outDir),
        emptyOutDir: true,
        minify: options.minify ? 'esbuild' : false,
        rollupOptions: {
          input: join(tempDir, 'index.html')
        }
      },
      optimizeDeps: {
        exclude: ['@duckdb/duckdb-wasm']
      },
      server: {
        headers: {
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp'
        }
      }
    };
    
    // Build with Vite
    console.log(`\n📦 Bundling with Vite...`);
    await viteBuild(viteConfig as any);
    
    // Copy data to output
    await cp(join(tempDir, 'data'), join(outDir, 'data'), { recursive: true });
    
    console.log(`\n✅ Build complete!`);
    console.log(`   Output: ${outDir}/index.html`);
    console.log(`   Preview: npx serve ${outDir}\n`);
    
  } catch (error) {
    console.error('\n❌ Build failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Load dashboard spec from YAML or JSON file
 */
export async function loadSpec(path: string): Promise<DashboardSpec> {
  const { spec } = await normalizeFile(path, process.cwd());
  return spec;
}

export async function loadNormalized(path: string): Promise<NormalizeResult> {
  return normalizeFile(path, process.cwd());
}

/**
 * Dump normalized DashboardSpec (legacy Mosaic shape) for debugging / adapters
 */
export async function normalizeCommand(
  specPath: string,
  options: { outFile?: string } = {}
): Promise<void> {
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
    console.log(`✅ Wrote normalized dash → ${options.outFile} (${result.kind})`);
  } else {
    console.log(yaml);
  }
}

/** List registered chart types (builtins + any loaded plugins) */
export function printChartTypes(): void {
  registerBuiltinChartTypes();
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
  console.log(`\n${types.length} types (add plugins via loadChartTypeModules / dvfc.config — see docs/ARCHITECTURE.md)\n`);
}
