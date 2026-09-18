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
  composeBoard,
  resolveChartRef
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
 * Compose ephemeral board from chart IDs
 */
export async function composeCommand(options: ComposeOptions): Promise<void> {
  const projectRoot = process.cwd();
  
  const chartIds = options.charts.split(',').map(s => s.trim());
  
  console.log(`🎨 Composing board from ${chartIds.length} chart(s)...\n`);
  
  // Resolve chart references
  const chartRefs = [];
  for (const id of chartIds) {
    try {
      const ref = await resolveChartRef(projectRoot, id);
      console.log(`✓ Resolved ${id} → ${ref.displayKey}`);
      chartRefs.push(ref);
    } catch (error) {
      console.error(`✗ Failed to resolve ${id}:`, error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
  
  console.log();
  
  // Compose board
  const spec = await composeBoard(projectRoot, {
    charts: chartRefs,
    metric: options.metric,
    title: options.title,
    description: options.description
  });
  
  const outFile = options.outFile || 'composed-board.yaml';
  await writeFile(outFile, stringifyYAML(spec));
  
  console.log(`✅ Composed board saved to: ${outFile}`);
  console.log(`\nNext steps:`);
  console.log(`  Data Viz Factory validate ${outFile}`);
  console.log(`  Data Viz Factory preview ${outFile}`);
  console.log(`  Data Viz Factory build ${outFile}\n`);
}
