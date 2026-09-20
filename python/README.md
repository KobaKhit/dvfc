# dvfc Python SDK

Author **Chart** / **Dash** IR in Python. Validate and compile `dbt_metric` SQL **without Node**.  
Interactive HTML (Mosaic) and the full CLI pipeline still use the Node `dvfc` binary when you call `build()`.

## Install

```bash
# From this directory (editable)
pip install -e .

# Extras
pip install -e ".[render]"       # in-process SVG/PNG via vl-convert
pip install -e ".[metricflow]"   # try in-process MetricFlow APIs
pip install -e ".[all]"

# PyPI (when published)
pip install dvfc
# or: uv add dvfc
```

Requires Python 3.9+.

## Quick start (pure Python)

```python
from dvfc import ChartBuilder, ChartType, DashBuilder, validate, save_spec, compile_dbt_metric

chart = (
    ChartBuilder("revenue_trend", ChartType.LINE)
    .title("Daily revenue")
    .data_file("../sales-board/dbt-stub/sales_daily.csv")
    .x("date", type="temporal")
    .y("sales", type="quantitative", aggregate="sum")
    .brush("x", "time")
    .size(600, 250)
    .build()
)

assert validate(chart).valid
save_spec(chart, "revenue_trend.chart.yaml")

# dbt_metric → SQL (fixture, then MetricFlow Python API, then mf CLI)
sql, source = compile_dbt_metric("total_revenue", spec_dir=Path("examples/charts"))
print(source, sql[:80])
```

```python
from pathlib import Path
from dvfc import load_dash, DataVizFactoryClient

dash = load_dash(Path("examples/sales-board/sales.dash.yaml"))
client = DataVizFactoryClient()
assert client.validate(dash)  # native by default

# Needs Node CLI on PATH (or monorepo packages/cli/dist)
client.build(dash, out_dir="dist", format="html")
```

## What is native vs CLI

| Capability | Pure Python | Needs Node `dvfc` |
|---|---|---|
| `validate` / `load_spec` / `save_spec` | ✓ | |
| `ChartBuilder` / `DashBuilder` | ✓ | |
| `compile_dbt_metric` | ✓ (fixture → MF Python → `mf`/`dbt sl` CLI) | |
| `dvfc.render` SVG/PNG | ✓ with `dvfc[render]` | |
| Mosaic HTML / full `build()` | | ✓ |

## CLI helper

```bash
dvfc-py validate examples/charts/revenue_trend.chart.yaml
dvfc-py compile-metric total_revenue --spec-dir examples/charts
```

## MetricFlow

Same resolution order as the Node stack (see `docs/dbt-metrics.md`):

1. `semantic/<metric>.sql` fixtures  
2. In-process MetricFlow (`pip install dvfc[metricflow]`) when the installed API matches your project  
3. `mf query --explain` or `dbt sl query --compile`

Env: `DVFC_METRICFLOW_BIN`, `DVFC_METRICFLOW_MODE`, `DVFC_DBT_PROJECT`, `DVFC_METRICFLOW_CACHE`, `DVFC_METRICFLOW_SKIP`.

## Optional in-process charts

```python
from dvfc.render import render_svg
from dvfc import ChartBuilder, ChartType

chart = ChartBuilder("c", ChartType.BAR).data_file("x.csv").x("region").y("sales", aggregate="sum").build()
svg = render_svg(chart, [{"region": "East", "sales": 10}])
```

## Legacy `DashboardBuilder`

Still available for older fluent board-shaped specs; prefer `ChartBuilder` / `DashBuilder` for new code.
