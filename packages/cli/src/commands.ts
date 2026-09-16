/**
 * CLI commands for coordboard
 */

import { readFile, writeFile, mkdir, cp } from 'fs/promises';
import { join, dirname, resolve as resolvePath } from 'path';
import { parse as parseYAML } from 'yaml';
import type { DashboardSpec } from '@coordboard/core';
import { validateDashboardSpec } from '@coordboard/core';
import type { DbtManifest } from '@coordboard/dbt-adapter';
import { createDbtResolver } from '@coordboard/dbt-adapter';
import { generateMainScript, generateHTML, type GeneratorContext } from './generator.js';
import { build as viteBuild } from 'vite';

export interface PreviewOptions {
  port?: number;
  open?: boolean;
}

export interface BuildOptions {
  outDir?: string;
  minify?: boolean;
}

/**
 * Preview command - start dev server with live reload
 */
export async function preview(specPath: string, options: PreviewOptions = {}): Promise<void> {
  console.log(`🚀 Starting preview server for: ${specPath}`);
  console.log(`   Port: ${options.port || 3000}`);
  
  console.log('\n⚠️  Preview command not yet implemented.');
  console.log('   Use "coordboard build" to generate static HTML, then serve with:');
  console.log('   npx serve dist\n');
}

/**
 * Build command - generate static HTML from dashboard spec
 */
export async function build(specPath: string, options: BuildOptions = {}): Promise<void> {
  const outDir = options.outDir || 'dist';
  
  console.log(`📦 Building dashboard from: ${specPath}`);
  console.log(`   Output: ${outDir}`);
  
  try {
    // Load and parse dashboard spec
    const spec = await loadSpec(specPath);
    console.log(`✓ Loaded spec: ${spec.meta.title}`);
    
    // Validate spec
    const validation = validateDashboardSpec(spec);
    if (!validation.valid) {
      throw new Error(`Invalid spec: ${validation.errors?.join(', ')}`);
    }
    console.log(`✓ Spec validated`);
    
    // Resolve dbt models if any
    const specDir = dirname(resolvePath(specPath));
    const dbtManifestPath = join(specDir, 'dbt-stub', 'manifest.json');
    const dbtDataDir = join(specDir, 'dbt-stub');
    
    try {
      const manifestData = JSON.parse(await readFile(dbtManifestPath, 'utf-8')) as DbtManifest;
      const resolver = await createDbtResolver(manifestData, { dataDir: dbtDataDir });
      
      // Verify all dbt models exist
      for (const dataSource of spec.data) {
        if (dataSource.type === 'dbt' && dataSource.model) {
          const path = resolver.ref(dataSource.model);
          console.log(`✓ Resolved dbt model: ${dataSource.model} → ${path}`);
        }
      }
    } catch (err) {
      if (spec.data.some(ds => ds.type === 'dbt')) {
        console.warn(`⚠️  dbt manifest not found at ${dbtManifestPath}`);
      }
    }
    
    // Create temporary build directory
    const tempDir = join(process.cwd(), '.coordboard-build');
    await mkdir(tempDir, { recursive: true });
    await mkdir(join(tempDir, 'data'), { recursive: true });
    
    // Create package.json with dependencies
    const tempPackageJson = {
      name: 'coordboard-temp-build',
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
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execPromise = promisify(exec);
    await execPromise('npm install --silent', { cwd: tempDir });
    console.log(`✓ Dependencies installed`);
    
    // Generate context
    const ctx: GeneratorContext = {
      spec,
      dataDir: join(specDir, 'dbt-stub'),
      outputDir: outDir
    };
    
    // Generate source files
    const mainScript = generateMainScript(ctx);
    const html = generateHTML(ctx);
    
    await writeFile(join(tempDir, 'main.ts'), mainScript);
    await writeFile(join(tempDir, 'index.html'), html);
    console.log(`✓ Generated dashboard code`);
    
    // Copy data files
    for (const dataSource of spec.data) {
      if (dataSource.type === 'dbt' && dataSource.model) {
        const srcPath = join(dbtDataDir, `${dataSource.model}.csv`);
        const destPath = join(tempDir, 'data', `${dataSource.id}.csv`);
        await cp(srcPath, destPath);
        console.log(`✓ Copied data: ${dataSource.id}.csv`);
      }
    }
    
    // Create Vite config
    const viteConfig = {
      root: tempDir,
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
  const content = await readFile(path, 'utf-8');
  
  if (path.endsWith('.yaml') || path.endsWith('.yml')) {
    return parseYAML(content) as DashboardSpec;
  } else if (path.endsWith('.json')) {
    return JSON.parse(content) as DashboardSpec;
  } else {
    throw new Error('Spec file must be .yaml, .yml, or .json');
  }
}
