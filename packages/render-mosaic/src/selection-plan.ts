/**
 * Plan Mosaic Selection declarations for a dashboard.
 *
 * Multiple charts that publish into the same logical selection name (e.g. era)
 * each get their own crossfilter Selection; a composite Selection.crossfilter({ include })
 * merges them for filterBy subscribers while still skipping the active publisher
 * (so a brushed timeline is not self-filtered).
 *
 * Interactors / highlight bind to the per-chart var so mosaic-plot Highlight never
 * projects foreign intervalXY predicates into SELECT on aggregate marks.
 */

import type { ChartSpec, DashboardSpec } from '@dvfc/core';
import { buildSelectionInteractors } from './charts/interaction.js';

export interface SelectionPlan {
  /** Mosaic `const …` declarations (inside createDashboard). */
  declarations: string;
  /** Logical selection names to persist in the URL (composite vars). */
  urlSelectionNames: string[];
  /** JS variable for plot interactors on this chart, if it publishes. */
  publishVar(chart: ChartSpec): string | undefined;
  /** JS variable for vg.from({ filterBy }) / predicate() on this chart. */
  filterVar(chart: ChartSpec): string | undefined;
}

/** Logical selection name this chart publishes (`selection` or `publishes`). */
function publishedName(chart: ChartSpec): string | undefined {
  const i = chart.interaction;
  if (!i) return undefined;
  return i.selection ?? i.publishes;
}

function chartPublishes(chart: ChartSpec): boolean {
  const logical = publishedName(chart);
  if (!logical) return false;
  // Custom SVG pie/donut publish via clausePoint clicks (not vgplot interactors)
  if (chart.type === 'pie' || chart.type === 'donut') {
    return chart.interaction?.select !== false;
  }
  return buildSelectionInteractors(chart, chart.interaction, logical).length > 0;
}

export function buildSelectionPlan(spec: DashboardSpec): SelectionPlan {
  const logicalNames = new Set<string>();
  for (const chart of spec.charts) {
    const i = chart.interaction;
    const pub = publishedName(chart);
    if (pub) logicalNames.add(pub);
    if (i?.filterBy) logicalNames.add(i.filterBy);
  }

  const publishersByLogical = new Map<string, ChartSpec[]>();
  for (const chart of spec.charts) {
    const logical = publishedName(chart);
    if (!logical || !chartPublishes(chart)) continue;
    const list = publishersByLogical.get(logical) ?? [];
    list.push(chart);
    publishersByLogical.set(logical, list);
  }

  const publishVarByChartId = new Map<string, string>();
  const filterVarByLogical = new Map<string, string>();
  const lines: string[] = [];

  for (const logical of logicalNames) {
    const pubs = publishersByLogical.get(logical) ?? [];
    const needsVar =
      spec.charts.some((c) => c.interaction?.filterBy === logical) || pubs.length > 0;

    if (!needsVar) continue;

    if (pubs.length <= 1) {
      if (pubs.length === 1) {
        publishVarByChartId.set(pubs[0].id, logical);
      }
      lines.push(`const ${logical} = vg.Selection.crossfilter();`);
      filterVarByLogical.set(logical, logical);
    } else {
      const parts: string[] = [];
      for (const chart of pubs) {
        const v = `${logical}__${chart.id}`;
        lines.push(`const ${v} = vg.Selection.crossfilter();`);
        publishVarByChartId.set(chart.id, v);
        parts.push(v);
      }
      // crossfilter parent so active publisher is skipped when filtering itself
      lines.push(
        `const ${logical} = vg.Selection.crossfilter({ include: [${parts.join(', ')}] });`
      );
      filterVarByLogical.set(logical, logical);
    }
  }

  return {
    declarations: lines.join('\n    '),
    urlSelectionNames: [...filterVarByLogical.keys()],
    publishVar(chart) {
      return publishVarByChartId.get(chart.id);
    },
    filterVar(chart) {
      const logical = chart.interaction?.filterBy;
      if (!logical) return undefined;
      return filterVarByLogical.get(logical) ?? logical;
    },
  };
}
