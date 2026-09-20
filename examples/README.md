# Examples Gallery

Interactive chart and dash examples demonstrating dvfc capabilities.

## Canonical new-style examples

Start here for the chart/dash IR model ([docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)):

| Path | Kind |
|------|------|
| `examples/charts/revenue_trend.chart.yaml` | Atomic chart (`sql` data) |
| `examples/charts/revenue_metric.chart.yaml` | Atomic chart (`dbt_metric` fixture) |
| `examples/dashes/sales.dash.yaml` | Dash with chart ref + inline chart |

```bash
pnpm exec dvfc validate examples/charts/revenue_trend.chart.yaml
pnpm exec dvfc validate examples/dashes/sales.dash.yaml
pnpm exec dvfc charts types
pnpm exec dvfc build examples/charts/revenue_trend.chart.yaml --format svg
```

## Full dashboard examples (Dash IR)

Each folder has a canonical **`*.dash.yaml`**.

### 1. Sales & Flights Dashboard
**Dash:** `examples/sales-board/sales.dash.yaml`  
**Charts:** 6 (3 sales, 3 flights)

```bash
pnpm exec dvfc preview examples/sales-board/sales.dash.yaml
```

---

### 2. Web Analytics Dashboard
**Dash:** `examples/web-analytics/web-analytics.dash.yaml`  
**Charts:** 6 (3 traffic, 3 conversions)

```bash
pnpm exec dvfc preview examples/web-analytics/web-analytics.dash.yaml
```

---

### 3. dbt Jaffle Shop
**Dash:** `examples/dbt-jaffle/jaffle.dash.yaml`  
**Charts:** 4 (revenue trends, payment methods, customers, status)

```bash
pnpm exec dvfc preview examples/dbt-jaffle/jaffle.dash.yaml
```

---

### 4. Revenue Analysis with Insights
**Dash:** `examples/revenue-analysis/revenue-analysis.dash.yaml`  
**Charts:** 7 (3 narrative text blocks, 4 analytical charts)

Demonstrates analysis overlays, `type: text` charts, and shareable filter state.

```bash
pnpm exec dvfc preview examples/revenue-analysis/revenue-analysis.dash.yaml
```

---

## Common Commands

### Validate
```bash
pnpm exec dvfc validate examples/<example>/<name>.dash.yaml
pnpm exec dvfc validate examples/charts/revenue_trend.chart.yaml
```

### Preview with hot reload
```bash
pnpm exec dvfc preview examples/<example>/<name>.dash.yaml
```

### Build static HTML
```bash
pnpm exec dvfc build examples/<example>/<name>.dash.yaml --out-dir dist/<example>
```

### Compose / extract
```bash
pnpm exec dvfc dash compose --charts revenue_trend,by_region -o my.dash.yaml
pnpm exec dvfc charts extract examples/sales-board/sales.dash.yaml -o charts/
pnpm exec dvfc normalize examples/sales-board/sales.dash.yaml
```

## Example Structure

```
examples/<name>/
├── <name>.dash.yaml     # Dash IR (canonical)
├── README.md            # Example-specific docs
└── dbt-stub/
    ├── manifest.json
    └── *.csv
```

## Creating Your Own

1. Copy `examples/charts/` or `examples/dashes/` as a template, or copy a full example folder.
2. Author `*.chart.yaml` atoms and/or a `*.dash.yaml` with `coordination.auto`.
3. Add CSV files and update `dbt-stub/manifest.json` if using dbt connectors.
4. Validate and preview:

```bash
pnpm exec dvfc validate my.dash.yaml
pnpm exec dvfc preview my.dash.yaml
```

## Learn More

- [Main README](../README.md)
- [docs/add-chart-type.md](../docs/add-chart-type.md)
- [docs/dbt-metrics.md](../docs/dbt-metrics.md)
- [Mosaic Docs](https://idl.uw.edu/mosaic/)
