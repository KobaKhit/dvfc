#!/usr/bin/env node

/**
 * coordboard CLI
 * Main entry point for command-line interface
 */

import { Command } from 'commander';
import { preview, build } from './commands.js';

const program = new Command();

program
  .name('coordboard')
  .description('CLI tool for building analytics dashboards with Mosaic + dbt')
  .version('0.1.0');

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
  .action(async (spec: string, options) => {
    try {
      await build(spec, {
        outDir: options.outDir,
        minify: options.minify
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new dashboard project')
  .argument('[name]', 'Project name', 'my-dashboard')
  .action((name: string) => {
    console.log(`🎯 Initializing new dashboard: ${name}`);
    console.log('\n⚠️  Init command is a stub. Real implementation will:');
    console.log('   1. Create project directory structure');
    console.log('   2. Generate sample dashboard spec');
    console.log('   3. Create example data files');
    console.log('   4. Initialize package.json\n');
  });

program.parse();
