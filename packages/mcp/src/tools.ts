/**
 * MCP tool definitions and handlers.
 */

import { readFile } from 'node:fs/promises';
import { stringify as stringifyYAML } from 'yaml';
import type { ChartSpec } from '@dvfc/core';
import {
  validateSpecFileWithResult,
  buildHtmlDashboard,
  buildStaticChart,
  buildDcDashboard,
  buildDcWasmDashboard,
  loadNormalized,
  applyDvfcConfig,
  addChartToSpecFile,
  updateChartInSpecFile,
  explainCoordination,
  applyFilterPlan,
} from '@dvfc/build';
import { listDbtModels, type DbtManifest } from '@dvfc/adapter-dbt';
import {
  searchCharts,
  getChart,
  listCharts,
  composeDash,
  extractChartsFromDash,
} from '@dvfc/charts';
import { listChartTypes } from '@dvfc/core';

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

/** Shared JSON-Schema property fragments. */
function sharedProps(opts: {
  projectRoot?: boolean | string;
  dashPath?: boolean | string;
}): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (opts.projectRoot) {
    props.projectRoot = {
      type: 'string',
      description:
        typeof opts.projectRoot === 'string'
          ? opts.projectRoot
          : 'Project root for dvfc.config.js (default: cwd)',
    };
  }
  if (opts.dashPath) {
    props.dashPath = {
      type: 'string',
      description:
        typeof opts.dashPath === 'string' ? opts.dashPath : 'Path to *.dash.yaml',
    };
  }
  return props;
}

const composeDashInputSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    ...sharedProps({ projectRoot: 'Project root (default: cwd)' }),
    chartIds: {
      type: 'array',
      items: { type: 'string' },
      description: 'Chart ids or display keys',
    },
    title: { type: 'string' },
    description: { type: 'string' },
    outFile: { type: 'string', description: 'Output path (default: composed.dash.yaml)' },
  },
  required: ['chartIds'],
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'validate_dashboard_spec',
    description:
      'Validate a chart (*.chart.yaml) or dash (*.dash.yaml) spec. Checks JSON Schema, semantic rules, and dbt model references.',
    inputSchema: {
      type: 'object',
      properties: {
        specPath: {
          type: 'string',
          description: 'Path to chart or dash spec (YAML or JSON)',
        },
        ...sharedProps({ projectRoot: true }),
      },
      required: ['specPath'],
    },
  },
  {
    name: 'build_dashboard',
    description:
      'Build from a chart or dash spec. HTML (Mosaic+DuckDB) by default; html-dc / html-dc-static for dc.js CDN+inline; html-dc-wasm for dc.js+DuckDB-WASM; svg|png|html-static for Vega-Lite.',
    inputSchema: {
      type: 'object',
      properties: {
        specPath: { type: 'string', description: 'Path to chart or dash spec' },
        format: {
          type: 'string',
          enum: [
            'html',
            'html-dc',
            'html-dc-static',
            'html-dc-wasm',
            'svg',
            'png',
            'html-static',
          ],
          description: 'Output format (default: html)',
        },
        outDir: {
          type: 'string',
          description: 'Output directory for built HTML (default: dist)',
        },
        minify: { type: 'boolean', description: 'Minify output (default: false)' },
        chartId: {
          type: 'string',
          description: 'When building a single chart from a dash (required for svg/png from multi-chart dashes)',
        },
        ...sharedProps({ projectRoot: true }),
      },
      required: ['specPath'],
    },
  },
  {
    name: 'list_models',
    description:
      'List dbt models from a manifest.json file. Returns model names, schemas, and relation paths.',
    inputSchema: {
      type: 'object',
      properties: {
        manifestPath: { type: 'string', description: 'Path to dbt manifest.json' },
      },
      required: ['manifestPath'],
    },
  },
  {
    name: 'create_chart',
    description:
      'Add a new chart to a dash spec. Supports coordinated filtering via filterBy or brush interactions.',
    inputSchema: {
      type: 'object',
      properties: {
        specPath: { type: 'string', description: 'Path to *.dash.yaml' },
        chart: {
          type: 'object',
          description: 'Chart specification',
          properties: {
            id: { type: 'string' },
            type: {
              type: 'string',
              description: 'registered chart type id (see list_chart_types)',
            },
            dataSource: { type: 'string' },
            title: { type: 'string' },
            encoding: { type: 'object' },
            interaction: { type: 'object' },
            content: { type: 'string' },
            width: { type: 'number' },
            height: { type: 'number' },
          },
          required: ['id', 'type'],
        },
      },
      required: ['specPath', 'chart'],
    },
  },
  {
    name: 'update_chart',
    description:
      'Update an existing chart in a dash spec. Can modify encoding, interactions, or styling.',
    inputSchema: {
      type: 'object',
      properties: {
        specPath: { type: 'string', description: 'Path to dash spec file' },
        chartId: { type: 'string', description: 'ID of chart to update' },
        updates: {
          type: 'object',
          description: 'Partial chart spec with fields to update',
        },
      },
      required: ['specPath', 'chartId', 'updates'],
    },
  },
  {
    name: 'search_charts',
    description:
      'Search for charts across the project. Returns chart hits with dash path, chart ID, type, title, and display key.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (matches chart ID, title, type, field names)',
        },
        ...sharedProps({
          projectRoot: 'Project root directory (default: current directory)',
          dashPath: 'Filter by specific dash path (*.dash.yaml)',
        }),
        all: {
          type: 'boolean',
          description: 'Return all matches (default: false, returns top 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_chart',
    description:
      'Get chart metadata with full dash context. Returns chart spec, dash path, display key, and context.',
    inputSchema: {
      type: 'object',
      properties: {
        ...sharedProps({ dashPath: 'Path to *.dash.yaml file' }),
        chartId: { type: 'string', description: 'Chart ID within the dash' },
      },
      required: ['chartId'],
    },
  },
  {
    name: 'list_charts',
    description: 'List all charts in project or specific dash.',
    inputSchema: {
      type: 'object',
      properties: {
        ...sharedProps({
          projectRoot: 'Project root directory (default: current directory)',
          dashPath: 'Filter by specific dash path',
        }),
      },
    },
  },
  {
    name: 'compose_dash',
    description: 'Compose a *.dash.yaml from chart ids or display keys (dashId__chartId).',
    inputSchema: composeDashInputSchema,
  },
  {
    name: 'render_chart',
    description:
      'Render/build a single chart with dash context. Builds HTML with only the specified chart.',
    inputSchema: {
      type: 'object',
      properties: {
        ...sharedProps({
          dashPath: 'Path to *.dash.yaml file',
          projectRoot: true,
        }),
        chartId: { type: 'string', description: 'Chart ID to render' },
        outDir: { type: 'string', description: 'Output directory (default: dist)' },
      },
      required: ['dashPath', 'chartId'],
    },
  },
  {
    name: 'extract_charts',
    description: 'Extract inline charts from a dash into *.chart.yaml files.',
    inputSchema: {
      type: 'object',
      properties: {
        ...sharedProps({ dashPath: 'Path to dash YAML' }),
        outDir: { type: 'string', description: 'Output directory (default: charts)' },
      },
      required: ['dashPath'],
    },
  },
  {
    name: 'list_chart_types',
    description:
      'List registered chart type plugins (built-ins + dvfc.config.js plugins). Same as dvfc charts types.',
    inputSchema: {
      type: 'object',
      properties: {
        ...sharedProps({ projectRoot: true }),
      },
    },
  },
  {
    name: 'normalize_spec',
    description:
      'Normalize chart/dash IR to Mosaic DashboardSpec YAML. Useful for debugging resolution and connectors.',
    inputSchema: {
      type: 'object',
      properties: {
        specPath: { type: 'string', description: 'Path to chart or dash spec' },
        ...sharedProps({ projectRoot: true }),
      },
      required: ['specPath'],
    },
  },
  {
    name: 'explain_coordination',
    description:
      'Explain brush/filter coordination in a dash: which charts publish selections and which charts filter by them.',
    inputSchema: {
      type: 'object',
      properties: {
        specPath: { type: 'string', description: 'Path to chart or dash spec' },
      },
      required: ['specPath'],
    },
  },
  {
    name: 'apply_filter_plan',
    description:
      'Wire brush/filter coordination: set a brush chart selection and filterBy on target charts.',
    inputSchema: {
      type: 'object',
      properties: {
        specPath: { type: 'string', description: 'Path to dash spec' },
        plan: {
          type: 'object',
          properties: {
            brushChart: { type: 'string' },
            selectionName: { type: 'string' },
            filteredCharts: { type: 'array', items: { type: 'string' } },
          },
          required: ['brushChart', 'selectionName', 'filteredCharts'],
        },
      },
      required: ['specPath', 'plan'],
    },
  },
];

function requireString(args: Record<string, unknown>, key: string, hint?: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(
      `Missing required parameter '${key}'.${hint ? ` ${hint}` : ''} ` +
        `Received: ${v === undefined ? 'undefined' : JSON.stringify(v)}`
    );
  }
  return v;
}

function formatToolError(err: unknown, context: Record<string, unknown> = {}): never {
  const message = err instanceof Error ? err.message : String(err);
  const details = {
    error: message,
    ...context,
    hint:
      /not found/i.test(message)
        ? 'Check the path/id exists; for charts use displayKey (dashName__chartId) or search_charts.'
        : /validat/i.test(message)
          ? 'Run validate_dashboard_spec on the same path for structured schema errors.'
          : /Ambiguous/i.test(message)
            ? 'Disambiguate with a displayKey (dashName__chartId).'
            : undefined,
  };
  throw new Error(JSON.stringify(details, null, 2));
}

function isFormattedToolError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  try {
    const parsed = JSON.parse(err.message) as unknown;
    return Boolean(parsed && typeof parsed === 'object' && parsed !== null && 'error' in parsed);
  } catch {
    return false;
  }
}

type Handler = (args: Record<string, unknown>) => Promise<string>;

async function handleComposeDash(args: Record<string, unknown>): Promise<string> {
  const chartIds = args.chartIds;
  if (!Array.isArray(chartIds) || chartIds.length === 0) {
    throw new Error(
      JSON.stringify({
        error: "Missing required parameter 'chartIds'",
        hint: 'Pass an array of chart ids or display keys (dashName__chartId)',
      })
    );
  }
  const root = (args.projectRoot as string) || process.cwd();
  const { dash, outPath } = await composeDash(root, {
    chartIds: chartIds as string[],
    title: args.title as string | undefined,
    description: args.description as string | undefined,
    outFile: (args.outFile as string) || 'composed.dash.yaml',
  });
  return `Composed dash → ${outPath}\n\n${stringifyYAML(dash)}`;
}

const HANDLERS: Record<string, Handler> = {
  async validate_dashboard_spec(args) {
    const specPath = requireString(args, 'specPath', 'Pass the path to a *.chart.yaml or *.dash.yaml.');
    const projectRoot = (args.projectRoot as string) || process.cwd();
    const result = await validateSpecFileWithResult(specPath, { projectRoot, quiet: true });
    if (result.valid) {
      return JSON.stringify({ valid: true, kind: result.kind, specPath }, null, 2);
    }
    return JSON.stringify(
      {
        valid: false,
        kind: result.kind,
        specPath,
        errors: result.errors,
        report: result.report,
        hint: 'Fix schema/required fields or dbt model refs, then re-run validate_dashboard_spec.',
      },
      null,
      2
    );
  },

  async build_dashboard(args) {
    const specPath = requireString(args, 'specPath');
    const outDir = args.outDir as string | undefined;
    const minify = args.minify as boolean | undefined;
    const format = args.format as
      | 'html'
      | 'html-dc'
      | 'html-dc-static'
      | 'html-dc-wasm'
      | 'svg'
      | 'png'
      | 'html-static'
      | undefined;
    const chartId = args.chartId as string | undefined;
    const projectRoot = (args.projectRoot as string) || process.cwd();
    if (format === 'svg' || format === 'png' || format === 'html-static') {
      const path = await buildStaticChart(specPath, {
        format,
        outDir,
        chartId,
        projectRoot,
      });
      return `Chart exported\nOutput: ${path}`;
    }
    if (format === 'html-dc' || format === 'html-dc-static') {
      const path = await buildDcDashboard(specPath, {
        outDir,
        chartId,
        projectRoot,
      });
      return `dc.js static dashboard exported\nOutput: ${path}`;
    }
    if (format === 'html-dc-wasm') {
      const path = await buildDcWasmDashboard(specPath, {
        outDir,
        minify,
        chartId,
        projectRoot,
      });
      return `dc.js + DuckDB-WASM dashboard exported\nOutput: ${path}`;
    }
    await buildHtmlDashboard(specPath, {
      outDir,
      minify,
      chartId,
      projectRoot,
      quiet: true,
    });
    return `Dashboard built successfully\nOutput: ${outDir || 'dist'}/index.html`;
  },

  async list_models(args) {
    const manifestPath = requireString(args, 'manifestPath', 'Path to dbt manifest.json.');
    const manifestData = JSON.parse(await readFile(manifestPath, 'utf-8')) as DbtManifest;
    const models = listDbtModels(manifestData).map((m) => ({
      name: m.name,
      schema: m.schema,
      database: m.database,
      path: m.path,
      relationName: m.relationName,
    }));
    return `Found ${models.length} models:\n\n${JSON.stringify(models, null, 2)}`;
  },

  async create_chart(args) {
    const specPath = requireString(args, 'specPath');
    const chart = args.chart as ChartSpec | undefined;
    if (!chart || typeof chart !== 'object' || !chart.id || !chart.type) {
      throw new Error(
        JSON.stringify({
          error: 'Invalid chart parameter',
          hint: 'chart must include at least id and type',
          received: chart,
        })
      );
    }
    await addChartToSpecFile(specPath, chart);
    return `Added chart '${chart.id}' to ${specPath}`;
  },

  async update_chart(args) {
    const specPath = requireString(args, 'specPath');
    const chartId = requireString(args, 'chartId');
    if (!args.updates || typeof args.updates !== 'object') {
      throw new Error(
        JSON.stringify({
          error: "Missing required parameter 'updates'",
          hint: 'Pass a partial chart object with fields to change',
        })
      );
    }
    await updateChartInSpecFile(specPath, chartId, args.updates as Partial<ChartSpec>);
    return `Updated chart '${chartId}' in ${specPath}`;
  },

  async search_charts(args) {
    const query = requireString(args, 'query');
    const hits = await searchCharts({
      projectRoot: (args.projectRoot as string) || process.cwd(),
      query,
      dashPath: args.dashPath as string | undefined,
      all: Boolean(args.all),
    });
    return `Found ${hits.length} chart(s):\n\n${JSON.stringify(hits, null, 2)}`;
  },

  async get_chart(args) {
    const path = requireString(
      args,
      'dashPath',
      'Pass dashPath pointing to the *.dash.yaml file'
    );
    const chartId = requireString(args, 'chartId');
    const resource = await getChart(path, chartId);
    return JSON.stringify(resource, null, 2);
  },

  async list_charts(args) {
    const charts = await listCharts(
      (args.projectRoot as string) || process.cwd(),
      args.dashPath as string | undefined
    );
    return `Found ${charts.length} chart(s):\n\n${JSON.stringify(charts, null, 2)}`;
  },

  compose_dash: handleComposeDash,

  async render_chart(args) {
    const path = requireString(
      args,
      'dashPath',
      'Pass dashPath to the *.dash.yaml file plus chartId'
    );
    const chartId = requireString(args, 'chartId');
    const outDir = (args.outDir as string) || 'dist';
    const projectRoot = (args.projectRoot as string) || process.cwd();
    await buildHtmlDashboard(path, {
      outDir,
      chartId,
      projectRoot,
      quiet: true,
    });
    return `Built chart '${chartId}' to ${outDir}/index.html`;
  },

  async extract_charts(args) {
    const dashPath = requireString(args, 'dashPath');
    const written = await extractChartsFromDash(dashPath, (args.outDir as string) || 'charts');
    return written.length
      ? `Extracted ${written.length} chart(s):\n${written.join('\n')}`
      : 'No inline charts to extract (refs only).';
  },

  async list_chart_types(args) {
    await applyDvfcConfig((args.projectRoot as string) || process.cwd());
    const types = listChartTypes();
    const lines = types.map((t) => {
      const caps = [
        t.capabilities.mosaic ? 'mosaic' : null,
        t.capabilities.vegaLite ? 'vega-lite' : null,
        ...(t.capabilities.interaction ?? []),
      ]
        .filter(Boolean)
        .join(', ');
      return `${t.id}\t${t.label ?? ''}\t${caps}`;
    });
    return `${types.length} chart type(s):\n\n${lines.join('\n')}`;
  },

  async normalize_spec(args) {
    const specPath = requireString(args, 'specPath');
    const projectRoot = (args.projectRoot as string) || process.cwd();
    const result = await loadNormalized(specPath, projectRoot);
    return stringifyYAML({
      kind: result.kind,
      meta: result.spec.meta,
      data: result.spec.data,
      charts: result.spec.charts,
      layout: result.spec.layout,
      theme: result.spec.theme,
      assets: result.assets.map((a) => ({ dest: a.destName, src: a.absPath })),
    });
  },

  async explain_coordination(args) {
    const specPath = requireString(args, 'specPath');
    return explainCoordination(specPath);
  },

  async apply_filter_plan(args) {
    const specPath = requireString(args, 'specPath');
    const plan = args.plan as {
      brushChart: string;
      selectionName: string;
      filteredCharts: string[];
    } | undefined;
    if (
      !plan ||
      !plan.brushChart ||
      !plan.selectionName ||
      !Array.isArray(plan.filteredCharts)
    ) {
      throw new Error(
        JSON.stringify({
          error: "Invalid 'plan' parameter",
          hint: 'plan requires brushChart, selectionName, and filteredCharts[]',
          received: plan,
        })
      );
    }
    await applyFilterPlan(specPath, plan);
    return (
      `Applied filter plan:\n` +
      `  Brush: ${plan.brushChart} → ${plan.selectionName}\n` +
      `  Filters: ${plan.filteredCharts.join(', ')}`
    );
  },
};

export async function handleTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const handler = HANDLERS[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }
  try {
    return await handler(args);
  } catch (err) {
    if (isFormattedToolError(err)) throw err;
    formatToolError(err, { tool: name });
  }
}
