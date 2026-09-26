import type { DcMarkContext } from './shared.js';
import { esc } from './shared.js';

export function generateTableMark(ctx: DcMarkContext): string {
  const { cf, el, dim, ch, x, y, color } = ctx;
  const cols = [x, y, color].filter(Boolean) as string[];
  const colExprs =
    cols.length > 0
      ? cols.map((c) => `'${esc(c)}'`).join(', ')
      : `Object.keys(${cf}.all()[0] || {})`;
  const sortKey = cols[0] ? `'${esc(cols[0])}'` : `(Object.keys(${cf}.all()[0] || {})[0])`;
  return `
  const ${dim} = ${cf}.dimension((d) => d);
  const ${ch} = new dc.DataTable('${el}');
  ${ch}
    .dimension(${dim})
    .size(50)
    .columns([${colExprs}].flat().map((c) => ({
      label: c,
      format: (d) => d[c]
    })))
    .sortBy((d) => d[${sortKey}])
    .order(d3.ascending)
    .transitionDuration(750);
  charts.push(${ch});`;
}
