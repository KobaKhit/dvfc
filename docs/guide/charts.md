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
x: region
y: sum(sales)
brush: true
publishes: region
width: 420
height: 260
```

Inside a dash, point `data:` at a source id declared on the dash (`data: worlds`). `dataSource:` is the same binding.

`y: sum(sales)` rolls rows up in the chart. `y: bookings` plots a column that is already aggregated in SQL. The verbose `encoding:` object still works.

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

Write channels on the chart:

```yaml
x: discovery_year
y: count(planet)
```

`count(planet)`, `sum(sales)`, `avg(score)`, `min`, `max`, and `median` are the rollups. A bare name plots that column as-is. Optional type (`quantitative`, `nominal`, `ordinal`, `temporal`) and `label` still belong on an `encoding` object when you need them.

Axis gridlines are off by default.

## Interaction (on a chart)

`brush`, `publishes`, `filterBy`, `brushAxis`, and `select` can sit on the chart. The `interaction:` block is the same fields:

```yaml
brush: true
publishes: era
filterBy: era
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
