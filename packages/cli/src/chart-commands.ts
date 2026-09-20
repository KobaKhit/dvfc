/**
 * Chart discovery and management commands
 */

import { readFile, writeFile } from 'fs/promises';
import { resolve as resolvePath } from 'path';
import { stringify as stringifyYAML } from 'yaml';
import type { ChartHit, ChartResource } from '@dvfc/charts';
import {
  searchCharts,
  getChart,
  listCharts,
  resolveChartRef,
  composeDash,
  extractChartsFromDash,
} from '@dvfc/charts';

export interface SearchChartsOptions {
  all?: boolean;
  json?: boolean;
  board?: string;
}

/**
 * Search for charts across project
 */
export async function searchChartsCommand(
  query: string,
  options: SearchChartsOptions = {}
): Promise<void> {
  const projectRoot = process.cwd();
  
  console.log(`🔍 Searching for charts matching "${query}"...\n`);
  
  const hits = await searchCharts({
    projectRoot,
    query,
    boardPath: options.board,
    all: options.all || false
  });
  
  if (hits.length === 0) {
    console.log('No charts found.');
    return;
  }
  
  if (options.json) {
    console.log(JSON.stringify(hits, null, 2));
  } else {
    console.log(`Found ${hits.length} chart(s):\n`);
    
    for (const hit of hits) {
      console.log(`📊 ${hit.displayKey}`);
      console.log(`   Chart ID: ${hit.chartId}`);
      console.log(`   Type: ${hit.type}`);
      if (hit.title) console.log(`   Title: ${hit.title}`);
      console.log(`   Board: ${hit.boardPath}`);
      if (hit.score) console.log(`   Score: ${hit.score}`);
      console.log();
    }
    
    if (!options.all && hits.length === 10) {
      console.log('(Showing top 10 results. Use --all to see more)');
    }
  }
}

export interface GetChartOptions {
  format?: 'json' | 'yaml';
}

/**
 * Get chart metadata with board context
 */
export async function getChartCommand(
  board: string,
  chartId: string,
  options: GetChartOptions = {}
): Promise<void> {
  const boardPath = resolvePath(process.cwd(), board);
  
  console.log(`📊 Getting chart '${chartId}' from '${board}'...\n`);
  
  const resource = await getChart(boardPath, chartId);
  
  const format = options.format || 'json';
  
  if (format === 'json') {
    console.log(JSON.stringify(resource, null, 2));
  } else {
    // YAML format
    const output = {
      displayKey: resource.displayKey,
      boardPath: resource.boardPath,
      chart: resource.chart,
      context: resource.context
    };
    console.log(stringifyYAML(output));
  }
}

export interface ListChartsOptions {
  board?: string;
  json?: boolean;
}

/**
 * List all charts in project or board
 */
export async function listChartsCommand(options: ListChartsOptions = {}): Promise<void> {
  const projectRoot = process.cwd();
  
  const scope = options.board ? `board '${options.board}'` : 'project';
  console.log(`📋 Listing charts in ${scope}...\n`);
  
  const hits = await listCharts(projectRoot, options.board);
  
  if (hits.length === 0) {
    console.log('No charts found.');
    return;
  }
  
  if (options.json) {
    console.log(JSON.stringify(hits, null, 2));
  } else {
    console.log(`Found ${hits.length} chart(s):\n`);
    
    // Group by board
    const byBoard = new Map<string, ChartHit[]>();
    for (const hit of hits) {
      if (!byBoard.has(hit.boardPath)) {
        byBoard.set(hit.boardPath, []);
      }
      byBoard.get(hit.boardPath)!.push(hit);
    }
    
    for (const [boardPath, charts] of byBoard.entries()) {
      console.log(`📁 ${boardPath}`);
      for (const chart of charts) {
        console.log(`   📊 ${chart.displayKey} (${chart.type})`);
        if (chart.title) console.log(`      ${chart.title}`);
      }
      console.log();
    }
  }
}

export interface ComposeOptions {
  charts: string;
  metric?: string;
  title?: string;
  description?: string;
  outFile?: string;
}

/**
 * Compose dash from chart IDs (charts compose → dash IR)
 */
export async function composeCommand(options: ComposeOptions): Promise<void> {
  const projectRoot = process.cwd();
  const chartIds = options.charts.split(',').map((s) => s.trim());
  console.log(`🎨 Composing dash from ${chartIds.length} chart(s)...\n`);

  for (const id of chartIds) {
    try {
      const ref = await resolveChartRef(projectRoot, id);
      console.log(`✓ Resolved ${id} → ${ref.displayKey}`);
    } catch (error) {
      console.error(
        `✗ Failed to resolve ${id}:`,
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  }

  const outFile = options.outFile || 'composed.dash.yaml';
  const { outPath } = await composeDash(projectRoot, {
    chartIds,
    title: options.title,
    description: options.description,
    outFile,
  });
  console.log(`\n✅ Wrote ${outPath}`);
  console.log(`\nNext steps:`);
  console.log(`  dvfc validate ${outPath}`);
  console.log(`  dvfc preview ${outPath}`);
  console.log(`  dvfc build ${outPath}\n`);
}

export async function composeDashCommand(options: ComposeOptions): Promise<void> {
  const projectRoot = process.cwd();
  const chartIds = options.charts.split(',').map((s) => s.trim());
  console.log(`🎨 Composing dash from ${chartIds.length} chart(s)...\n`);
  const { outPath } = await composeDash(projectRoot, {
    chartIds,
    title: options.title,
    description: options.description,
    outFile: options.outFile || 'composed.dash.yaml',
  });
  console.log(`✅ Wrote ${outPath}`);
  console.log(`\nNext: dvfc validate ${outPath}\n`);
}

export async function extractChartsCommand(
  dashPath: string,
  options: { outDir?: string } = {}
): Promise<void> {
  const outDir = options.outDir || 'charts';
  console.log(`📤 Extracting inline charts from ${dashPath} → ${outDir}/\n`);
  const written = await extractChartsFromDash(dashPath, outDir);
  if (written.length === 0) {
    console.log('No inline charts to extract (refs only).');
    return;
  }
  for (const f of written) console.log(`✓ ${f}`);
  console.log(`\n✅ Extracted ${written.length} chart(s)\n`);
}
