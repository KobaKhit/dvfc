import type { ThemeConfig } from './types.js';

/**
 * Default categorical palette shared by every renderer.
 * Navy / sky / sand ramp — the same ramp shipped as `theme.colors`
 * in the gallery example specs.
 */
export const DEFAULT_CATEGORICAL: readonly string[] = [
  '#1e3a5f',
  '#7ba3c9',
  '#a89b8c',
  '#4a7c9b',
  '#c4b5a0',
  '#5c6b73',
];

/**
 * Resolve the categorical palette for a dash: explicit `theme.colors`
 * wins, otherwise the shared default. Always returns a fresh array.
 */
export function resolvePalette(theme?: ThemeConfig | readonly string[]): string[] {
  // NB: Array.isArray does not narrow readonly arrays out of a union,
  // so read .colors through a cast on the non-array branch.
  const colors: readonly string[] | undefined = Array.isArray(theme)
    ? theme
    : (theme as ThemeConfig | undefined)?.colors;
  return colors?.length ? [...colors] : [...DEFAULT_CATEGORICAL];
}
