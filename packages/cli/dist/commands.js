/**
 * CLI commands for coordboard
 */
import { readFile, writeFile, mkdir, cp } from 'fs/promises';
import { join, dirname, resolve as resolvePath } from 'path';
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import { watch } from 'chokidar';
import { createDbtResolver } from '@coordboard/dbt-adapter';
import { generateMainScript, generateHTML } from './generator.js';
import { build as viteBuild, createServer as createViteServer } from 'vite';
import { validateWithReport, validateSemantics } from './validator.js';
/**
 * Init command - scaffold a new dashboard from dbt manifest
 */
export async function init(options = {}) {
    const outFile = options.outFile || 'board.yaml';
    if (options.fromDbt) {
        console.log(`📋 Scaffolding dashboard from dbt manifest\n`);
        // Find manifest.json
        const manifestPath = options.manifestPath || 'dbt-stub/manifest.json';
        try {
            const manifestData = JSON.parse(await readFile(manifestPath, 'utf-8'));
            const projectName = manifestData.metadata.project_name;
            console.log(`✓ Found dbt project: ${projectName}`);
            // Find mart models (models in marts schema or tagged with 'mart')
            const models = Object.values(manifestData.nodes)
                .filter(node => {
                if (node.resource_type !== 'model')
                    return false;
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
            const spec = {
                meta: {
                    title: `${projectName} Dashboard`,
                    description: `Analytics dashboard generated from dbt project ${projectName}`,
                    version: '0.1.0'
                },
                data: selectedModels.map((model, i) => ({
                    id: model.name,
                    type: 'dbt',
                    model: model.name
                })),
                charts: []
            };
            // Create charts for each model
            selectedModels.forEach((model, modelIndex) => {
                const columns = model.columns ? Object.keys(model.columns) : [];
                // Try to find date/time column
                const dateCol = columns.find(c => c.includes('date') || c.includes('time') || c.includes('_at'));
                // Try to find numeric column
                const numericCol = columns.find(c => c.includes('amount') || c.includes('revenue') || c.includes('count') || c.includes('total')) || columns.find(c => !c.includes('id') && !c.includes('name'));
                // Try to find categorical column
                const categoryCol = columns.find(c => c.includes('status') || c.includes('type') || c.includes('category') || c.includes('method'));
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
            console.log(`  1. coordboard validate ${outFile}`);
            console.log(`  2. coordboard preview ${outFile}`);
            console.log(`  3. Edit ${outFile} to customize\n`);
        }
        catch (error) {
            throw new Error(`Failed to read dbt manifest at ${manifestPath}\n` +
                `  Error: ${error instanceof Error ? error.message : String(error)}\n` +
                `  Tip: Run this command from your dbt project directory or specify --manifest-path`);
        }
    }
    else {
        // Basic init without dbt
        console.log(`📋 Creating basic dashboard template\n`);
        const spec = {
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
        console.log(`  2. coordboard validate ${outFile}`);
        console.log(`  3. coordboard preview ${outFile}\n`);
    }
}
/**
 * Validate command - validate dashboard spec
 */
export async function validate(specPath) {
    console.log(`🔍 Validating: ${specPath}\n`);
    try {
        // Load spec
        const spec = await loadSpec(specPath);
        // Schema validation
        const schemaResult = validateWithReport(spec);
        console.log(schemaResult.report);
        if (!schemaResult.valid) {
            return false;
        }
        // Semantic validation
        const semanticResult = validateSemantics(spec);
        if (!semanticResult.valid) {
            console.log('\n⚠️  Semantic validation warnings:\n');
            semanticResult.errors.forEach((err, i) => {
                console.log(`${i + 1}. Path: ${err.path}`);
                console.log(`   ${err.message}\n`);
            });
            return false;
        }
        // Check dbt models if any
        const specDir = dirname(resolvePath(specPath));
        const hasDbtModels = spec.data.some(ds => ds.type === 'dbt');
        if (hasDbtModels) {
            const dbtManifestPath = join(specDir, 'dbt-stub', 'manifest.json');
            const dbtDataDir = join(specDir, 'dbt-stub');
            try {
                const manifestData = JSON.parse(await readFile(dbtManifestPath, 'utf-8'));
                const resolver = await createDbtResolver(manifestData, { dataDir: dbtDataDir });
                console.log('✓ dbt manifest found');
                // Verify all dbt models exist
                for (const dataSource of spec.data) {
                    if (dataSource.type === 'dbt' && dataSource.model) {
                        try {
                            const path = resolver.ref(dataSource.model);
                            console.log(`✓ dbt model '${dataSource.model}' → ${path}`);
                        }
                        catch (err) {
                            console.log(`❌ dbt model '${dataSource.model}' not found in manifest`);
                            return false;
                        }
                    }
                }
            }
            catch (err) {
                console.log(`❌ dbt manifest not found at ${dbtManifestPath}`);
                return false;
            }
        }
        console.log('\n✅ All validation checks passed!\n');
        return true;
    }
    catch (error) {
        console.error('\n❌ Validation failed:', error instanceof Error ? error.message : String(error));
        return false;
    }
}
/**
 * Preview command - start dev server with live reload
 */
export async function preview(specPath, options = {}) {
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
        const tempDir = join(process.cwd(), '.coordboard-preview');
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
            }
            catch (err) {
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
    }
    catch (error) {
        console.error('\n❌ Preview failed:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
/**
 * Generate files for preview
 */
async function generatePreviewFiles(specPath, tempDir) {
    const spec = await loadSpec(specPath);
    const specDir = dirname(resolvePath(specPath));
    // Create package.json if it doesn't exist
    const tempPackageJson = {
        name: 'coordboard-preview',
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
    }
    catch {
        await writeFile(packageJsonPath, JSON.stringify(tempPackageJson, null, 2));
        // Install dependencies
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execPromise = promisify(exec);
        await execPromise('npm install --silent', { cwd: tempDir });
    }
    const ctx = {
        spec,
        dataDir: join(specDir, 'dbt-stub'),
        outputDir: tempDir
    };
    // Generate source files
    const mainScript = generateMainScript(ctx);
    const html = generateHTML(ctx);
    await writeFile(join(tempDir, 'main.ts'), mainScript);
    await writeFile(join(tempDir, 'index.html'), html);
    // Copy data files
    for (const dataSource of spec.data) {
        if (dataSource.type === 'dbt' && dataSource.model) {
            const srcPath = join(ctx.dataDir, `${dataSource.model}.csv`);
            const destPath = join(tempDir, 'data', `${dataSource.id}.csv`);
            await cp(srcPath, destPath);
        }
    }
}
/**
 * Build command - generate static HTML from dashboard spec
 */
export async function build(specPath, options = {}) {
    const outDir = options.outDir || 'dist';
    console.log(`📦 Building dashboard from: ${specPath}`);
    console.log(`   Output: ${outDir}`);
    try {
        // Validate spec first
        console.log(`🔍 Validating spec...`);
        const isValid = await validate(specPath);
        if (!isValid) {
            throw new Error('Spec validation failed');
        }
        // Load and parse dashboard spec
        const spec = await loadSpec(specPath);
        console.log(`✓ Loaded spec: ${spec.meta.title}`);
        // Resolve dbt models if any
        const specDir = dirname(resolvePath(specPath));
        const dbtManifestPath = join(specDir, 'dbt-stub', 'manifest.json');
        const dbtDataDir = join(specDir, 'dbt-stub');
        try {
            const manifestData = JSON.parse(await readFile(dbtManifestPath, 'utf-8'));
            const resolver = await createDbtResolver(manifestData, { dataDir: dbtDataDir });
            // Verify all dbt models exist
            for (const dataSource of spec.data) {
                if (dataSource.type === 'dbt' && dataSource.model) {
                    try {
                        const path = resolver.ref(dataSource.model);
                        // Verify the file actually exists
                        await readFile(path, 'utf-8');
                        console.log(`✓ Resolved dbt model: ${dataSource.model} → ${path}`);
                    }
                    catch (fileErr) {
                        throw new Error(`dbt model '${dataSource.model}' resolved to ${resolver.ref(dataSource.model)} but file not found.\n` +
                            `  Data source ID: ${dataSource.id}\n` +
                            `  Expected path: ${resolver.ref(dataSource.model)}\n` +
                            `  Tip: Check that the CSV file exists in ${dbtDataDir}/`);
                    }
                }
            }
        }
        catch (err) {
            if (spec.data.some(ds => ds.type === 'dbt')) {
                if (err instanceof Error && err.message.includes('dbt model')) {
                    throw err; // Re-throw detailed error
                }
                throw new Error(`dbt manifest not found at ${dbtManifestPath}\n` +
                    `  Your spec references dbt models but no manifest.json was found.\n` +
                    `  Expected location: ${dbtManifestPath}\n` +
                    `  Tip: Place your dbt manifest.json and CSV files in a 'dbt-stub' directory next to your board.yaml`);
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
        await writeFile(join(tempDir, 'package.json'), JSON.stringify(tempPackageJson, null, 2));
        // Install dependencies in temp directory
        console.log(`📦 Installing dependencies...`);
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execPromise = promisify(exec);
        await execPromise('npm install --silent', { cwd: tempDir });
        console.log(`✓ Dependencies installed`);
        // Generate context
        const ctx = {
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
        await viteBuild(viteConfig);
        // Copy data to output
        await cp(join(tempDir, 'data'), join(outDir, 'data'), { recursive: true });
        console.log(`\n✅ Build complete!`);
        console.log(`   Output: ${outDir}/index.html`);
        console.log(`   Preview: npx serve ${outDir}\n`);
    }
    catch (error) {
        console.error('\n❌ Build failed:', error instanceof Error ? error.message : String(error));
        throw error;
    }
}
/**
 * Load dashboard spec from YAML or JSON file
 */
export async function loadSpec(path) {
    const content = await readFile(path, 'utf-8');
    if (path.endsWith('.yaml') || path.endsWith('.yml')) {
        return parseYAML(content);
    }
    else if (path.endsWith('.json')) {
        return JSON.parse(content);
    }
    else {
        throw new Error('Spec file must be .yaml, .yml, or .json');
    }
}
