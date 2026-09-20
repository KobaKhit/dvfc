# dbt semantic metrics (`dbt_metric`)

dvfc does **not** define a metric DSL. Semantic metrics come from **dbt / MetricFlow**; charts bind via `data.type: dbt_metric`.

## Chart data shape

```yaml
id: revenue_metric
type: line
title: Revenue
data:
  type: dbt_metric
  metric: total_revenue
  group_by: [metric_time]   # optional; default metric_time
  # where: "..."            # optional MetricFlow where
encoding:
  x: { field: date, type: temporal }
  y: { field: revenue, type: quantitative, aggregate: sum }
```

## Resolution order

1. **Fixture SQL** (CI / offline): `semantic/<metric>.sql` or `metrics/<metric>.sql` next to the chart, under the project root, or under `dbt-stub/semantic/`.
2. **Live MetricFlow invoke** when no fixture exists:
   - **dbt Core / OSS:** `mf query --metrics <m> --group-by … --explain`
   - **dbt platform:** `dbt sl query --metrics <m> --group-by … --compile`

```bash
# Ensure semantic manifest exists
dbt parse

# Smoke the same SQL dvfc will request
mf query --metrics total_revenue --group-by metric_time --explain
```

### Environment

| Var | Meaning |
|-----|---------|
| `DVFC_METRICFLOW_BIN` | Binary override (`mf`, `dbt`, or a wrapper script) |
| `DVFC_METRICFLOW_MODE` | `mf` \| `dbt-sl` \| `auto` (default) |
| `DVFC_DBT_PROJECT` | dbt project root (else walk parents for `dbt_project.yml`) |
| `DVFC_METRICFLOW_CACHE` | `1` → write compiled SQL to `semantic/<metric>.sql` |
| `DVFC_METRICFLOW_SKIP` | `1` → fixtures only (no live CLI) |

API: `compileDbtMetricSql` / `invokeMetricFlow` in `@dvfc/resolve` (and `@dvfc/core`).

## Fixture workflow

```
examples/charts/
├── revenue_metric.chart.yaml
└── semantic/
    └── total_revenue.sql
```

```bash
pnpm exec dvfc validate examples/charts/revenue_metric.chart.yaml
pnpm exec dvfc build examples/charts/revenue_metric.chart.yaml --format svg
```

## Contrast: `dbt` model connector

```yaml
data:
  - id: sales_daily
    type: dbt
    model: sales_daily
```

Use **`dbt_metric`** for semantic measures; **`dbt`** for table-shaped models / stub CSVs.

## Further reading

- [ADR 001 — No metric language](./adr/001-no-metric-language.md)
- [dbt MetricFlow commands](https://docs.getdbt.com/docs/build/metricflow-commands)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
