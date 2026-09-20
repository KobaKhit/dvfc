# dvfc documentation

**dvfc** (Data Viz Factory) turns chart and dash YAML into interactive dashboards.
You describe what to show; dvfc compiles it to Mosaic + DuckDB-WASM, Vega-Lite, or dc.js — no app backend required.

Live demos: [kobakhit.github.io/dvfc](https://kobakhit.github.io/dvfc/) · Source: [GitHub](https://github.com/KobaKhit/dvfc)

## What is it for?

### Reporting & dashboards

Ship polished, crossfiltered dashes from Git. Specs live next to your data and dbt models; `dvfc build` emits static HTML you can host anywhere.

### Exploration & agents

Validate, preview, and compose charts from the CLI or MCP. YAML is easy for humans and coding agents to write, review, and refine.

## How it works

1. **Write** a `*.chart.yaml` or `*.dash.yaml` (data + encodings + optional interaction)
2. **Validate** with `dvfc validate`
3. **Preview** or **build** — Mosaic HTML (default), dc.js, or Vega SVG/PNG/static HTML
4. **Interact** — brushes and clicks filter linked charts in the browser

## Quick example

Minimal dash with inline CSV and linked brushing (same idea as gallery demos):

```yaml
id: hello
title: Hello dvfc
data:
  - id: sales
    type: csv
    path: sales.csv
charts:
  - id: by_region
    type: bar
    dataSource: sales
    encoding:
      x: { field: region, type: nominal }
      y: { field: amount, type: quantitative, aggregate: sum }
    interaction:
      brush: true
      publishes: region
  - id: total
    type: number
    dataSource: sales
    encoding:
      y: { field: amount, aggregate: sum }
    interaction:
      filterBy: region
layout:
  type: grid
  columns: 2
```

```bash
pnpm exec dvfc preview hello.dash.yaml
pnpm exec dvfc build hello.dash.yaml -o dist --format html
```

## Why dvfc

- **YAML is the source of truth** — version-controlled, reviewable in PRs
- **Crossfiltering built in** — Mosaic selections, Vega params, or dc.js crossfilter
- **Multiple renderers** — `html` (DuckDB-WASM), `html-dc` / `html-dc-static`, `html-dc-wasm`, `html-static`, `svg`, `png`
- **dbt-aware** — resolve models from a manifest; metrics via MetricFlow helpers
- **Agent-friendly** — CLI + MCP tools for validate / build / compose / search

## What you need to know

- Basic **YAML** and your data (CSV, Parquet, SQL, or dbt models)
- Optional: **dbt**, **Git**, comfort with a terminal

You do **not** need to write React, Mosaic, or Vega by hand for standard dashes.

## Get started

- [Quickstart](quickstart.md) — install, preview, build
- [Charts](guide/charts.md) · [Dashes](guide/dashes.md) · [Interaction](guide/interaction.md)
- [Renderers](guide/renderers.md) · [CLI](guide/cli.md) · [MCP](guide/mcp.md)
- [Examples](guide/examples.md) · [dbt integration](dbt-integration.md)
