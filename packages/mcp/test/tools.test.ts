/**
 * Smoke tests for MCP tool handlers
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { handleTool } from '../dist/tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../..');
const revenueTrendChart = join(repoRoot, 'examples/charts/revenue_trend.chart.yaml');
const salesDash = join(repoRoot, 'examples/sales-dash/sales.dash.yaml');

test('validate_dashboard_spec returns valid:true for revenue_trend.chart.yaml', async () => {
  const raw = await handleTool('validate_dashboard_spec', {
    specPath: revenueTrendChart,
    projectRoot: repoRoot,
  });
  const result = JSON.parse(raw) as { valid: boolean; kind?: string };
  assert.strictEqual(result.valid, true);
});

test('list_chart_types returns registered chart types', async () => {
  const raw = await handleTool('list_chart_types', {});
  assert.match(raw, /line|bar/);
});

test('search_charts finds revenue-related charts', async () => {
  const raw = await handleTool('search_charts', {
    projectRoot: repoRoot,
    query: 'revenue',
  });
  assert.match(raw, /Found \d+ chart/);
  assert.match(raw, /revenue/i);
});

test('list_charts enumerates charts in sales dash', async () => {
  const raw = await handleTool('list_charts', {
    projectRoot: repoRoot,
    dashPath: salesDash,
  });
  assert.match(raw, /Found \d+ chart/);
  assert.match(raw, /sales_trend/);
});

test('compose_dash writes composed dash yaml', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'dvfc-mcp-compose-'));
  const outFile = join(outDir, 'composed.dash.yaml');
  const raw = await handleTool('compose_dash', {
    projectRoot: repoRoot,
    chartIds: ['charts__revenue_trend'],
    title: 'MCP compose test',
    outFile,
  });
  assert.match(raw, /Composed dash/);
  assert.match(raw, /revenue_trend|MCP compose test/);
  await rm(outDir, { recursive: true, force: true });
});
