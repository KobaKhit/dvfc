import type { ChartSpec, ThemeConfig } from '@dvfc/core';
import type { GeneratorContext } from '../generator.js';

/** Commercial palette inspired by polished BI dashboards (navy / sky / sand). */
export const DEFAULT_PALETTE = {
  primary: '#1e3a5f',
  secondary: '#7ba3c9',
  accent: '#a89b8c',
  ink: '#102129',
  muted: '#607078',
  grid: '#e8eef2',
} as const;

export function themeColors(theme?: ThemeConfig): string[] {
  const defaults = [
    DEFAULT_PALETTE.primary,
    DEFAULT_PALETTE.secondary,
    DEFAULT_PALETTE.accent,
    '#4a7c9b',
    '#c4b5a0',
  ];
  if (theme?.colors?.length) return theme.colors;
  return defaults;
}

export function primaryColor(ctx: GeneratorContext): string {
  return themeColors(ctx.spec.theme)[0] || DEFAULT_PALETTE.primary;
}

export function secondaryColor(ctx: GeneratorContext): string {
  return themeColors(ctx.spec.theme)[1] || DEFAULT_PALETTE.secondary;
}

/** Resolve a constant fill/stroke from encoding.color string or theme primary. */
export function resolveConstantColor(
  encodingColor: ChartSpec['encoding'] extends infer E
    ? E extends { color?: infer C }
      ? C
      : unknown
    : unknown,
  ctx: GeneratorContext
): string | undefined {
  if (typeof encodingColor === 'string') return encodingColor;
  return primaryColor(ctx);
}

/** Pie/donut slice colors from theme (or navy→sky ramp). */
export function pieColorExpr(ctx: GeneratorContext, indexExpr: string, _lengthExpr: string): string {
  const colors = themeColors(ctx.spec.theme);
  const lit = JSON.stringify(colors);
  return `((${lit})[${indexExpr} % ${colors.length}] || \`hsl(\${210 - (${indexExpr} * 28) % 80}, 42%, \${48 - (${indexExpr} % 3) * 6}%)\`)`;
}

/**
 * Shared plot chrome: margins, axis label padding, font.
 * Heatmaps get a wide left margin so categorical y ticks don't collide with yLabel.
 */
export function plotChromeOptions(chart: ChartSpec, opts?: { heatmap?: boolean }): string[] {
  const options: string[] = [];
  const isHeatmap = opts?.heatmap || chart.type === 'heatmap';
  const left = isHeatmap ? Math.max(148, Math.round((chart.width || 480) * 0.22)) : 56;
  const bottom = isHeatmap ? 52 : 44;
  options.push(`vg.margins({ top: 28, right: 28, bottom: ${bottom}, left: ${left} })`);
  options.push(
    `vg.style({ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: '12px', color: '${DEFAULT_PALETTE.ink}' })`
  );
  if (isHeatmap) {
    options.push(`vg.colorScheme('blues')`);
    options.push(`vg.yTickPadding(8)`);
    options.push(`vg.xTickPadding(6)`);
  }
  return options;
}

/**
 * Keep scale domains stable across crossfilter updates (Mosaic idiom).
 * Prevents axes from jumping when filters change — much closer to dc.js feel
 * even though vgplot/Plot re-render SVG without geometry tweening.
 */
export function stableFilterScaleOptions(chart: ChartSpec): string[] {
  const t = chart.type;
  const out: string[] = [];
  const color = chart.encoding?.color;
  const hasColorField = typeof color === 'object' && color != null && 'field' in color;

  switch (t) {
    case 'bar':
    case 'histogram':
    case 'line':
    case 'area':
    case 'scatter':
    case 'density':
    case 'boxplot':
      out.push('vg.xDomain(vg.Fixed)');
      out.push('vg.yDomain(vg.Fixed)');
      break;
    case 'heatmap':
      out.push('vg.xDomain(vg.Fixed)');
      out.push('vg.yDomain(vg.Fixed)');
      out.push('vg.colorDomain(vg.Fixed)');
      break;
    default:
      break;
  }

  if (hasColorField && t !== 'heatmap' && (t === 'scatter' || t === 'line' || t === 'area' || t === 'bar')) {
    out.push('vg.colorDomain(vg.Fixed)');
  }

  return out;
}

/** Mark tip option for Observable Plot / Mosaic. */
export const TIP_OPTION = 'tip: true';

/**
 * Tip option for a mark. Omit tip when the plot uses click toggles:
 * Observable Plot sticky tips call stopImmediatePropagation on pointerdown,
 * which blocks Mosaic toggleX / toggle on the first click.
 */
export function markTipOption(hasClickToggle: boolean): string | undefined {
  if (hasClickToggle) return undefined;
  return TIP_OPTION;
}

/** True when generated interactors include a click toggle (not interval brush). */
export function interactorsIncludeClickToggle(interactors: string[]): boolean {
  return interactors.some((i) => /\btoggle(?:X|Y|Z|Color)?\s*\(/.test(i));
}
