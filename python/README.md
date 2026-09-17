# coordboard Python SDK

Python SDK for building analytics dashboards with Mosaic + dbt.

## Installation

```bash
pip install -e .
```

Or from repository root:

```bash
pip install -e python/
```

## Quick Start

### Example 1: Simple Dashboard

```python
from coordboard import DashboardBuilder, ChartType

# Create a dashboard
dashboard = (
    DashboardBuilder("Sales Dashboard", "Revenue and product analysis")
    .add_dbt_source("sales", "sales_daily")
    .add_chart(
        dashboard.chart("revenue_trend", ChartType.LINE, "sales")
        .title("Daily Revenue")
        .x("date", type="temporal", label="Date")
        .y("revenue", type="quantitative", aggregate="sum", label="Revenue ($)")
        .brush("x", "dateBrush")
        .size(700, 250)
        .build()
    )
    .add_chart(
        dashboard.chart("by_region", ChartType.BAR, "sales")
        .title("Revenue by Region")
        .x("region", type="nominal", label="Region")
        .y("revenue", type="quantitative", aggregate="sum", label="Revenue ($)")
        .filter_by("dateBrush")
        .size(700, 300)
        .build()
    )
    .layout("flex", gap=24)
    .build()
)

# Build to HTML
from coordboard import CoordboardClient

client = CoordboardClient()
html_path = client.build(dashboard, out_dir="dist")
print(f"Dashboard built: {html_path}")
```

### Example 2: Load and Modify

```python
from coordboard import CoordboardClient
from pathlib import Path

client = CoordboardClient()

# Load existing spec
spec_path = Path("examples/sales-board/board.yaml")

# Validate
if client.validate(spec_path):
    print("✓ Valid spec")
    
    # Build
    html = client.to_html(spec_path, out_path="my-dashboard.html")
    print(f"Built {len(html)} bytes")
```

### Example 3: Programmatic Spec

```python
from coordboard import (
    DashboardSpec,
    MetaSpec,
    DataSource,
    DataSourceType,
    ChartSpec,
    ChartType,
    Encoding,
    EncodingChannel,
)

spec = DashboardSpec(
    meta=MetaSpec(title="Analytics", description="My dashboard"),
    data=[
        DataSource(id="sales", type=DataSourceType.DBT, model="sales_daily")
    ],
    charts=[
        ChartSpec(
            id="trend",
            type=ChartType.LINE,
            dataSource="sales",
            title="Sales Trend",
            encoding=Encoding(
                x=EncodingChannel(field="date", type="temporal"),
                y=EncodingChannel(field="revenue", aggregate="sum"),
            ),
        )
    ],
)

client = CoordboardClient()
yaml_str = client.to_yaml(spec)
print(yaml_str)
```

## API Reference

### `DashboardBuilder`

Fluent API for building dashboard specifications.

**Methods:**
- `add_dbt_source(id, model)` - Add dbt data source
- `add_csv_source(id, path)` - Add CSV data source
- `chart(id, type, data_source)` - Create chart builder
- `add_chart(chart_spec)` - Add pre-built chart
- `layout(type, gap)` - Set layout (flex/grid)
- `theme(colors, font_family)` - Set theme
- `build()` - Build final spec

### `ChartBuilder`

Fluent API for building chart specifications.

**Methods:**
- `title(title)` - Set chart title
- `x(field, type, aggregate, label)` - Set x encoding
- `y(field, type, aggregate, label)` - Set y encoding
- `color(color)` - Set color
- `size(width, height)` - Set dimensions
- `brush(axis, selection)` - Add brush interaction
- `filter_by(selection)` - Add filter interaction
- `build()` - Build chart spec

### `CoordboardClient`

Client for building and validating dashboards.

**Methods:**
- `__init__(cli_path=None)` - Initialize client
- `build(spec, out_dir, minify)` - Build to static HTML
- `validate(spec)` - Validate spec
- `to_yaml(spec)` - Convert to YAML
- `to_json(spec)` - Convert to JSON
- `to_html(spec, out_path, minify)` - Build and return HTML

**Spec Types:**
- Accepts `DashboardSpec` object, YAML path, or JSON path
- Auto-detects and converts as needed

## Jupyter Example

See [example.ipynb](./example.ipynb) for interactive notebook usage.

```python
# In Jupyter
from coordboard import DashboardBuilder, ChartType, CoordboardClient

dashboard = (
    DashboardBuilder("My Dashboard")
    .add_csv_source("data", "data.csv")
    .chart("viz", ChartType.BAR, "data")
    .x("category", type="nominal")
    .y("value", aggregate="sum")
    .build()
    .build()
)

client = CoordboardClient()
html = client.to_html(dashboard)

from IPython.display import HTML
display(HTML(html))
```

## Requirements

- Python 3.8+
- Node.js 18+ (for coordboard CLI)
- coordboard npm package installed and in PATH, or built in parent repo

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black coordboard/

# Type check
mypy coordboard/
```

## License

Apache-2.0
