/**
 * Shared dash grid math. Mosaic, dc.js, and Vega all use this so
 * `layout.rows` (for example [3, 2]) lands in the same places.
 */

import type { LayoutConfig } from './types.js';

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/** Column count plus per-cell span. `rows: [3, 2]` → 6 columns, spans 2,2,2,3,3. */
export function resolveGridLayout(layout: LayoutConfig | undefined): {
  columns: number;
  spans: number[] | null;
} {
  const rows = layout?.rows;
  if (rows && rows.length > 0) {
    const columns = rows.reduce((acc, n) => lcm(acc, n), rows[0]);
    const spans: number[] = [];
    for (const n of rows) {
      const span = columns / n;
      for (let i = 0; i < n; i++) spans.push(span);
    }
    return { columns, spans };
  }
  return { columns: layout?.columns || 2, spans: null };
}

/** Compact auto rows for KPI/text strips; plot rows grow to fill the frame. */
export function embedRowTracks(
  layout: LayoutConfig | undefined,
  charts: { type: string }[]
): string {
  const rows = layout?.rows;
  if (!rows?.length) return 'minmax(0, 1fr)';
  let offset = 0;
  return rows
    .map((n) => {
      const slice = charts.slice(offset, offset + n);
      offset += n;
      const compact =
        slice.length > 0 && slice.every((c) => c.type === 'number' || c.type === 'text');
      return compact ? 'auto' : 'minmax(0, 1fr)';
    })
    .join(' ');
}
