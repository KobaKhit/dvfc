
import { resolve as resolvePath } from 'path';
import { stringify as stringifyYAML } from 'yaml';
import type { ChartHit, } from '@dvfc/charts';
import {
  searchCharts,
  getChart,
  listCharts,
  composeDash,
  extractChartsFromDash,
} from '@dvfc/charts';

export interface SearchChartsOptions {
  all?: boolean;
  json?: boolean;
  /** Filter by dash path */
  dash?: string;
}

/**
 * Search for charts across project
 */
export async function searchChartsCommand(
  query: string,
  options: SearchChartsOptions = {}
): Promise<void> {
  const projectRoot = process.cwd();
  
  console.log(`Searching for charts matching "${query}"...\n`);
  
  const hits = await searchCharts({
    projectRoot,
    query,
    dashPath: options.dash,
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
      console.log(`   Dash: ${hit.dashPath}`);
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
 * Get chart metadata with dash context
 */
export async function getChartCommand(
  dash: string,
  chartId: string,
  options: GetChartOptions = {}
): Promise<void> {
  const dashPath = resolvePath(process.cwd(), dash);
  
  console.log(`📊 Getting chart '${chartId}' from '${dash}'...\n`);
  
  const resource = await getChart(dashPath, chartId);
  
  const format = options.format || 'json';
  
  if (format === 'json') {
    console.log(JSON.stringify(resource, null, 2));
  } else {
    const output = {
      displayKey: resource.displayKey,
      dashPath: resource.dashPath,
      chart: resource.chart,
      context: resource.context
    };
    console.log(stringifyYAML(output));
  }
}

export interface ListChartsOptions {
  dash?: string;
  json?: boolean;
}

/**
 * List all charts in project or dash
 */
export async function listChartsCommand(options: ListChartsOptions = {}): Promise<void> {
  const projectRoot = process.cwd();
  const dashPath = options.dash;
  
  const scope = dashPath ? `dash '${dashPath}'` : 'project';
  console.log(`Listing charts in ${scope}...\n`);
  
  const hits = await listCharts(projectRoot, dashPath);
  
  if (hits.length === 0) {
    console.log('No charts found.');
    return;
  }
  
  if (options.json) {
    console.log(JSON.stringify(hits, null, 2));
  } else {
    console.log(`Found ${hits.length} chart(s):\n`);
    
    const byDash = new Map<string, ChartHit[]>();
    for (const hit of hits) {
      const key = hit.dashPath;
      if (!byDash.has(key)) {
        byDash.set(key, []);
      }
      byDash.get(key)!.push(hit);
    }
    
    for (const [dashPath, charts] of byDash.entries()) {
      console.log(`📁 ${dashPath}`);
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
  title?: string;
  description?: string;
  outFile?: string;
}

/**
 * Compose dash from chart IDs (charts compose → dash IR).
 * Resolution errors come from composeDash (single discovery pass).
 */
export async function composeCommand(options: ComposeOptions): Promise<void> {
  const projectRoot = process.cwd();
  const chartIds = options.charts.split(',').map((s) => s.trim()).filter(Boolean);
  console.log(`🎨 Composing dash from ${chartIds.length} chart(s)...\n`);

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
