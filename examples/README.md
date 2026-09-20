# Examples Gallery

Interactive chart and dash examples demonstrating dvfc capabilities.

## Canonical new-style examples

Start here for the chart/dash IR model ([docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)):

| Path | Kind |
|------|------|
| `examples/charts/revenue_trend.chart.yaml` | Atomic chart (`sql` data) |
| `examples/charts/revenue_metric.chart.yaml` | Atomic chart (`dbt_metric` fixture) |
| `examples/dashes/sales.dash.yaml` | Minimal dash (chart ref + inline chart) |

**Two “sales” dashes:** `examples/dashes/sales.dash.yaml` is the small canonical IR sample; `examples/sales-dash/sales.dash.yaml` is the full gallery demo (area, KPI, pie, heatmap, scatter, boxplot, table — sales + flights).

```bash
pnpm exec dvfc validate examples/charts/revenue_trend.chart.yaml
pnpm exec dvfc validate examples/dashes/sales.dash.yaml
pnpm exec dvfc charts types
pnpm exec dvfc build examples/charts/revenue_trend.chart.yaml --format svg
```

## Full dashboard examples (Dash IR)

Each folder has a canonical **`*.dash.yaml`**. Gallery dashes intentionally mix chart types (not just line/bar).

### 1. Sales & Flights Dashboard
**Dash:** `examples/sales-dash/sales.dash.yaml`  
**Charts:** area, number, bar, pie, heatmap, scatter, histogram, table

```bash
pnpm exec dvfc preview examples/sales-dash/sales.dash.yaml
```

---

### 2. Web Analytics Dashboard
**Dash:** `examples/web-analytics/web-analytics.dash.yaml`  
**Charts:** area, number, bar, scatter, density, heatmap, donut

```bash
pnpm exec dvfc preview examples/web-analytics/web-analytics.dash.yaml
```

---

### 3. dbt Jaffle Shop
**Dash:** `examples/dbt-jaffle/jaffle.dash.yaml`  
**Charts:** area, number, donut, pie, bar, scatter, histogram, table

```bash
pnpm exec dvfc preview examples/dbt-jaffle/jaffle.dash.yaml
```

---

### 4. Revenue Analysis with Insights
**Dash:** `examples/revenue-analysis/revenue-analysis.dash.yaml`  
**Charts:** text, number, area/line with overlays, donut, bar, scatter, heatmap, histogram

Demonstrates analysis overlays, narrative `text` charts, and shareable filter state.

```bash
pnpm exec dvfc preview examples/revenue-analysis/revenue-analysis.dash.yaml
```

---

### 5. Site gallery (hero + type catalog)
**Hero:** `examples/site-gallery/showcase.dash.yaml` — area, KPI, pie, scatter, donut, heatmap  
**Catalog:** `examples/site-gallery/cosmic-atlas.dash.yaml` — all 13 built-in types

```bash
pnpm exec dvfc preview examples/site-gallery/showcase.dash.yaml
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
pnpm exec dvfc charts extract examples/sales-dash/sales.dash.yaml -o charts/
pnpm exec dvfc normalize examples/sales-dash/sales.dash.yaml
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
