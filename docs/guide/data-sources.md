# Data sources

Declared on a dash (`data:`) or inline on a chart (`data:`).

## Types

| `type` | Use |
|--------|-----|
| `csv` | Local CSV path (copied into build `data/`) |
| `parquet` | Local Parquet (Mosaic / `html-dc-wasm`) |
| `url` | Remote `http(s)` CSV or Parquet |
| `sql` | SQL string; file refs rewritten to browser URLs for WASM |
| `dbt` | `model:` resolved via dbt stub / manifest |

```yaml
data:
  - id: worlds
    type: csv
    path: exoplanets.csv
  - id: orders
    type: dbt
    model: orders
```

Charts bind a dash source with `data: worlds` (`dataSource: worlds` is the same id).

## Build-time staging

`normalizeFile` copies assets beside the output. Mosaic and `html-dc-wasm` load them at runtime via DuckDB readers; `html-dc-static` and `html-static` parse CSV at build time and inline rows.

## dbt

See [dbt integration](../dbt-integration.md) and [dbt metrics](../dbt-metrics.md). Place `dbt-stub/` (manifest + seed CSV/parquet) next to the spec for local demos.
