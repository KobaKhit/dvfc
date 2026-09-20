/**
 * Tests for chart discovery functionality
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { searchCharts, getChart, resolveChartRef, makeDisplayKey, parseDisplayKey } from '../dist/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');

test('searchCharts finds revenue charts', async () => {
  const hits = await searchCharts({
    projectRoot,
    query: 'revenue',
    all: true
  });
  
  assert.ok(hits.length >= 2, 'Should find multiple revenue charts');
  assert.ok(hits.some(h => h.chartId === 'daily_revenue'), 'Should find daily_revenue');
  assert.ok(hits.some(h => h.chartId === 'revenue_by_method'), 'Should find revenue_by_method');
});

test('searchCharts returns top 10 by default', async () => {
  const hits = await searchCharts({
    projectRoot,
    query: '',
    all: false
  });
  
  assert.ok(hits.length <= 10, 'Should return max 10 results');
});

test('searchCharts scores exact ID matches highest', async () => {
  const hits = await searchCharts({
    projectRoot,
    query: 'daily_revenue',
    all: true
  });
  
  const exactMatch = hits.find(h => h.chartId === 'daily_revenue');
  assert.ok(exactMatch, 'Should find exact match');
  assert.strictEqual(exactMatch.score, 100, 'Exact ID match should score 100');
});

test('getChart returns chart with context', async () => {
  const boardPath = join(projectRoot, 'examples/dbt-jaffle/jaffle.dash.yaml');
  const resource = await getChart(boardPath, 'daily_revenue');
  
  assert.strictEqual(resource.chart.id, 'daily_revenue');
  assert.strictEqual(resource.chart.type, 'line');
  assert.ok(resource.context.dataSources.length > 0);
  assert.ok(resource.displayKey.includes('__'));
});

test('getChart throws on missing chart', async () => {
  const boardPath = join(projectRoot, 'examples/dbt-jaffle/jaffle.dash.yaml');
  
  await assert.rejects(
    async () => await getChart(boardPath, 'nonexistent'),
    /not found/
  );
});

test('resolveChartRef handles display keys', async () => {
  const ref = await resolveChartRef(projectRoot, 'dbt-jaffle__daily_revenue');
  
  assert.strictEqual(ref.chartId, 'daily_revenue');
  assert.ok(ref.boardPath.includes('dbt-jaffle'));
});

test('resolveChartRef handles unambiguous plain IDs', async () => {
  const ref = await resolveChartRef(projectRoot, 'status_breakdown');
  
  assert.strictEqual(ref.chartId, 'status_breakdown');
});

test('resolveChartRef throws on ambiguous IDs', async () => {
  await assert.rejects(
    async () => await resolveChartRef(projectRoot, 'daily_revenue'),
    /Ambiguous chart reference/
  );
});

test('makeDisplayKey formats correctly', () => {
  const key = makeDisplayKey('examples/sales-board/sales.dash.yaml', 'daily_sales');
  assert.strictEqual(key, 'sales-board__daily_sales');
});

test('parseDisplayKey extracts components', () => {
  const parsed = parseDisplayKey('sales-board__daily_sales');
  assert.ok(parsed);
  assert.strictEqual(parsed.boardName, 'sales-board');
  assert.strictEqual(parsed.chartId, 'daily_sales');
});

test('parseDisplayKey returns null for invalid format', () => {
  const parsed = parseDisplayKey('invalid');
  assert.strictEqual(parsed, null);
});
