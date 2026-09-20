# dvfc Python SDK

Author **Chart** / **Dash** IR in Python. Validate and compile `dbt_metric` SQL **without Node**.  
Interactive HTML (Mosaic) and the full CLI pipeline still use the Node `dvfc` binary when you call `build()`.

## Install

Use **[uv](https://docs.astral.sh/uv/)** (preferred):

```bash
# From this directory
uv sync --extra dev          # create .venv + install editable package
uv run pytest -q
uv run dvfc-py --help

# Extras (pick what you need)
uv sync --extra render       # in-process SVG/PNG via vl-convert
uv sync --extra metricflow   # try in-process MetricFlow APIs
uv sync --extra all

# Add to another uv project
uv add dvfc
# or with extras: uv add "dvfc[render,metricflow]"
```

`pip install -e .` still works if you must; prefer `uv` for local and CI.

Requires Python 3.9+.

## Quick start (pure Python)

```python
from dvfc import ChartBuilder, ChartType, DashBuilder, validate, save_spec, compile_dbt_metric

chart = (
    ChartBuilder("revenue_trend", ChartType.LINE)
    .title("Daily revenue")
    .data_file("../sales-dash/dbt-stub/sales_daily.csv")  # path relative to your chart file
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

dash = load_dash(Path("examples/sales-dash/sales.dash.yaml"))
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
2. In-process MetricFlow (`uv add 'dvfc[metricflow]'` / `uv sync --extra metricflow`) when the installed API matches your project  
3. `mf query --explain` or `dbt sl query --compile`

Env: `DVFC_METRICFLOW_BIN`, `DVFC_METRICFLOW_MODE`, `DVFC_DBT_PROJECT`, `DVFC_METRICFLOW_CACHE`, `DVFC_METRICFLOW_SKIP`.

## Optional in-process charts

```python
from dvfc.render import render_svg
from dvfc import ChartBuilder, ChartType

chart = ChartBuilder("c", ChartType.BAR).data_file("x.csv").x("region").y("sales", aggregate="sum").build()
svg = render_svg(chart, [{"region": "East", "sales": 10}])
```

## Legacy board-shaped specs

- Prefer **`ChartBuilder`** / **`DashBuilder`** and Chart/Dash IR for all new work.
- **`DashboardSpec`** and **`DashboardBuilder`** remain in `dvfc.spec` / `dvfc.builder` for older fluent board YAML; they are not exported from `dvfc` top-level. Import explicitly only when migrating legacy specs:

```python
from dvfc.builder import DashboardBuilder  # emits DeprecationWarning
```
