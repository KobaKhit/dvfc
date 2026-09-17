#!/usr/bin/env node

/**
 * MCP Server for coordboard
 * Provides tools for building coordinated analytics dashboards with AI
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile, writeFile } from 'fs/promises';
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import type { DashboardSpec, ChartSpec } from '@coordboard/core';
import { validateWithReport, validateSemantics, validate, build } from '@coordboard/cli';
import { createDbtResolver, type DbtManifest } from '@coordboard/dbt-adapter';
import { searchCharts, getChart, listCharts, composeBoard, resolveChartRef } from '@coordboard/charts';
import { dirname, join } from 'path';

// Create MCP server
const server = new Server(
  {
    name: 'coordboard-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'validate_dashboard_spec',
        description: 'Validate a dashboard specification file (YAML or JSON). Checks JSON Schema, semantic rules, and dbt model references. Returns detailed validation report with path-aware errors.',
        inputSchema: {
          type: 'object',
          properties: {
            specPath: {
              type: 'string',
              description: 'Path to dashboard spec file (board.yaml or board.json)'
            }
          },
          required: ['specPath']
        }
      },
      {
        name: 'build_dashboard',
        description: 'Build a static HTML dashboard from a spec file. Generates Mosaic code, bundles with Vite, and outputs self-contained HTML with crossfiltering. Returns path to built HTML.',
        inputSchema: {
          type: 'object',
          properties: {
            specPath: {
              type: 'string',
              description: 'Path to dashboard spec file'
            },
            outDir: {
              type: 'string',
              description: 'Output directory for built HTML (default: dist)'
            },
            minify: {
              type: 'boolean',
              description: 'Minify output (default: false)'
            }
          },
          required: ['specPath']
        }
      },
      {
        name: 'list_models',
        description: 'List dbt models from a manifest.json file. Returns model names, schemas, and relation paths.',
        inputSchema: {
          type: 'object',
          properties: {
            manifestPath: {
              type: 'string',
              description: 'Path to dbt manifest.json'
            }
          },
          required: ['manifestPath']
        }
      },
      {
        name: 'create_chart',
        description: 'Add a new chart to a dashboard spec. Supports coordinated filtering via filterBy or brush interactions.',
        inputSchema: {
          type: 'object',
          properties: {
            specPath: {
              type: 'string',
              description: 'Path to dashboard spec file'
            },
            chart: {
              type: 'object',
              description: 'Chart specification',
              properties: {
                id: { type: 'string' },
                type: {
                  type: 'string',
                  enum: ['line', 'bar', 'area', 'scatter', 'heatmap', 'number', 'table', 'pie', 'donut']
                },
                dataSource: { type: 'string' },
                title: { type: 'string' },
                encoding: { type: 'object' },
                interaction: { type: 'object' },
                width: { type: 'number' },
                height: { type: 'number' }
              },
              required: ['id', 'type', 'dataSource', 'encoding']
            }
          },
          required: ['specPath', 'chart']
        }
      },
      {
        name: 'update_chart',
        description: 'Update an existing chart in a dashboard spec. Can modify encoding, interactions, or styling.',
        inputSchema: {
          type: 'object',
          properties: {
            specPath: {
              type: 'string',
              description: 'Path to dashboard spec file'
            },
            chartId: {
              type: 'string',
              description: 'ID of chart to update'
            },
            updates: {
              type: 'object',
              description: 'Partial chart spec with fields to update'
            }
          },
          required: ['specPath', 'chartId', 'updates']
        }
      },
      {
        name: 'search_charts',
        description: 'Search for charts in a dashboard by ID, type, or data source. Returns matching chart specs.',
        inputSchema: {
          type: 'object',
          properties: {
            specPath: {
              type: 'string',
              description: 'Path to dashboard spec file'
            },
            query: {
              type: 'object',
              description: 'Search criteria',
              properties: {
                id: { type: 'string' },
                type: { type: 'string' },
                dataSource: { type: 'string' }
              }
            }
          },
          required: ['specPath']
        }
      },
      {
        name: 'explain_coordination',
        description: 'Explain how charts in a dashboard are coordinated via selections and filters. Shows which charts are linked and how brushing affects them.',
        inputSchema: {
          type: 'object',
          properties: {
            specPath: {
              type: 'string',
              description: 'Path to dashboard spec file'
            }
          },
          required: ['specPath']
        }
      },
      {
        name: 'apply_filter_plan',
        description: 'Apply a filtering coordination plan to a dashboard. Links charts via selections and filterBy interactions. (Stub: defines pattern, actual wiring needs chart updates)',
        inputSchema: {
          type: 'object',
          properties: {
            specPath: {
              type: 'string',
              description: 'Path to dashboard spec file'
            },
            plan: {
              type: 'object',
              description: 'Filter coordination plan',
              properties: {
                brushChart: { type: 'string', description: 'Chart ID that should have brush' },
                selectionName: { type: 'string', description: 'Name for the selection' },
                filteredCharts: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Chart IDs that should filter by this selection'
                }
              },
              required: ['brushChart', 'selectionName', 'filteredCharts']
            }
          },
          required: ['specPath', 'plan']
        }
      },
      {
        name: 'search_charts',
        description: 'Search for charts across the project. Returns chart hits with board path, chart ID, type, title, and display key. Supports --all for all matches or top 10 by default.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (matches chart ID, title, type, field names)'
            },
            projectRoot: {
              type: 'string',
              description: 'Project root directory (default: current directory)'
            },
            boardPath: {
              type: 'string',
              description: 'Filter by specific board path'
            },
            all: {
              type: 'boolean',
              description: 'Return all matches (default: false, returns top 10)'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_chart',
        description: 'Get chart metadata with full board context. Returns chart spec, board path, display key, and context (data sources, theme, layout).',
        inputSchema: {
          type: 'object',
          properties: {
            boardPath: {
              type: 'string',
              description: 'Path to board file'
            },
            chartId: {
              type: 'string',
              description: 'Chart ID within the board'
            }
          },
          required: ['boardPath', 'chartId']
        }
      },
      {
        name: 'list_charts',
        description: 'List all charts in project or specific board. Returns all charts with display keys and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: {
              type: 'string',
              description: 'Project root directory (default: current directory)'
            },
            boardPath: {
              type: 'string',
              description: 'Filter by specific board path'
            }
          }
        }
      },
      {
        name: 'compose_board',
        description: 'Compose an ephemeral board from chart IDs. Supports display keys (boardName__chartId) or plain chart IDs. Resolves ambiguous IDs or returns error with candidates. Returns composed board spec.',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: {
              type: 'string',
              description: 'Project root directory (default: current directory)'
            },
            chartIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Chart IDs or display keys (e.g., ["daily_revenue", "sales-board__top_products"])'
            },
            metric: {
              type: 'string',
              description: 'Optional metric name (stub for now)'
            },
            title: {
              type: 'string',
              description: 'Title for composed board'
            },
            description: {
              type: 'string',
              description: 'Description for composed board'
            }
          },
          required: ['chartIds']
        }
      },
      {
        name: 'render_chart',
        description: 'Render/build a single chart with board context. Builds HTML with only the specified chart while preserving board queries, variables, and styles.',
        inputSchema: {
          type: 'object',
          properties: {
            boardPath: {
              type: 'string',
              description: 'Path to board file'
            },
            chartId: {
              type: 'string',
              description: 'Chart ID to render'
            },
            outDir: {
              type: 'string',
              description: 'Output directory (default: dist)'
            }
          },
          required: ['boardPath', 'chartId']
        }
      }
    ]
  };
});

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'validate_dashboard_spec': {
        const { specPath } = args as { specPath: string };
        const isValid = await validate(specPath);
        
        return {
          content: [{
            type: 'text' as const,
            text: isValid ? 
              '✅ Dashboard spec is valid' : 
              '❌ Dashboard spec validation failed (see errors above)'
          }]
        };
      }

      case 'build_dashboard': {
        const { specPath, outDir, minify } = args as {
          specPath: string;
          outDir?: string;
          minify?: boolean;
        };
        
        await build(specPath, { outDir, minify });
        
        return {
          content: [{
            type: 'text' as const,
            text: `✅ Dashboard built successfully\nOutput: ${outDir || 'dist'}/index.html`
          }]
        };
      }

      case 'list_models': {
        const { manifestPath } = args as { manifestPath: string };
        const manifestData = JSON.parse(await readFile(manifestPath, 'utf-8')) as DbtManifest;
        
        const models = Object.values(manifestData.nodes)
          .filter(node => node.resource_type === 'model')
          .map(node => ({
            name: node.name,
            schema: node.schema,
            database: node.database,
            path: node.path,
            relationName: node.relation_name
          }));
        
        return {
          content: [{
            type: 'text' as const,
            text: `Found ${models.length} models:\n\n${JSON.stringify(models, null, 2)}`
          }]
        };
      }

      case 'create_chart': {
        const { specPath, chart } = args as {
          specPath: string;
          chart: ChartSpec;
        };
        
        // Validate chart spec
        if (!chart.id || !chart.type || !chart.dataSource || !chart.encoding) {
          throw new Error('Chart must have id, type, dataSource, and encoding');
        }
        
        const content = await readFile(specPath, 'utf-8');
        const spec = parseYAML(content) as DashboardSpec;
        
        // Check for duplicate ID
        if (spec.charts.some(c => c.id === chart.id)) {
          throw new Error(`Chart with id '${chart.id}' already exists`);
        }
        
        // Validate dataSource exists
        const dataSourceIds = new Set(spec.data.map(d => d.id));
        if (!dataSourceIds.has(chart.dataSource)) {
          throw new Error(`Data source '${chart.dataSource}' not found`);
        }
        
        // Validate encoding based on chart type
        if (['line', 'bar', 'scatter', 'area'].includes(chart.type)) {
          if (!chart.encoding.x || !chart.encoding.y) {
            throw new Error(`Chart type '${chart.type}' requires both x and y encoding`);
          }
        } else if (['pie', 'donut'].includes(chart.type)) {
          if (!chart.encoding.x || !chart.encoding.y) {
            throw new Error(`Chart type '${chart.type}' requires x (category) and y (value) encoding`);
          }
        }
        
        spec.charts.push(chart);
        
        await writeFile(specPath, stringifyYAML(spec));
        
        return {
          content: [{
            type: 'text' as const,
            text: `✅ Added chart '${chart.id}' to ${specPath}`
          }]
        };
      }

      case 'update_chart': {
        const { specPath, chartId, updates } = args as {
          specPath: string;
          chartId: string;
          updates: Partial<ChartSpec>;
        };
        
        const content = await readFile(specPath, 'utf-8');
        const spec = parseYAML(content) as DashboardSpec;
        
        const chartIndex = spec.charts.findIndex(c => c.id === chartId);
        if (chartIndex === -1) {
          throw new Error(`Chart '${chartId}' not found`);
        }
        
        const existingChart = spec.charts[chartIndex];
        
        // Validate updates
        if (updates.id && updates.id !== chartId) {
          // Check for duplicate ID
          if (spec.charts.some(c => c.id === updates.id)) {
            throw new Error(`Chart with id '${updates.id}' already exists`);
          }
        }
        
        if (updates.dataSource) {
          const dataSourceIds = new Set(spec.data.map(d => d.id));
          if (!dataSourceIds.has(updates.dataSource)) {
            throw new Error(`Data source '${updates.dataSource}' not found`);
          }
        }
        
        spec.charts[chartIndex] = { ...existingChart, ...updates };
        
        await writeFile(specPath, stringifyYAML(spec));
        
        return {
          content: [{
            type: 'text' as const,
            text: `✅ Updated chart '${chartId}' in ${specPath}`
          }]
        };
      }

      case 'search_charts': {
        const { specPath, query } = args as {
          specPath: string;
          query?: { id?: string; type?: string; dataSource?: string };
        };
        
        const content = await readFile(specPath, 'utf-8');
        const spec = parseYAML(content) as DashboardSpec;
        
        let results = spec.charts;
        
        if (query?.id) {
          results = results.filter(c => c.id.includes(query.id!));
        }
        if (query?.type) {
          results = results.filter(c => c.type === query.type);
        }
        if (query?.dataSource) {
          results = results.filter(c => c.dataSource === query.dataSource);
        }
        
        return {
          content: [{
            type: 'text' as const,
            text: `Found ${results.length} charts:\n\n${JSON.stringify(results, null, 2)}`
          }]
        };
      }

      case 'explain_coordination': {
        const { specPath } = args as { specPath: string };
        
        const content = await readFile(specPath, 'utf-8');
        const spec = parseYAML(content) as DashboardSpec;
        
        // Find all selections
        const selections = new Map<string, ChartSpec>();
        spec.charts.forEach(chart => {
          if (chart.interaction?.selection) {
            selections.set(chart.interaction.selection, chart);
          }
        });
        
        // Find all filtered charts
        const filtered = new Map<string, ChartSpec[]>();
        spec.charts.forEach(chart => {
          if (chart.interaction?.filterBy) {
            const list = filtered.get(chart.interaction.filterBy) || [];
            list.push(chart);
            filtered.set(chart.interaction.filterBy, list);
          }
        });
        
        let explanation = '📊 **Dashboard Coordination Map**\n\n';
        
        if (selections.size === 0) {
          explanation += 'No interactive selections defined.\n';
        } else {
          explanation += '**Brush Selections:**\n';
          selections.forEach((chart, name) => {
            explanation += `\n• **${name}** (from chart: ${chart.id})\n`;
            const filteredCharts = filtered.get(name) || [];
            if (filteredCharts.length > 0) {
              explanation += `  Filters these charts:\n`;
              filteredCharts.forEach(fc => {
                explanation += `  - ${fc.id} (${fc.type})\n`;
              });
            } else {
              explanation += `  ⚠️ No charts filter by this selection\n`;
            }
          });
        }
        
        return {
          content: [{
            type: 'text' as const,
            text: explanation
          }]
        };
      }

      case 'apply_filter_plan': {
        const { specPath, plan } = args as {
          specPath: string;
          plan: {
            brushChart: string;
            selectionName: string;
            filteredCharts: string[];
          };
        };
        
        const content = await readFile(specPath, 'utf-8');
        const spec = parseYAML(content) as DashboardSpec;
        
        // Update brush chart
        const brushChart = spec.charts.find(c => c.id === plan.brushChart);
        if (!brushChart) {
          throw new Error(`Brush chart '${plan.brushChart}' not found`);
        }
        
        if (!brushChart.interaction) {
          brushChart.interaction = {};
        }
        brushChart.interaction.brush = true;
        brushChart.interaction.selection = plan.selectionName;
        
        // Update filtered charts
        plan.filteredCharts.forEach(chartId => {
          const chart = spec.charts.find(c => c.id === chartId);
          if (chart) {
            if (!chart.interaction) {
              chart.interaction = {};
            }
            chart.interaction.filterBy = plan.selectionName;
          }
        });
        
        await writeFile(specPath, stringifyYAML(spec));
        
        return {
          content: [{
            type: 'text' as const,
            text: `✅ Applied filter plan:\n` +
                  `  Brush: ${plan.brushChart} → ${plan.selectionName}\n` +
                  `  Filters: ${plan.filteredCharts.join(', ')}`
          }]
        };
      }

      case 'search_charts': {
        const { query, projectRoot, boardPath, all } = args as {
          query: string;
          projectRoot?: string;
          boardPath?: string;
          all?: boolean;
        };
        
        const hits = await searchCharts({
          projectRoot: projectRoot || process.cwd(),
          query,
          boardPath,
          all: all || false
        });
        
        return {
          content: [{
            type: 'text' as const,
            text: `Found ${hits.length} chart(s):\n\n${JSON.stringify(hits, null, 2)}`
          }]
        };
      }

      case 'get_chart': {
        const { boardPath, chartId } = args as {
          boardPath: string;
          chartId: string;
        };
        
        const resource = await getChart(boardPath, chartId);
        
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(resource, null, 2)
          }]
        };
      }

      case 'list_charts': {
        const { projectRoot, boardPath } = args as {
          projectRoot?: string;
          boardPath?: string;
        };
        
        const charts = await listCharts(projectRoot || process.cwd(), boardPath);
        
        return {
          content: [{
            type: 'text' as const,
            text: `Found ${charts.length} chart(s):\n\n${JSON.stringify(charts, null, 2)}`
          }]
        };
      }

      case 'compose_board': {
        const { projectRoot, chartIds, metric, title, description } = args as {
          projectRoot?: string;
          chartIds: string[];
          metric?: string;
          title?: string;
          description?: string;
        };
        
        const root = projectRoot || process.cwd();
        
        // Resolve chart references
        const chartRefs = [];
        for (const id of chartIds) {
          const ref = await resolveChartRef(root, id);
          chartRefs.push(ref);
        }
        
        // Compose board
        const spec = await composeBoard(root, {
          charts: chartRefs,
          metric,
          title,
          description
        });
        
        return {
          content: [{
            type: 'text' as const,
            text: `✅ Composed board from ${chartIds.length} charts:\n\n${stringifyYAML(spec)}`
          }]
        };
      }

      case 'render_chart': {
        const { boardPath, chartId, outDir } = args as {
          boardPath: string;
          chartId: string;
          outDir?: string;
        };
        
        // Build single chart
        await build(boardPath, {
          outDir: outDir || 'dist',
          chartId
        });
        
        return {
          content: [{
            type: 'text' as const,
            text: `✅ Built chart '${chartId}' to ${outDir || 'dist'}/index.html`
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('coordboard MCP server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
