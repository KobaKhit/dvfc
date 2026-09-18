#!/usr/bin/env node
/**
 * Data Viz Factory CLI (dvfc)
 * Main entry point for command-line interface
 */
import { Command } from 'commander';
import { preview, build, validate, init, exportPdf } from './commands.js';
import { searchChartsCommand, getChartCommand, listChartsCommand, composeCommand } from './chart-commands.js';
const program = new Command();
program
    .name('dvfc')
    .description('Data Viz Factory - Cross-filtered boards for humans and agents')
    .version('0.4.0');
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
    .option('--chart <id>', 'Build single chart with board context')
    .action(async (spec, options) => {
    try {
        await build(spec, {
            outDir: options.outDir,
            minify: options.minify,
            chartId: options.chart
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
// Charts discovery command group
const chartsCmd = program
    .command('charts')
    .description('Chart discovery and management');
chartsCmd
    .command('search')
    .description('Search for charts across project')
    .argument('<query>', 'Search query (matches chart id, title, type, fields)')
    .option('--all', 'Return all matches (default: top 10)')
    .option('--board <path>', 'Filter by board path')
    .option('--json', 'Output JSON format')
    .action(async (query, options) => {
    try {
        await searchChartsCommand(query, options);
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
chartsCmd
    .command('get')
    .description('Get chart metadata with board context')
    .argument('<board>', 'Board path')
    .argument('<chart-id>', 'Chart ID')
    .option('--format <format>', 'Output format (json or yaml)', 'json')
    .action(async (board, chartId, options) => {
    try {
        await getChartCommand(board, chartId, options);
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
chartsCmd
    .command('list')
    .description('List all charts in project or board')
    .option('--board <path>', 'Filter by board path')
    .option('--json', 'Output JSON format')
    .action(async (options) => {
    try {
        await listChartsCommand(options);
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
chartsCmd
    .command('compose')
    .description('Compose ephemeral board from chart IDs')
    .option('--charts <ids>', 'Comma-separated chart IDs or display keys (required)')
    .option('--metric <name>', 'Optional metric name')
    .option('--title <title>', 'Board title')
    .option('--description <desc>', 'Board description')
    .option('-o, --out-file <file>', 'Output file', 'composed-board.yaml')
    .action(async (options) => {
    if (!options.charts) {
        console.error('Error: --charts option is required');
        process.exit(1);
    }
    try {
        await composeCommand(options);
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
program
    .command('export-pdf')
    .description('Export dashboard to PDF (requires playwright or manual print)')
    .argument('<spec>', 'Path to dashboard spec (YAML or JSON)')
    .option('-o, --out-file <file>', 'Output PDF file', 'dashboard.pdf')
    .option('--no-browser', 'Skip automated PDF generation, print instructions only')
    .action(async (spec, options) => {
    try {
        await exportPdf(spec, {
            outFile: options.outFile,
            useBrowser: options.browser
        });
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
});
program.parse();
