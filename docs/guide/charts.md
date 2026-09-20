# Charts

A **chart** is the atomic unit: one mark, one data binding, optional interaction.

File convention: `*.chart.yaml` (also `.toml` / `.json`).

## Anatomy

```yaml
id: by_region
type: bar
title: Sales by region
data:
  type: csv
  path: sales.csv
encoding:
  x: { field: region, type: nominal, label: Region }
  y: { field: sales, type: quantitative, aggregate: sum, label: Sales }
interaction:
  brush: true
  publishes: region
width: 420
height: 260
```

When the chart sits inside a dash, use `dataSource: <id>` instead of inline `data` and declare sources on the dash.

## Built-in types

| Type | Notes |
|------|--------|
| `line` | Time / ordered series; brushable |
| `bar` | Categorical aggregates |
| `area` | Filled series |
| `scatter` | Point clouds; brush |
| `pie` / `donut` | Part-to-whole |
| `heatmap` | 2D categorical / density |
| `histogram` | Binned quantitative |
| `boxplot` | Distribution (Mosaic) |
| `density` | Continuous density (Mosaic) |
| `number` | KPI / big number |
| `table` | Tabular rows |
| `text` | Narrative / Markdown block |

List plugins at runtime: `dvfc charts types`.

## Encoding

Common channels: `x`, `y`, `color`, plus type (`quantitative`, `nominal`, `ordinal`, `temporal`) and `aggregate` (`sum`, `count`, `avg`, …).

## Interaction (on a chart)

```yaml
interaction:
  brush: true          # enable brush / click select
  brushAxis: x         # optional
  publishes: era       # selection name others can filterBy
  filterBy: era        # subscribe to a selection
  select: auto         # point / interval heuristics
```

See [Interaction](interaction.md).

## Validate & export

```bash
dvfc validate path/to/chart.yaml
dvfc build path/to/chart.yaml -f svg -o out.svg
dvfc build path/to/chart.yaml -f png -o out.png
dvfc build path/to/chart.yaml -f html-static -o out.html
```

Multi-chart dashes need `--chart <id>` for `svg` / `png`.

## Extending

Implement a chart module and register it — [Add a chart type](../add-chart-type.md).
