# Dashes

A **dash** composes charts, shared data sources, layout, and coordination.

File convention: `*.dash.yaml`.

## Anatomy

```yaml
id: sales-dash
title: Sales overview
description: Crossfiltered sales
coordination:
  auto: true
data:
  - id: sales_daily
    type: csv
    path: sales_daily.csv
charts:
  - id: trend
    type: area
    data: sales_daily
    x: date
    y: sum(sales)
    brush: true
    publishes: time
  - id: kpi
    type: number
    data: sales_daily
    y: sum(sales)
    filterBy: time
layout:
  type: grid
  columns: 2
  gap: 16
```

## Chart refs vs inline

- **Inline** — full chart object under `charts:` (gallery examples do this)
- **Library ref** — `{ chart: revenue_trend }` after discovery / extract (see [chart discovery](../chart-discovery.md))

```bash
dvfc charts extract my.dash.yaml -o charts/
dvfc dash compose --charts a,b,c -o composed.dash.yaml
```

## Layout

```yaml
layout:
  type: grid   # or flex
  columns: 2
  gap: 16
```

## Coordination

`coordination.auto: true` enables default crossfilter wiring from `publishes` / `filterBy`. Details: [Interaction](interaction.md).

## Commands

```bash
dvfc validate my.dash.yaml
dvfc preview my.dash.yaml
dvfc build my.dash.yaml -o dist
dvfc build my.dash.yaml -o dist-dc.html --format html-dc-static
dvfc export-pdf my.dash.yaml -o report.pdf   # optional Playwright
```
