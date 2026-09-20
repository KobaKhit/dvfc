#!/usr/bin/env node

/**
 * Data Viz Factory CLI (dvfc)
 * Main entry point for command-line interface
 */

import { Command } from 'commander';
import { preview, build, validate, init, exportPdf, printChartTypes, normalizeCommand } from './commands.js';
import { searchChartsCommand, getChartCommand, listChartsCommand, composeCommand, composeDashCommand, extractChartsCommand } from './chart-commands.js';

const program = new Command();

program
  .name('dvfc')
  .description('Data Viz Factory - Cross-filtered boards for humans and agents')
  .version('0.4.0');

program
  .command('validate')
  .description('Validate dashboard spec')
  .argument('<spec>', 'Path to dashboard spec (YAML or JSON)')
  .action(async (spec: string) => {
    try {
      const isValid = await validate(spec);
      process.exit(isValid ? 0 : 1);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('normalize')
  .description('Normalize chart/dash IR to Mosaic DashboardSpec YAML')
  .argument('<spec>', 'Path to chart, dash, or board spec')
  .option('-o, --out-file <file>', 'Write normalized YAML to file (default: stdout)')
  .action(async (spec: string, options) => {
    try {
      await normalizeCommand(spec, { outFile: options.outFile });
    } catch (error) {
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
  .action(async (spec: string, options) => {
    try {
      await preview(spec, {
        port: parseInt(options.port),
        open: options.open
      });
    } catch (error) {
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
  .option('--base <path>', 'Base public path (e.g. /dvfc/ for GitHub Pages)')
  .option('-f, --format <format>', 'Output format: html | svg | png | html-static', 'html')
  .action(async (spec: string, options) => {
    try {
      await build(spec, {
        outDir: options.outDir,
        minify: options.minify,
        chartId: options.chart,
        base: options.base,
        format: options.format,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new dashboard project')
  .option('--from-dbt', 'Scaffold from dbt manifest.json')
  .option('--manifest-path <path>', 'Path to dbt manifest.json', 'dbt-stub/manifest.json')
  .option('-o, --out-file <file>', 'Output file', 'dashboard.dash.yaml')
  .action(async (options) => {
    try {
      await init({
        fromDbt: options.fromDbt,
        manifestPath: options.manifestPath,
        outFile: options.outFile
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Charts discovery command group
const chartsCmd = program
  .command('charts')
  .description('Chart discovery and management');

chartsCmd
  .command('types')
  .description('List registered chart types (built-ins and plugins)')
  .action(async () => {
    try {
      await printChartTypes();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

chartsCmd
  .command('search')
  .description('Search for charts across project')
  .argument('<query>', 'Search query (matches chart id, title, type, fields)')
  .option('--all', 'Return all matches (default: top 10)')
  .option('--board <path>', 'Filter by board path')
  .option('--json', 'Output JSON format')
  .action(async (query: string, options) => {
    try {
      await searchChartsCommand(query, options);
    } catch (error) {
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
  .action(async (board: string, chartId: string, options) => {
    try {
      await getChartCommand(board, chartId, options);
    } catch (error) {
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
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

chartsCmd
  .command('compose')
  .description('Compose a *.dash.yaml from chart IDs (alias of dash compose)')
  .option('--charts <ids>', 'Comma-separated chart IDs or display keys (required)')
  .option('--metric <name>', 'Optional metric name')
  .option('--title <title>', 'Dash title')
  .option('--description <desc>', 'Description')
  .option('-o, --out-file <file>', 'Output file', 'composed.dash.yaml')
  .action(async (options) => {
    if (!options.charts) {
      console.error('Error: --charts option is required');
      process.exit(1);
    }
    try {
      await composeCommand(options);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

chartsCmd
  .command('extract')
  .description('Extract inline charts from a dash into *.chart.yaml files')
  .argument('<dash>', 'Path to *.dash.yaml')
  .option('-o, --out-dir <dir>', 'Output directory', 'charts')
  .action(async (dash: string, options) => {
    try {
      await extractChartsCommand(dash, { outDir: options.outDir });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

const dashCmd = program
  .command('dash')
  .description('Dash composition commands');

dashCmd
  .command('compose')
  .description('Compose a *.dash.yaml from chart ids')
  .option('--charts <ids>', 'Comma-separated chart IDs (required)')
  .option('--title <title>', 'Dash title')
  .option('--description <desc>', 'Description')
  .option('-o, --out-file <file>', 'Output file', 'composed.dash.yaml')
  .action(async (options) => {
    if (!options.charts) {
      console.error('Error: --charts is required');
      process.exit(1);
    }
    try {
      await composeDashCommand(options);
    } catch (error) {
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
  .action(async (spec: string, options) => {
    try {
      await exportPdf(spec, {
        outFile: options.outFile,
        useBrowser: options.browser
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
