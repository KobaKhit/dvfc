/**
 * CLI commands for coordboard
 */
/**
 * Preview command - start dev server with live reload
 */
export async function preview(specPath, options = {}) {
    console.log(`🚀 Starting preview server for: ${specPath}`);
    console.log(`   Port: ${options.port || 3000}`);
    console.log(`   Open browser: ${options.open ? 'yes' : 'no'}`);
    // Stub implementation
    console.log('\n⚠️  Preview command is a stub. Real implementation will:');
    console.log('   1. Load and validate dashboard spec');
    console.log('   2. Start Vite dev server');
    console.log('   3. Generate Mosaic dashboard on-the-fly');
    console.log('   4. Enable hot module reload\n');
}
/**
 * Build command - generate static HTML
 */
export async function build(specPath, options = {}) {
    console.log(`📦 Building dashboard from: ${specPath}`);
    console.log(`   Output: ${options.outDir || 'dist'}`);
    console.log(`   Minify: ${options.minify ? 'yes' : 'no'}`);
    // Stub implementation
    console.log('\n⚠️  Build command is a stub. Real implementation will:');
    console.log('   1. Load and validate dashboard spec');
    console.log('   2. Resolve dbt models and data sources');
    console.log('   3. Generate Mosaic visualization code');
    console.log('   4. Bundle with Vite to static HTML');
    console.log('   5. Copy data files to output directory\n');
}
/**
 * Load dashboard spec from YAML or JSON file
 */
export async function loadSpec(path) {
    // Stub - in real implementation would use fs.readFile + YAML.parse
    throw new Error('loadSpec is a stub - not yet implemented');
}
/**
 * Validate dashboard spec
 */
export function validateSpec(spec) {
    // Stub - in real implementation would use JSON Schema validation
    return { valid: true };
}
