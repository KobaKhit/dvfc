/**
 * Shared helpers for Mosaic chart code generation.
 */

import type { ChartSpec } from '@dvfc/core';
import type { GeneratorContext } from '../generator.js';

/** Resolved filterBy Mosaic Selection variable for generated chart code. */
export function chartFilterVar(chart: ChartSpec, ctx: GeneratorContext): string | undefined {
  return ctx.selectionPlan?.filterVar(chart) ?? chart.interaction?.filterBy;
}

/** Resolved publish Selection variable for plot interactors / highlight. */
export function chartPublishVar(chart: ChartSpec, ctx: GeneratorContext): string | undefined {
  return (
    ctx.selectionPlan?.publishVar(chart) ??
    chart.interaction?.selection ??
    chart.interaction?.publishes
  );
}

/** Error HTML assigned to a chart container on render failure (generated code fragment). */
export function chartErrorHtml(): string {
  return `'<div style="padding: 1rem; color: #e53e3e; background: #fff5f5; border: 1px solid #fc8181; border-radius: 4px;">⚠️ Error rendering chart: ' + (error instanceof Error ? error.message : String(error)) + '</div>'`;
}

/**
 * Wrap vg.plot (or similar) body in the standard container lookup + try/catch.
 * Prefers `.dvfc-plot` so shell titles (`h3`) are not wiped by innerHTML.
 * `body` should be the indented statements inside the try block.
 */
export function wrapChartRender(chartId: string, body: string): string {
  const containerId = `chart-${chartId}`;
  return `const __root${chartId} = document.getElementById('${containerId}');
  const container${chartId} = __root${chartId}?.querySelector('.dvfc-plot') || __root${chartId};
  if (container${chartId}) {
    try {
${body}
    } catch (error) {
      console.error('Error rendering chart ${chartId}:', error);
      container${chartId}.innerHTML = ${chartErrorHtml()};
    }
  }`;
}

/** Build vg.from(...) clause with optional filterBy. */
export function buildFromClause(
  dataSource: string,
  filterBy: string | undefined
): string {
  return filterBy
    ? `vg.from('${dataSource}', { filterBy: ${filterBy} })`
    : `vg.from('${dataSource}')`;
}

/**
 * SQL WHERE fragment from a Mosaic Selection via predicate() (Selection has no .sql).
 * Generated code expression for embedding in a template literal.
 *
 * @param filterBy Selection variable name
 * @param skipSourceExpr Optional JS expr for a clause `source` to omit (pie/donut
 *   publishers must skip their own clause so the chart does not collapse to one slice).
 */
export function filterSqlExpr(
  filterBy: string | undefined,
  skipSourceExpr?: string
): string {
  if (!filterBy) return '""';
  if (skipSourceExpr) {
    return `(() => {
        const __parts = (${filterBy}.clauses || [])
          .filter((c) => c && c.predicate != null && c.source !== ${skipSourceExpr})
          .map((c) => (typeof c.predicate === 'string' ? c.predicate : String(c.predicate)));
        return __parts.length ? 'WHERE ' + __parts.join(' AND ') : '';
      })()`;
  }
  return `(() => {
        const __pred = ${filterBy}.predicate();
        if (__pred == null || __pred === false) return '';
        const __parts = (Array.isArray(__pred) ? __pred : [__pred])
          .filter((p) => p != null && p !== true && p !== false)
          .map((p) => (typeof p === 'string' ? p : String(p)));
        return __parts.length ? 'WHERE ' + __parts.join(' AND ') : '';
      })()`;
}

/**
 * Generated code: run a SQL string via Mosaic and materialize JSON rows.
 * Default query type is Arrow Table (no .reduce / [0]); always request json.
 */
export function queryJsonRows(sqlTemplateExpr: string, resultName = 'result'): string {
  return `const __raw${resultName} = await vg.coordinator().query(\`${sqlTemplateExpr}\`, { type: 'json' });
      const ${resultName} = Array.isArray(__raw${resultName})
        ? __raw${resultName}
        : (typeof __raw${resultName}?.toArray === 'function' ? __raw${resultName}.toArray() : []);`;
}

/**
 * Wrap an async render body so it re-runs when a Selection changes.
 * Soft opacity crossfade on redraw (custom pie/KPI/table — Mosaic marks use Fixed domains).
 */
export function wrapReactiveFilterRender(
  chartId: string,
  filterBy: string | undefined,
  body: string
): string {
  const containerId = `chart-${chartId}`;
  const renderFn = `render_${chartId}`;
  const listen =
    filterBy != null
      ? `
    ${filterBy}.addEventListener('value', () => { ${renderFn}(); });`
      : '';

  return `const __root${chartId} = document.getElementById('${containerId}');
  const container${chartId} = __root${chartId}?.querySelector('.dvfc-plot') || __root${chartId};
  if (container${chartId}) {
    let __renderGen${chartId} = 0;
    const ${renderFn} = async () => {
      const __gen = ++__renderGen${chartId};
      try {
        const __fade = container${chartId}.querySelector('.dvfc-smooth');
        if (__fade) {
          __fade.classList.add('dvfc-smooth-out');
          await new Promise((r) => setTimeout(r, 140));
          if (__gen !== __renderGen${chartId}) return;
        }
${body}
        if (__gen !== __renderGen${chartId}) return;
        const __next = container${chartId}.querySelector('.dvfc-smooth');
        if (__next) {
          __next.classList.add('dvfc-smooth-in');
          requestAnimationFrame(() => { __next.classList.remove('dvfc-smooth-out'); __next.classList.add('dvfc-smooth-on'); });
        }
      } catch (error) {
        console.error('Error rendering chart ${chartId}:', error);
        container${chartId}.innerHTML = ${chartErrorHtml()};
      }
    };
    ${renderFn}();${listen}
  }`;
}
