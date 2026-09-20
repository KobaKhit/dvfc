import type { ChartSpec } from '@dvfc/core';
import type { GeneratorContext } from '../generator.js';
import {
  chartFilterVar,
  filterSqlExpr,
  queryJsonRows,
  wrapReactiveFilterRender,
} from './helpers.js';

/**
 * Generate a number/KPI chart (single metric display)
 */
export function generateNumberChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const { encoding, dataSource } = chart;

  if (!dataSource || !encoding) {
    throw new Error(`Chart ${chart.id}: number charts require dataSource and encoding`);
  }

  const field = encoding.y?.field || encoding.x?.field || 'value';
  const aggregate = encoding.y?.aggregate || encoding.x?.aggregate || 'sum';
  const filterBy = chartFilterVar(chart, ctx);
  const whereExpr = filterSqlExpr(filterBy);
  const sql = `
        SELECT ${aggregate.toUpperCase()}(${field}) as value
        FROM ${dataSource}
        \${${whereExpr}}
      `;

  return wrapReactiveFilterRender(
    chart.id,
    filterBy,
    `      ${queryJsonRows(sql)}
      
      const value = Number(result[0]?.value ?? 0);
      const formatted = Number.isFinite(value) ? 
        value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 
        String(result[0]?.value ?? 0);
      
      container${chart.id}.innerHTML = \`
        <div class="dvfc-smooth" style="text-align: center; padding: 1.75rem 1rem;">
          <div class="dvfc-kpi-value" style="font-size: 2.6rem; font-weight: 700; color: #1e3a5f; letter-spacing: -0.03em;">\${formatted}</div>
          <div style="font-size: 0.85rem; color: #607078; margin-top: 0.4rem;">${chart.title || field}</div>
        </div>
      \`;`
  );
}
