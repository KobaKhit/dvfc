# dvfc: Charts, dashes, and coordinated analytics

**Skill for authoring `*.chart.yaml` atoms and `*.dash.yaml` dashboards with native Mosaic crossfiltering (Dash IR only).**

## When to Use This Skill

Trigger when the user wants to:
- Build analytics dashboards
- Create coordinated/linked visualizations
- Work with dbt data models
- Add crossfiltering to charts
- Export static HTML dashboards

Keywords: dashboard, crossfilter, linked views, coordinated views, analytics, dbt, Mosaic

## What dvfc Does

dvfc transforms declarative chart and dash YAML into interactive HTML (and SVG/PNG for chart atoms):
- **Native crossfiltering** via Mosaic coordination engine
- **In-browser SQL** with DuckDB-WASM (no backend)
- **dbt integration** with `ref()` resolution
- **Static HTML export** that works offline

## MCP Tools Available

Use the `dvfc-mcp` server for:

### 1. validate_dashboard_spec
Validate a chart or dash spec (JSON Schema + semantic checks)
```json
{
  "specPath": "examples/sales-board/sales.dash.yaml"
}
```

### 2. build_dashboard
Build from spec (HTML dash default; optional `format`: `svg` | `png` for charts)
```json
{
  "specPath": "examples/charts/revenue_trend.chart.yaml",
  "outDir": "dist",
  "format": "svg"
}
```

### 3. list_models
List dbt models from manifest.json
```json
{
  "manifestPath": "dbt-stub/manifest.json"
}
```

### 4. create_chart
Add a new chart to dashboard
```json
{
  "specPath": "examples/sales-board/sales.dash.yaml",
  "chart": {
    "id": "revenue_trend",
    "type": "line",
    "dataSource": "sales",
    "encoding": {
      "x": { "field": "date", "type": "temporal" },
      "y": { "field": "revenue", "aggregate": "sum" }
    },
    "interaction": {
      "brush": true,
      "selection": "dateBrush"
    }
  }
}
```

### 5. update_chart
Update existing chart
```json
{
  "specPath": "examples/sales-board/sales.dash.yaml",
  "chartId": "revenue_trend",
  "updates": {
    "title": "Monthly Revenue Trend",
    "width": 800
  }
}
```

### 6. search_charts
Find charts in dashboard
```json
{
  "specPath": "examples/sales-board/sales.dash.yaml",
  "query": {
    "type": "line",
    "dataSource": "sales"
  }
}
```

### 7. explain_coordination
Show how charts are linked
```json
{
  "specPath": "examples/sales-board/sales.dash.yaml"
}
```

### 8. apply_filter_plan
Wire up chart coordination
```json
{
  "specPath": "examples/sales-board/sales.dash.yaml",
  "plan": {
    "brushChart": "revenue_trend",
    "selectionName": "dateBrush",
    "filteredCharts": ["sales_by_region", "product_breakdown"]
  }
}
```

## Spec formats

### Dash (preferred)
```yaml
id: sales
title: Sales Dashboard
coordination:
  auto: true
data:
  - id: sales
    type: dbt
    model: sales_daily
charts:
  - id: trend
    type: line
    dataSource: sales
    encoding:
      x: { field: date, type: temporal }
      y: { field: amount, aggregate: sum }
    interaction:
      brush: true
      publishes: dateBrush
  - id: breakdown
    type: bar
    dataSource: sales
    encoding:
      x: { field: region, type: nominal }
      y: { field: amount, aggregate: sum }
    interaction:
      filterBy: dateBrush
```

### CLI parity
`dvfc dash compose`, `dvfc charts extract`, `dvfc normalize`, `dvfc charts types`

## Chart Types

| Type | Use Case | Brushable |
|------|----------|-----------|
| `line` | Time series | Yes (for date filtering) |
| `bar` | Categories | Yes (but not ideal) |
| `area` | Stacked trends | Yes |
| `scatter` | Correlations | Yes |
| `heatmap` | 2D density | Yes |
| `number` | Single KPI | No |
| `table` | Data grid | No |
| `pie` | Proportions | No (stub) |

## Coordination Patterns

### Pattern 1: Time-Based Filtering
**Best practice:** Time series chart controls categorical breakdowns
```yaml
charts:
  - id: time_series
    type: line
    interaction:
      brush: true
      brushAxis: x
      selection: timeBrush
  
  - id: category_breakdown
    type: bar
    interaction:
      filterBy: timeBrush
```

### Pattern 2: Multi-Section Dashboard
**Use case:** Independent filter groups
```yaml
# Sales section
charts:
  - { id: sales_time, interaction: { selection: salesBrush } }
  - { id: sales_region, interaction: { filterBy: salesBrush } }

# Marketing section
charts:
  - { id: campaign_time, interaction: { selection: marketBrush } }
  - { id: campaign_source, interaction: { filterBy: marketBrush } }
```

### Pattern 3: Drill-Down
**Use case:** Progressive filtering
```yaml
charts:
  - { id: region_chart, interaction: { selection: regionSel } }
  - { id: product_chart, interaction: { filterBy: regionSel, selection: productSel } }
  - { id: detail_table, interaction: { filterBy: productSel } }
```

## Workflow

### 1. Start with Data Sources
```yaml
data:
  - id: my_data
    type: dbt
    model: my_model
```

### 2. Add Time Series Chart (Brush Target)
```yaml
charts:
  - id: trend
    type: line
    dataSource: my_data
    encoding:
      x: { field: date, type: temporal }
      y: { field: metric, aggregate: sum }
    interaction:
      brush: true
      selection: mySelection
```

### 3. Add Filtered Charts
```yaml
  - id: breakdown
    type: bar
    dataSource: my_data
    encoding:
      x: { field: category }
      y: { field: metric, aggregate: sum }
    interaction:
      filterBy: mySelection
```

### 4. Validate
Use `validate_dashboard_spec` tool

### 5. Build
Use `build_dashboard` tool

## Common Issues

### Issue: Charts not filtering
**Cause:** Selection names don't match
**Fix:** Ensure `selection: "name"` in brush chart matches `filterBy: "name"` in filtered charts

### Issue: Band scale error
**Cause:** Using intervalX on categorical (bar) chart
**Fix:** Use time series (line/area) as brush target, categorical as filtered

### Issue: dbt model not found
**Cause:** Missing manifest.json or CSV file
**Fix:** Place manifest.json and CSVs in `dbt-stub/` directory next to the dash YAML

## Tips

1. **Always use time-based brushing** (continuous scales work best)
2. **Validate early** before building
3. **Check coordination** with `explain_coordination`
4. **Start simple** with 2-3 charts, add more later
5. **Use layouts** (`grid` or `flex`) for better organization

## Examples

See working examples:
- `examples/charts/` and `examples/dashes/` — canonical IR
- `examples/sales-board/sales.dash.yaml` — full gallery demo

## Chart Discovery (NEW)

dvfc now supports cross-project chart discovery and composition!

### Key Concepts

- **Project-scoped**: Charts in `*.chart.yaml` and/or inline in dashes
- **Display keys**: `dashName__chartId`
- **Context**: Get/render preserve data sources, theme, layout
- **Disambiguation**: Ambiguous IDs return candidate list

### New MCP Tools

#### search_charts

Find charts across the project with scoring:

```json
{
  "query": "revenue",
  "projectRoot": "/workspace",
  "boardPath": "examples/sales-board/sales.dash.yaml",  // optional dash path
  "all": false  // default: top 10 results
}
```

Returns `ChartHit[]` with scores based on ID, title, type, field matches.

#### get_chart

Get chart with full board context:

```json
{
  "boardPath": "examples/dbt-jaffle/jaffle.dash.yaml",
  "chartId": "daily_revenue"
}
```

Returns:
- Chart spec
- Board context (data sources, theme, layout)
- Display key

#### list_charts

List all charts in project or board:

```json
{
  "projectRoot": "/workspace",
  "boardPath": "examples/sales-board/sales.dash.yaml"  // optional
}
```

#### compose_dash / compose_board

Compose a dash from chart IDs:

```json
{
  "projectRoot": "/workspace",
  "chartIds": ["daily_revenue", "sales-board__top_products"],
  "title": "Custom Dashboard",
  "metric": "Revenue"  // stub for now
}
```

Resolves chart IDs to refs, merges data sources, returns composed spec.

**Ambiguity handling**: If a chart ID exists on multiple boards, returns error with candidates:
```
Error: Ambiguous chart reference 'daily_revenue'.
Multiple matches found: dbt-jaffle__daily_revenue, web-analytics__daily_revenue
Use display key format (boardName__chartId) to disambiguate.
```

#### render_chart

Build single chart with board context:

```json
{
  "boardPath": "examples/sales-board/sales.dash.yaml",
  "chartId": "daily_sales",
  "outDir": "dist"
}
```

Builds HTML with only the specified chart, preserving dash context.

#### extract_charts / list_chart_types / normalize_spec

Match CLI: extract inline charts to files, list `ChartTypeModule` plugins, dump normalized Mosaic YAML.

### Agent Workflow Pattern

```
1. Search: "Find revenue charts"
   → search_charts({ query: "revenue" })
   → Returns hits from multiple boards

2. Inspect: "What fields does the top one use?"
   → get_chart({ boardPath: "...", chartId: "..." })
   → Returns full spec + context

3. Compose: "Combine top 2 into one dashboard"
   → compose_board({ chartIds: ["board1__chart1", "board2__chart2"] })
   → Returns YAML spec

4. Build: "Generate the HTML"
   → build_dashboard({ specPath: "composed.yaml" })
   → Outputs dist/index.html
```

### Use Cases

**Multi-board analysis:**
```
User: "Compare revenue across all boards"
1. search_charts({ query: "revenue" })
2. compose_board({ chartIds: [all revenue chart display keys] })
3. build_dashboard({ specPath: composed spec })
```

**Extract single chart:**
```
User: "Show me just the daily sales chart"
1. search_charts({ query: "daily sales" })
2. render_chart({ boardPath: ..., chartId: ... })
```

**Cross-board filtering:**
```
User: "Add dbt revenue chart to the web analytics board"
1. get_chart({ boardPath: "dbt-jaffle/...", chartId: "daily_revenue" })
2. create_chart({ specPath: "web-analytics/...", chart: ... })
```

## Resources

- [Mosaic Docs](https://idl.uw.edu/mosaic/)
- [Chart Discovery Guide](../docs/chart-discovery.md)
- [dvfc README](../README.md)
- [Examples Gallery](../examples/README.md)
