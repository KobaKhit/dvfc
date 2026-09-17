#!/usr/bin/env node
/**
 * coordboard CLI
 * Main entry point for command-line interface
 */
import { Command } from 'commander';
import { preview, build, validate, init } from './commands.js';
const program = new Command();
program
    .name('coordboard')
    .description('CLI tool for building analytics dashboards with Mosaic + dbt')
    .version('0.1.0');
program
    .command('validate')
    .description('Validate dashboard spec')
    .argument('<spec>', 'Path to dashboard spec (YAML or JSON)')
    .action(async (spec) => {
    try {
        const isValid = await validate(spec);
        process.exit(isValid ? 0 : 1);
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
program
    .command('preview')
    .description('Start development server with live reload')
    .argument('<spec>', 'Path to dashboard spec (YAML or JSON)')
    .option('-p, --port <port>', 'Port number', '3000')
    .option('-o, --open', 'Open browser automatically', false)
    .action(async (spec, options) => {
    try {
        await preview(spec, {
            port: parseInt(options.port),
            open: options.open
        });
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
program
    .command('build')
    .description('Build static HTML dashboard')
    .argument('<spec>', 'Path to dashboard spec (YAML or JSON)')
    .option('-o, --out-dir <dir>', 'Output directory', 'dist')
    .option('-m, --minify', 'Minify output', false)
    .action(async (spec, options) => {
    try {
        await build(spec, {
            outDir: options.outDir,
            minify: options.minify
        });
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
program
    .command('init')
    .description('Initialize a new dashboard project')
    .option('--from-dbt', 'Scaffold from dbt manifest.json')
    .option('--manifest-path <path>', 'Path to dbt manifest.json', 'dbt-stub/manifest.json')
    .option('-o, --out-file <file>', 'Output file', 'board.yaml')
    .action(async (options) => {
    try {
        await init({
            fromDbt: options.fromDbt,
            manifestPath: options.manifestPath,
            outFile: options.outFile
        });
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
program.parse();
