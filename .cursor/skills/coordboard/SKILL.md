# coordboard: Build Coordinated Analytics Dashboards

**Skill for authoring interactive dashboards with native Mosaic crossfiltering**

## When to Use This Skill

Trigger when the user wants to:
- Build analytics dashboards
- Create coordinated/linked visualizations
- Work with dbt data models
- Add crossfiltering to charts
- Export static HTML dashboards

Keywords: dashboard, crossfilter, linked views, coordinated views, analytics, dbt, Mosaic

## What coordboard Does

coordboard transforms declarative YAML specs into interactive dashboards:
- **Native crossfiltering** via Mosaic coordination engine
- **In-browser SQL** with DuckDB-WASM (no backend)
- **dbt integration** with `ref()` resolution
- **Static HTML export** that works offline

## MCP Tools Available

Use the `coordboard-mcp` server for:

### 1. validate_dashboard_spec
Validate a dashboard spec (JSON Schema + semantic checks)
```json
{
  "specPath": "board.yaml"
}
```

### 2. build_dashboard
Build static HTML from spec
```json
{
  "specPath": "board.yaml",
  "outDir": "dist",
  "minify": false
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
  "specPath": "board.yaml",
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
  "specPath": "board.yaml",
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
  "specPath": "board.yaml",
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
  "specPath": "board.yaml"
}
```

### 8. apply_filter_plan
Wire up chart coordination
```json
{
  "specPath": "board.yaml",
  "plan": {
    "brushChart": "revenue_trend",
    "selectionName": "dateBrush",
    "filteredCharts": ["sales_by_region", "product_breakdown"]
  }
}
```

## Dashboard Spec Format

### Minimal Example
```yaml
meta:
  title: "Sales Dashboard"
  version: "0.1.0"

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
      selection: dateBrush

  - id: breakdown
    type: bar
    dataSource: sales
    encoding:
      x: { field: region, type: nominal }
      y: { field: amount, aggregate: sum }
    interaction:
      filterBy: dateBrush
```

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
**Fix:** Place manifest.json and CSVs in `dbt-stub/` directory next to board.yaml

## Tips

1. **Always use time-based brushing** (continuous scales work best)
2. **Validate early** before building
3. **Check coordination** with `explain_coordination`
4. **Start simple** with 2-3 charts, add more later
5. **Use layouts** (`grid` or `flex`) for better organization

## Examples

See working examples:
- `examples/sales-board/board.yaml` - Business analytics
- `examples/web-analytics/board.yaml` - Web traffic

## Resources

- [Mosaic Docs](https://idl.uw.edu/mosaic/)
- [coordboard README](../README.md)
- [Examples Gallery](../examples/README.md)
