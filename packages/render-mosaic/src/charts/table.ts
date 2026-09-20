import type { ChartSpec } from '@dvfc/core';
import type { GeneratorContext } from '../generator.js';
import {
  chartFilterVar,
  filterSqlExpr,
  queryJsonRows,
  wrapReactiveFilterRender,
} from './helpers.js';

/**
 * Generate a table chart (data grid)
 */
export function generateTableChart(chart: ChartSpec, ctx: GeneratorContext): string {
  const { dataSource } = chart;

  if (!dataSource) {
    throw new Error(`Chart ${chart.id}: table charts require dataSource`);
  }

  const filterBy = chartFilterVar(chart, ctx);
  const whereExpr = filterSqlExpr(filterBy);
  const sql = `
        SELECT * FROM ${dataSource}
        \${${whereExpr}}
        LIMIT 100
      `;

  return wrapReactiveFilterRender(
    chart.id,
    filterBy,
    `      ${queryJsonRows(sql)}
      
      if (result.length > 0) {
        const columns = Object.keys(result[0]);
        const tableHTML = \`
          <div class="dvfc-smooth" style="overflow-x: auto; max-height: 400px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">
              <thead style="background: #f7fafc; position: sticky; top: 0;">
                <tr>
                  \${columns.map(col => \`<th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #e2e8f0;">\${col}</th>\`).join('')}
                </tr>
              </thead>
              <tbody>
                \${result.map(row => \`
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    \${columns.map(col => \`<td style="padding: 0.75rem;">\${row[col]}</td>\`).join('')}
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \`;
        container${chart.id}.innerHTML = tableHTML;
      } else {
        container${chart.id}.innerHTML = '<p style="text-align: center; color: #999;">No data</p>';
      }`
  );
}
