#!/usr/bin/env node

/**
 * MCP Server for Data Viz Factory
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
import type { DashboardSpec, ChartSpec } from '@dvfc/core';
import { validate, build, loadNormalized } from '@dvfc/cli';
import type { DbtManifest } from '@dvfc/dbt-adapter';
import {
  searchCharts,
  getChart,
  listCharts,
  resolveChartRef,
  composeDash,
  extractChartsFromDash,
} from '@dvfc/charts';
import { registerBuiltinChartTypes, listChartTypes } from '@dvfc/core';
import { dirname, join } from 'path';

// Create MCP server
const server = new Server(
  {
    name: 'Data Viz Factory-mcp',
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
        description: 'Validate a chart (*.chart.yaml) or dash (*.dash.yaml) spec. Checks JSON Schema, semantic rules, and dbt model references.',
        inputSchema: {
          type: 'object',
          properties: {
            specPath: {
              type: 'string',
              description: 'Path to chart, dash, or board spec (YAML or JSON)'
            }
          },
          required: ['specPath']
        }
      },
      {
        name: 'build_dashboard',
        description: 'Build from a chart or dash spec. HTML (Mosaic) by default; use format svg|png for atomic chart export via Vega-Lite.',
        inputSchema: {
          type: 'object',
          properties: {
            specPath: {
              type: 'string',
              description: 'Path to chart, dash, or board spec'
            },
            format: {
              type: 'string',
              enum: ['html', 'svg', 'png'],
              description: 'Output format (default: html; svg/png for single chart specs)'
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
              description: 'Path to chart, dash, or board spec'
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
        description: 'Search for charts across the project. Returns chart hits with dash path, chart ID, type, title, and display key. Supports --all for all matches or top 10 by default.',
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
            dashPath: {
              type: 'string',
              description: 'Filter by specific dash path (*.dash.yaml)'
            },
            boardPath: {
              type: 'string',
              description: 'Deprecated alias for dashPath'
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
        description: 'Get chart metadata with full dash context. Returns chart spec, dash path, display key, and context (data sources, theme, layout).',
        inputSchema: {
          type: 'object',
          properties: {
            dashPath: {
              type: 'string',
              description: 'Path to *.dash.yaml file'
            },
            boardPath: {
              type: 'string',
              description: 'Deprecated alias for dashPath'
            },
            chartId: {
              type: 'string',
              description: 'Chart ID within the dash'
            }
          },
          required: ['chartId']
        }
      },
      {
        name: 'list_charts',
        description: 'List all charts in project or specific dash. Returns all charts with display keys and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: {
              type: 'string',
              description: 'Project root directory (default: current directory)'
            },
            dashPath: {
              type: 'string',
              description: 'Filter by specific dash path'
            },
            boardPath: {
              type: 'string',
              description: 'Deprecated alias for dashPath'
            }
          }
        }
      },
      {
        name: 'compose_board',
        description: 'Alias of compose_dash — compose a *.dash.yaml from chart IDs or display keys.',
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
            title: {
              type: 'string',
              description: 'Title for composed dash'
            },
            description: {
              type: 'string',
              description: 'Description for composed dash'
            },
            outFile: {
              type: 'string',
              description: 'Output path (default: composed.dash.yaml)'
            }
          },
          required: ['chartIds']
        }
      },
      {
        name: 'render_chart',
        description: 'Render/build a single chart with dash context. Builds HTML with only the specified chart while preserving data sources, theme, and layout.',
        inputSchema: {
          type: 'object',
          properties: {
            dashPath: {
              type: 'string',
              description: 'Path to *.dash.yaml file'
            },
            boardPath: {
              type: 'string',
              description: 'Deprecated alias for dashPath'
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
          required: ['chartId']
        }
      },
      {
        name: 'compose_dash',
        description: 'Compose a *.dash.yaml from chart ids or display keys (dashId__chartId).',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: { type: 'string', description: 'Project root (default: cwd)' },
            chartIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Chart ids or display keys'
            },
            title: { type: 'string' },
            description: { type: 'string' },
            outFile: { type: 'string', description: 'Output path (default: composed.dash.yaml)' }
          },
          required: ['chartIds']
        }
      },
      {
        name: 'extract_charts',
        description: 'Extract inline charts from a dash into *.chart.yaml files (dvfc charts extract).',
        inputSchema: {
          type: 'object',
          properties: {
            dashPath: { type: 'string', description: 'Path to dash YAML' },
            outDir: { type: 'string', description: 'Output directory (default: charts)' }
          },
          required: ['dashPath']
        }
      },
      {
        name: 'list_chart_types',
        description: 'List registered chart type plugins (built-ins + loaded modules). Same as dvfc charts types.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'normalize_spec',
        description: 'Normalize chart/dash IR to legacy Mosaic DashboardSpec YAML (dvfc normalize). Useful for debugging resolution and connectors.',
        inputSchema: {
          type: 'object',
          properties: {
            specPath: { type: 'string', description: 'Path to chart or dash spec' }
          },
          required: ['specPath']
        }
      }
    ]
  };
});

// Tool handlers
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
        const { specPath, outDir, minify, format } = args as {
          specPath: string;
          outDir?: string;
          minify?: boolean;
          format?: 'html' | 'svg' | 'png';
        };
        
        await build(specPath, { outDir, minify, format: format ?? 'html' });
        
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
        const { query, projectRoot, dashPath, boardPath, all } = args as {
          query: string;
          projectRoot?: string;
          dashPath?: string;
          boardPath?: string;
          all?: boolean;
        };
        
        const hits = await searchCharts({
          projectRoot: projectRoot || process.cwd(),
          query,
          dashPath: dashPath || boardPath,
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
        const { dashPath, boardPath, chartId } = args as {
          dashPath?: string;
          boardPath?: string;
          chartId: string;
        };
        const path = dashPath || boardPath;
        if (!path) throw new Error('dashPath (or deprecated boardPath) is required');
        
        const resource = await getChart(path, chartId);
        
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(resource, null, 2)
          }]
        };
      }

      case 'list_charts': {
        const { projectRoot, dashPath, boardPath } = args as {
          projectRoot?: string;
          dashPath?: string;
          boardPath?: string;
        };
        
        const charts = await listCharts(projectRoot || process.cwd(), dashPath || boardPath);
        
        return {
          content: [{
            type: 'text' as const,
            text: `Found ${charts.length} chart(s):\n\n${JSON.stringify(charts, null, 2)}`
          }]
        };
      }

      case 'compose_board':
      case 'compose_dash': {
        const { projectRoot, chartIds, title, description, outFile } = args as {
          projectRoot?: string;
          chartIds: string[];
          title?: string;
          description?: string;
          outFile?: string;
        };
        const root = projectRoot || process.cwd();
        const { dash, outPath } = await composeDash(root, {
          chartIds,
          title,
          description,
          outFile: outFile || 'composed.dash.yaml',
        });
        return {
          content: [{
            type: 'text' as const,
            text: `✅ Composed dash → ${outPath}\n\n${stringifyYAML(dash)}`
          }]
        };
      }

      case 'render_chart': {
        const { dashPath, boardPath, chartId, outDir } = args as {
          dashPath?: string;
          boardPath?: string;
          chartId: string;
          outDir?: string;
        };
        const path = dashPath || boardPath;
        if (!path) throw new Error('dashPath (or deprecated boardPath) is required');
        
        await build(path, {
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

      case 'extract_charts': {
        const { dashPath, outDir } = args as { dashPath: string; outDir?: string };
        const written = await extractChartsFromDash(dashPath, outDir || 'charts');
        return {
          content: [{
            type: 'text' as const,
            text: written.length
              ? `✅ Extracted ${written.length} chart(s):\n${written.join('\n')}`
              : 'No inline charts to extract (refs only).'
          }]
        };
      }

      case 'list_chart_types': {
        registerBuiltinChartTypes();
        const types = listChartTypes();
        const lines = types.map((t) => {
          const caps = [
            t.capabilities.mosaic ? 'mosaic' : null,
            t.capabilities.vegaLite ? 'vega-lite' : null,
            ...(t.capabilities.interaction ?? []),
          ].filter(Boolean).join(', ');
          return `${t.id}\t${t.label ?? ''}\t${caps}`;
        });
        return {
          content: [{
            type: 'text' as const,
            text: `${types.length} chart type(s):\n\n${lines.join('\n')}`
          }]
        };
      }

      case 'normalize_spec': {
        const { specPath } = args as { specPath: string };
        const result = await loadNormalized(specPath);
        const body = stringifyYAML({
          kind: result.kind,
          meta: result.spec.meta,
          data: result.spec.data,
          charts: result.spec.charts,
          layout: result.spec.layout,
          theme: result.spec.theme,
          assets: result.assets.map((a) => ({ dest: a.destName, src: a.absPath })),
        });
        return {
          content: [{ type: 'text' as const, text: body }]
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
  console.error('Data Viz Factory MCP server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
