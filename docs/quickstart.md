# Quickstart

Get from zero to a crossfiltered dash in a few minutes.

## Install

```bash
git clone https://github.com/KobaKhit/dvfc.git
cd dvfc
pnpm install
pnpm build
```

Requires **Node 18+** and **pnpm 8+**.

## Preview an example

```bash
pnpm exec dvfc preview examples/site-gallery/showcase.dash.yaml
```

Opens a Mosaic + DuckDB-WASM dashboard (default). Brush the timeline; linked charts update.

Other gallery dashes:

```bash
pnpm exec dvfc preview examples/sales-dash/sales.dash.yaml
pnpm exec dvfc preview examples/web-analytics/web-analytics.dash.yaml
```

## Build outputs

```bash
# Interactive Mosaic (DuckDB-WASM)
pnpm exec dvfc build examples/site-gallery/showcase.dash.yaml -o dist/showcase

# dc.js single-file HTML (CDN + inlined CSV)
pnpm exec dvfc build examples/site-gallery/showcase.dash.yaml \
  -o dist/showcase-dc.html --format html-dc-static

# Vega-Lite SVG for one chart
pnpm exec dvfc build examples/site-gallery/showcase.dash.yaml \
  -f svg --chart discovery_timeline -o dist/timeline.svg
```

See [Renderers](guide/renderers.md) for the full format matrix.

## Your first chart file

`revenue.chart.yaml`:

```yaml
id: revenue_trend
type: line
title: Revenue
data:
  type: csv
  path: revenue.csv
encoding:
  x: { field: date, type: temporal }
  y: { field: revenue, type: quantitative, aggregate: sum }
```

```bash
pnpm exec dvfc validate revenue.chart.yaml
pnpm exec dvfc build revenue.chart.yaml -f svg -o revenue.svg
```

## Your first dash

Compose charts (inline or by ref), add `interaction.publishes` / `filterBy`, then preview:

```bash
pnpm exec dvfc validate my.dash.yaml
pnpm exec dvfc preview my.dash.yaml
```

Details: [Dashes](guide/dashes.md), [Interaction](guide/interaction.md).

## Next steps

- [CLI reference](guide/cli.md)
- [dbt models](dbt-integration.md)
- [MCP for Cursor / agents](guide/mcp.md)
- [Live demos](https://kobakhit.github.io/dvfc/)
