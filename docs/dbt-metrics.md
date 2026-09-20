# dbt semantic metrics (`dbt_metric`)

dvfc does **not** define a metric DSL. Semantic metrics come from **dbt / MetricFlow**; dvfc binds charts to compiled SQL via the `dbt_metric` data connector.

## Chart data shape

```yaml
id: revenue_metric
type: line
title: Revenue (dbt_metric fixture)
data:
  type: dbt_metric
  metric: total_revenue
encoding:
  x: { field: date, type: temporal }
  y: { field: revenue, type: quantitative, aggregate: sum }
```

Resolution looks up metric SQL (live MetricFlow compile when configured, or a **checked-in fixture** for CI and offline use).

## Fixture workflow (recommended for examples)

1. **Compile metric SQL** in your dbt project (MetricFlow / semantic layer), or hand-author SQL that matches the metric grain.
2. **Save SQL** next to the chart under a `semantic/` directory:

   ```
   examples/charts/
   ├── revenue_metric.chart.yaml
   └── semantic/
       └── total_revenue.sql
   ```

3. **Name the file** after the metric id referenced in the chart (`metric: total_revenue` → `semantic/total_revenue.sql`).

4. **Validate and build**:

   ```bash
   pnpm exec dvfc validate examples/charts/revenue_metric.chart.yaml
   pnpm exec dvfc build examples/charts/revenue_metric.chart.yaml --format svg
   ```

The resolver in `@dvfc/core` / `@dvfc/resolve` loads fixture SQL when live semantic compilation is unavailable. Errors are path-aware (`metric X not found`, grain mismatch).

## dbt model connector (contrast)

Dashboard-style examples often use **`type: dbt`** with `model:` pointing at stub CSV-backed models in `dbt-stub/`:

```yaml
data:
  - id: sales_daily
    type: dbt
    model: sales_daily
```

Use **`dbt_metric`** when the grain and measure definitions live in the semantic layer; use **`dbt`** for table-shaped models.

## Dash-level data

Dash files can declare shared `data:` entries; inline charts reference them with `dataSource:`. Atomic charts embed `data:` on the chart root (see `revenue_metric.chart.yaml`).

## Python SDK

```python
from dvfc import DataVizFactoryClient

client = DataVizFactoryClient()
client.validate("examples/charts/revenue_metric.chart.yaml")
client.build("examples/charts/revenue_metric.chart.yaml", format="svg")
```

## Further reading

- [ADR 001 — No metric language](./adr/001-no-metric-language.md)
- [dbt-integration.md](./dbt-integration.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md) — `DataRef` connectors
