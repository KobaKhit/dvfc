#!/usr/bin/env node

/**
 * Data Viz Factory CLI (dvfc)
 * Main entry point for command-line interface
 */

import { Command } from 'commander';
import { createRequire } from 'node:module';
import { preview, build, validate, init, exportPdf, printChartTypes, normalizeCommand } from './commands.js';
import {
  searchChartsCommand,
  getChartCommand,
  listChartsCommand,
  composeCommand,
  extractChartsCommand,
} from './chart-commands.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version?: string };

async function run(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

const program = new Command();

program
  .name('dvfc')
  .description('Data Viz Factory - Cross-filtered dashes for humans and agents')
  .version(pkg.version || '0.1.0');

program
  .command('validate')
  .description('Validate dashboard spec')
  .argument('<spec>', 'Path to chart or dash spec (YAML or JSON)')
  .action(async (spec: string) => {
    await run(async () => {
      const isValid = await validate(spec);
      process.exit(isValid ? 0 : 1);
    });
  });

program
  .command('normalize')
  .description('Normalize chart/dash IR to Mosaic DashboardSpec YAML')
  .argument('<spec>', 'Path to chart or dash spec')
  .option('-o, --out-file <file>', 'Write normalized YAML to file (default: stdout)')
  .action(async (spec: string, options) => {
    await run(async () => {
      await normalizeCommand(spec, { outFile: options.outFile });
    });
  });

program
  .command('preview')
  .description('Start development server with live reload')
  .argument('<spec>', 'Path to chart or dash spec (YAML or JSON)')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-o, --open', 'Open browser automatically', false)
  .action(async (spec: string, options) => {
    await run(async () => {
      await preview(spec, {
        port: parseInt(options.port),
        open: options.open,
      });
    });
  });

program
  .command('build')
  .description('Build static HTML dashboard')
  .argument('<spec>', 'Path to chart or dash spec (YAML or JSON)')
  .option('-o, --out-dir <dir>', 'Output directory', 'dist')
  .option('-m, --minify', 'Minify output', false)
  .option('--chart <id>', 'Build single chart with dash context')
  .option('--base <path>', 'Base public path (e.g. /dvfc/ for GitHub Pages)')
  .option(
    '-f, --format <format>',
    'Output format: html | html-dc | html-dc-static | html-dc-wasm | svg | png | html-static',
    'html'
  )
  .action(async (spec: string, options) => {
    await run(async () => {
      await build(spec, {
        outDir: options.outDir,
        minify: options.minify,
        chartId: options.chart,
        base: options.base,
        format: options.format,
      });
    });
  });

program
  .command('init')
  .description('Initialize a new dashboard project')
  .option('--from-dbt', 'Scaffold from dbt manifest.json')
  .option('--manifest-path <path>', 'Path to dbt manifest.json', 'dbt-stub/manifest.json')
  .option('-o, --out-file <file>', 'Output file', 'dashboard.dash.yaml')
  .action(async (options) => {
    await run(async () => {
      await init({
        fromDbt: options.fromDbt,
        manifestPath: options.manifestPath,
        outFile: options.outFile,
      });
    });
  });

const chartsCmd = program.command('charts').description('Chart discovery and management');

chartsCmd
  .command('types')
  .description('List registered chart types (built-ins and plugins)')
  .action(async () => {
    await run(async () => {
      await printChartTypes();
    });
  });

chartsCmd
  .command('search')
  .description('Search for charts across project')
  .argument('<query>', 'Search query (matches chart id, title, type, fields)')
  .option('--all', 'Return all matches (default: top 10)')
  .option('--dash <path>', 'Filter by dash path')
  .option('--json', 'Output JSON format')
  .action(async (query: string, options) => {
    await run(async () => {
      await searchChartsCommand(query, {
        all: options.all,
        json: options.json,
        dash: options.dash,
      });
    });
  });

chartsCmd
  .command('get')
  .description('Get chart metadata with dash context')
  .argument('<dash>', 'Dash path')
  .argument('<chart-id>', 'Chart ID')
  .option('--format <format>', 'Output format (json or yaml)', 'json')
  .action(async (dash: string, chartId: string, options) => {
    await run(async () => {
      await getChartCommand(dash, chartId, options);
    });
  });

chartsCmd
  .command('list')
  .description('List all charts in project or dash')
  .option('--dash <path>', 'Filter by dash path')
  .option('--json', 'Output JSON format')
  .action(async (options) => {
    await run(async () => {
      await listChartsCommand({
        json: options.json,
        dash: options.dash,
      });
    });
  });

async function runCompose(options: {
  charts?: string;
  title?: string;
  description?: string;
  outFile?: string;
}): Promise<void> {
  if (!options.charts) {
    console.error('Error: --charts option is required');
    process.exit(1);
  }
  await composeCommand({
    charts: options.charts,
    title: options.title,
    description: options.description,
    outFile: options.outFile,
  });
}

chartsCmd
  .command('compose')
  .description('Compose a *.dash.yaml from chart IDs (alias of dash compose)')
  .option('--charts <ids>', 'Comma-separated chart IDs or display keys (required)')
  .option('--title <title>', 'Dash title')
  .option('--description <desc>', 'Description')
  .option('-o, --out-file <file>', 'Output file', 'composed.dash.yaml')
  .action(async (options) => {
    await run(() => runCompose(options));
  });

chartsCmd
  .command('extract')
  .description('Extract inline charts from a dash into *.chart.yaml files')
  .argument('<dash>', 'Path to *.dash.yaml')
  .option('-o, --out-dir <dir>', 'Output directory', 'charts')
  .action(async (dash: string, options) => {
    await run(async () => {
      await extractChartsCommand(dash, { outDir: options.outDir });
    });
  });

const dashCmd = program.command('dash').description('Dash composition commands');

dashCmd
  .command('compose')
  .description('Compose a *.dash.yaml from chart ids')
  .option('--charts <ids>', 'Comma-separated chart IDs (required)')
  .option('--title <title>', 'Dash title')
  .option('--description <desc>', 'Description')
  .option('-o, --out-file <file>', 'Output file', 'composed.dash.yaml')
  .action(async (options) => {
    await run(() => runCompose(options));
  });

program
  .command('export-pdf')
  .description('Export dashboard to PDF (requires playwright or manual print)')
  .argument('<spec>', 'Path to chart or dash spec (YAML or JSON)')
  .option('-o, --out-file <file>', 'Output PDF file', 'dashboard.pdf')
  .option('--no-browser', 'Skip automated PDF generation, print instructions only')
  .action(async (spec: string, options) => {
    await run(async () => {
      await exportPdf(spec, {
        outFile: options.outFile,
        useBrowser: options.browser,
      });
    });
  });

program.parse();
