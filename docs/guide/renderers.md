# Renderers

`dvfc build -f <format>` selects the output engine.

## Matrix

| Format | Engine | Interactive | DuckDB-WASM | Typical use |
|--------|--------|-------------|-------------|-------------|
| `html` (default) | Mosaic + vgplot | Yes | Yes | Full dashes, preview |
| `html-dc` / `html-dc-static` | dc.js + crossfilter (CDN) | Yes | No | Single-file share, smooth transitions |
| `html-dc-wasm` | DuckDB → crossfilter → dc.js | Yes | Yes | Parquet/CSV via DuckDB, then dc |
| `html-static` | Vega-Lite embed | Yes (VL params) | No | Shareable VL page |
| `svg` | Vega-Lite | No | No | Docs, thumbnails |
| `png` | Vega-Lite + resvg | No | No | CI, agents |

```bash
dvfc build dash.yaml -o dist                    # html
dvfc build dash.yaml -o out.html -f html-dc-static
dvfc build dash.yaml -o dist-dc-wasm -f html-dc-wasm
dvfc build dash.yaml -f html-static -o static.html
dvfc build dash.yaml -f svg --chart trend -o trend.svg
```

## Choosing one

- **Default product path** → `html` (Mosaic)
- **No WASM, one HTML file, dc transitions** → `html-dc-static`
- **dc.js but load Parquet via DuckDB** → `html-dc-wasm`
- **Print / README images** → `svg` / `png`
- **Vega-only share link** → `html-static`

Architecture notes: [ARCHITECTURE.md](../ARCHITECTURE.md).
