import type { ChartSpec, InteractionConfig } from '@dvfc/core';

/**
 * Build vgplot plot-level interactors for a chart that publishes a selection.
 * - Continuous brush → intervalX / intervalY / intervalXY
 * - Categorical click → toggleX / toggleY / toggle({ channels })
 * - Scatter point rect → region (when select without interval brush)
 *
 * Interactors attach to the last mark in vg.plot(...), so call these after marks.
 */
export function buildSelectionInteractors(
  chart: ChartSpec,
  interaction: InteractionConfig | undefined,
  /** Mosaic Selection variable bound to plot interactors (may differ from filterBy composite). */
  asSelection?: string
): string[] {
  const sel = asSelection ?? interaction?.selection;
  if (!sel || !interaction) return [];

  const out: string[] = [];
  const type = chart.type;
  const xType = chart.encoding?.x?.type;
  const yType = chart.encoding?.y?.type;
  const xIsCategorical = xType === 'nominal' || xType === 'ordinal';
  const yIsCategorical = yType === 'nominal' || yType === 'ordinal';

  // Explicit brush (range) — prefer intervalXY for scatter / brushAxis xy
  if (interaction.brush) {
    if (
      interaction.brushAxis === 'xy' ||
      (type === 'scatter' && interaction.brushAxis !== 'x' && interaction.brushAxis !== 'y')
    ) {
      out.push(`vg.intervalXY({ as: ${sel} })`);
    } else if (interaction.brushAxis === 'y') {
      out.push(`vg.intervalY({ as: ${sel} })`);
    } else if (type === 'bar' && xIsCategorical) {
      // Band scales can't invert interval brushes — use click toggle instead
      out.push(`vg.toggleX({ as: ${sel} })`);
    } else {
      out.push(`vg.intervalX({ as: ${sel} })`);
    }
  }

  // Click / tile / point selection when publishing (auto for bar, heatmap, scatter)
  const select = interaction.select as
    | boolean
    | 'auto'
    | 'x'
    | 'y'
    | 'xy'
    | undefined;
  const autoClickTypes = type === 'bar' || type === 'heatmap' || type === 'scatter' || type === 'histogram';
  const wantsSelect =
    select === true ||
    select === 'auto' ||
    select === 'x' ||
    select === 'y' ||
    select === 'xy' ||
    (select !== false && !interaction.brush && autoClickTypes);

  if (wantsSelect) {
    if (type === 'heatmap' || select === 'xy') {
      out.push(`vg.toggle({ as: ${sel}, channels: ['x', 'y'] })`);
    } else if (type === 'scatter' && !interaction.brush) {
      // Drag a 2D brush on continuous axes (region requires explicit channels;
      // intervalXY is the reliable scatter crossfilter in vgplot 0.31).
      out.push(`vg.intervalXY({ as: ${sel} })`);
    } else if (select === 'y' || (type === 'bar' && yIsCategorical && !xIsCategorical)) {
      out.push(`vg.toggleY({ as: ${sel} })`);
    } else if (
      type === 'bar' ||
      type === 'histogram' ||
      select === 'x' ||
      select === true ||
      select === 'auto' ||
      (select !== false && autoClickTypes)
    ) {
      out.push(`vg.toggleX({ as: ${sel} })`);
    }
  }

  // Deduplicate while preserving order
  return [...new Set(out)];
}
