/**
 * Chart discovery implementation
 */

import { readFile } from 'fs/promises';
import { parse as parseYAML } from 'yaml';
import { glob } from 'glob';
import { relative, basename, dirname, extname } from 'path';
import type { DashboardSpec } from '@dvfc/core';
import type { ChartHit, ChartRef, ChartResource, SearchOptions, ComposeOptions } from './types.js';

/**
 * Generate display key from board path and chart id
 */
export function makeDisplayKey(boardPath: string, chartId: string): string {
  // Extract board name from path (e.g., "examples/sales-board/board.yaml" → "sales-board")
  const dir = dirname(boardPath);
  let boardName = basename(dir);
  
  // Handle edge case where dirname is "." (current directory)
  if (boardName === '.') {
    // Use the board filename without extension as the board name
    const boardFilename = basename(boardPath, extname(boardPath));
    boardName = boardFilename === 'board' || boardFilename === 'dashboard' 
      ? 'default' 
      : boardFilename;
  }
  
  return `${boardName}__${chartId}`;
}

/**
 * Parse display key into components
 */
export function parseDisplayKey(displayKey: string): { boardName: string; chartId: string } | null {
  const parts = displayKey.split('__');
  if (parts.length !== 2) return null;
  return { boardName: parts[0], chartId: parts[1] };
}

/**
 * Load dashboard spec from file
 */
async function loadSpec(filePath: string): Promise<DashboardSpec> {
  const content = await readFile(filePath, 'utf-8');
  
  // Try YAML first, fall back to JSON
  try {
    return parseYAML(content) as DashboardSpec;
  } catch {
    return JSON.parse(content) as DashboardSpec;
  }
}

/**
 * Search for charts across project
 */
export async function searchCharts(options: SearchOptions): Promise<ChartHit[]> {
  const { projectRoot, query, boardPath, all = false, caseSensitive = false } = options;
  
  // Find all board files
  const pattern = boardPath 
    ? boardPath 
    : '**/{board,dashboard,*.board,*.dashboard}.{yaml,yml,json}';
  
  const files = await glob(pattern, {
    cwd: projectRoot,
    absolute: false,
    ignore: ['node_modules/**', 'dist/**', '.git/**']
  });
  
  const hits: ChartHit[] = [];
  const searchQuery = caseSensitive ? query : query.toLowerCase();
  
  for (const file of files) {
    try {
      const spec = await loadSpec(`${projectRoot}/${file}`);
      
      if (!spec.charts) continue;
      
      for (const chart of spec.charts) {
        // Calculate match score
        let score = 0;
        const chartTitle = chart.title || '';
        const chartId = chart.id;
        const chartType = chart.type;
        
        // Fields in encoding
        const fields = new Set<string>();
        if (chart.encoding?.x?.field) fields.add(chart.encoding.x.field);
        if (chart.encoding?.y?.field) fields.add(chart.encoding.y.field);
        
        const searchText = caseSensitive 
          ? `${chartId} ${chartTitle} ${chartType} ${Array.from(fields).join(' ')}`
          : `${chartId} ${chartTitle} ${chartType} ${Array.from(fields).join(' ')}`.toLowerCase();
        
        if (searchText.includes(searchQuery)) {
          // Exact ID match = highest score
          if (chartId === query) score = 100;
          // Exact title match
          else if (chartTitle.toLowerCase() === searchQuery) score = 90;
          // ID starts with query
          else if (chartId.startsWith(query)) score = 80;
          // Title starts with query
          else if (chartTitle.toLowerCase().startsWith(searchQuery)) score = 70;
          // Type match
          else if (chartType === searchQuery) score = 60;
          // Field match
          else if (Array.from(fields).some(f => f.toLowerCase().includes(searchQuery))) score = 50;
          // Contains in ID
          else if (chartId.includes(searchQuery)) score = 40;
          // Contains in title
          else if (chartTitle.toLowerCase().includes(searchQuery)) score = 30;
          // Generic match
          else score = 20;
          
          hits.push({
            boardPath: file,
            chartId: chart.id,
            type: chart.type,
            title: chart.title,
            score,
            displayKey: makeDisplayKey(file, chart.id)
          });
        }
      }
    } catch (error) {
      // Skip files that fail to parse
      console.warn(`Failed to parse ${file}:`, error);
    }
  }
  
  // Sort by score descending
  hits.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  // Return all or limit to 10
  return all ? hits : hits.slice(0, 10);
}

/**
 * Get chart with board context
 */
export async function getChart(boardPath: string, chartId: string): Promise<ChartResource> {
  const spec = await loadSpec(boardPath);
  
  const chart = spec.charts.find(c => c.id === chartId);
  if (!chart) {
    throw new Error(`Chart '${chartId}' not found in board '${boardPath}'`);
  }
  
  return {
    chart,
    boardPath,
    displayKey: makeDisplayKey(boardPath, chartId),
    context: {
      dataSources: spec.data,
      theme: spec.theme,
      layout: spec.layout
    }
  };
}

/**
 * List all charts in project or specific board
 */
export async function listCharts(projectRoot: string, boardPath?: string): Promise<ChartHit[]> {
  return searchCharts({
    projectRoot,
    query: '',
    boardPath,
    all: true
  });
}

/**
 * Compose ephemeral board from chart references
 */
export async function composeBoard(
  projectRoot: string,
  options: ComposeOptions
): Promise<DashboardSpec> {
  const { charts: chartRefs, metric, title, description } = options;
  
  if (chartRefs.length === 0) {
    throw new Error('No charts specified for composition');
  }
  
  // Resolve all chart references
  const resolvedCharts: ChartResource[] = [];
  const allDataSources = new Map<string, any>();
  const seenChartIds = new Set<string>();
  
  for (const ref of chartRefs) {
    const fullPath = `${projectRoot}/${ref.boardPath}`;
    const resource = await getChart(fullPath, ref.chartId);
    
    // Rename chart if ID conflicts
    const originalId = resource.chart.id;
    let chartId = originalId;
    let suffix = 1;
    while (seenChartIds.has(chartId)) {
      chartId = `${originalId}_${suffix}`;
      suffix++;
    }
    
    if (chartId !== originalId) {
      resource.chart.id = chartId;
      // Update any interactions that reference this chart
      if (resource.chart.interaction?.selection) {
        resource.chart.interaction.selection = chartId + '_brush';
      }
    }
    
    seenChartIds.add(chartId);
    resolvedCharts.push(resource);
    
    // Collect unique data sources
    for (const ds of resource.context.dataSources) {
      if (!allDataSources.has(ds.id)) {
        allDataSources.set(ds.id, ds);
      }
    }
  }
  
  // Build composed spec
  const composedSpec: DashboardSpec = {
    meta: {
      title: title || 'Composed Dashboard',
      description: description || `Composed from ${chartRefs.length} charts`,
      version: '0.2.0'
    },
    data: Array.from(allDataSources.values()),
    charts: resolvedCharts.map(r => r.chart),
    layout: resolvedCharts[0]?.context.layout,
    theme: resolvedCharts[0]?.context.theme
  };
  
  // If metric specified, add to description (stub for now)
  if (metric) {
    composedSpec.meta.description += ` (metric: ${metric})`;
  }
  
  return composedSpec;
}

/**
 * Resolve chart reference from various forms
 * Supports: "chartId", "boardName__chartId", or explicit { boardPath, chartId }
 */
export async function resolveChartRef(
  projectRoot: string,
  refStr: string
): Promise<ChartRef> {
  // Try parsing as display key first
  const parsed = parseDisplayKey(refStr);
  if (parsed) {
    // Search for board with matching name
    const hits = await searchCharts({
      projectRoot,
      query: parsed.chartId,
      all: true
    });
    
    const match = hits.find(h => {
      const dir = dirname(h.boardPath);
      const boardName = basename(dir);
      return boardName === parsed.boardName && h.chartId === parsed.chartId;
    });
    
    if (match) {
      return {
        boardPath: match.boardPath,
        chartId: match.chartId,
        displayKey: match.displayKey
      };
    }
  }
  
  // Otherwise search by chart ID
  const hits = await searchCharts({
    projectRoot,
    query: refStr,
    all: true
  });
  
  // Filter to exact ID matches
  const exactMatches = hits.filter(h => h.chartId === refStr);
  
  if (exactMatches.length === 0) {
    throw new Error(`Chart '${refStr}' not found`);
  }
  
  if (exactMatches.length > 1) {
    const candidates = exactMatches.map(h => h.displayKey).join(', ');
    throw new Error(
      `Ambiguous chart reference '${refStr}'. Multiple matches found: ${candidates}. ` +
      `Use display key format (boardName__chartId) to disambiguate.`
    );
  }
  
  const hit = exactMatches[0];
  return {
    boardPath: hit.boardPath,
    chartId: hit.chartId,
    displayKey: hit.displayKey
  };
}
