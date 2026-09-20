# Chart Discovery & Addressability

Chart discovery enables finding, inspecting, and composing charts across dvfc projects.

## Overview

**Design principles:**
- Charts live in `*.chart.yaml` files and/or inline inside `*.dash.yaml`
- Stable key: spec path + chart id
- Display key format: `{dashName}__{chartId}` (preferred address: `dashId/chartId`)
- All operations preserve dash context (data sources, theme, layout)
- Ambiguous lookups return candidates or fail with list

**Path parameter:** **`dashPath`** (path to a `*.dash.yaml`). Legacy `boardPath` / `--board` aliases were removed; use `dashPath` / `--dash`.

## CLI Commands

### Search Charts

Search for charts across the project:

```bash
# Search by query (matches ID, title, type, fields)
dvfc charts search revenue

# Return all matches (default: top 10)
dvfc charts search revenue --all

# Filter by dash
dvfc charts search revenue --dash examples/sales-dash/sales.dash.yaml

# JSON output (for scripting/agents)
dvfc charts search revenue --json
```

**Output example:**
```
Found 5 chart(s):

📊 web-analytics__revenue_by_source
   Chart ID: revenue_by_source
   Type: bar
   Title: Revenue by Traffic Source
   Dash: examples/web-analytics/web-analytics.dash.yaml
   Score: 80

📊 dbt-jaffle__revenue_by_method
   Chart ID: revenue_by_method
   Type: bar
   Title: Revenue by Payment Method
   Dash: examples/dbt-jaffle/jaffle.dash.yaml
   Score: 80
```

### Get Chart Metadata

Get full chart specification with dash context:

```bash
# Get chart (JSON format)
dvfc charts get examples/dbt-jaffle/jaffle.dash.yaml daily_revenue

# YAML format
dvfc charts get examples/dbt-jaffle/jaffle.dash.yaml daily_revenue --format yaml
```

**Returns:**
- Chart specification (type, encoding, interaction)
- Dash path and display key
- Dash context (data sources, theme, layout)

### List Charts

List all charts in project or specific dash:

```bash
# List all charts in project
dvfc charts list

# List charts in specific dash
dvfc charts list --dash examples/sales-dash/sales.dash.yaml

# JSON output
dvfc charts list --json
```

### Compose Dashes

Compose ephemeral dashes from chart IDs (`dvfc dash compose` or alias `dvfc charts compose`):

```bash
# Compose from display keys
dvfc dash compose \
  --charts dbt-jaffle__daily_revenue,web-analytics__daily_revenue \
  --title "Revenue Comparison" \
  -o revenue-comparison.dash.yaml

# Compose from chart IDs (must be unambiguous)
dvfc dash compose --charts daily_sales,top_products

# With metric (optional)
dvfc dash compose \
  --charts sales-dash__daily_sales \
  --metric "Total Revenue" \
  --title "Sales Dashboard"
```

**Features:**
- Resolves chart IDs across project
- Supports `dashName__chartId` display keys
- Merges data sources from referenced dashes
- Preserves theme and layout from first chart's dash
- Returns error with candidates if ambiguous

### Build Single Chart

Build a single chart while preserving dash context:

```bash
# Build specific chart from dash
dvfc build examples/sales-dash/sales.dash.yaml --chart daily_sales -o dist-single

# Regular build (all charts)
dvfc build examples/sales-dash/sales.dash.yaml -o dist
```

**Preserves:**
- Dash queries and data sources
- Variable bindings
- Theme and styles
- Layout context

## MCP Tools (AI Integration)

The MCP server exposes chart discovery to AI agents:

### `search_charts`

Search for charts with scoring:

```json
{
  "query": "revenue",
  "projectRoot": "/path/to/project",
  "all": false
}
```

Optional filter: `dashPath`.

Returns: Array of `ChartHit` objects with scores.

### `get_chart`

Get chart with dash context:

```json
{
  "dashPath": "examples/dbt-jaffle/jaffle.dash.yaml",
  "chartId": "daily_revenue"
}
```

Returns: `ChartResource` with full context.

### `list_charts`

List all charts:

```json
{
  "projectRoot": "/path/to/project",
  "dashPath": "examples/sales-dash/sales.dash.yaml"
}
```

Returns: Array of all charts.

### `compose_dash`

Compose a dash from chart IDs:

```json
{
  "projectRoot": "/path/to/project",
  "chartIds": ["daily_revenue", "sales-dash__top_products"],
  "title": "Custom Dashboard",
  "outFile": "composed.dash.yaml"
}
```

Returns: Composed dash spec / path.

### `render_chart`

Build single chart:

```json
{
  "dashPath": "examples/sales-dash/sales.dash.yaml",
  "chartId": "daily_sales",
  "outDir": "dist"
}
```

Builds HTML to `dist/index.html`.

## Agent Workflow

Typical agent loop for chart discovery:

1. **Search** → Find charts matching criteria
   ```
   search_charts({ query: "revenue" })
   → Returns multiple hits across dashes
   ```

2. **Get** → Inspect specific chart
   ```
   get_chart({ dashPath: "...", chartId: "..." })
   → Returns full spec + context
   ```

3. **Compose** → Build new dash
   ```
   compose_dash({ chartIds: [...] })
   → Returns dash YAML / path
   ```

4. **Render** → Build single chart or full dash
   ```
   render_chart({ dashPath: "...", chartId: "..." })
   → Builds HTML
   ```

## Library API

For programmatic use:

```typescript
import {
  searchCharts,
  getChart,
  listCharts,
  composeDash,
  resolveChartRef,
  makeDisplayKey
} from '@dvfc/charts';

// Search
const hits = await searchCharts({
  projectRoot: '/path/to/project',
  query: 'revenue',
  all: false
});

// Get chart (dashPath = path to *.dash.yaml)
const resource = await getChart(dashPath, chartId);

// List charts
const allCharts = await listCharts(projectRoot);
const dashCharts = await listCharts(projectRoot, dashPath);

// Compose dash
const { dash, outPath } = await composeDash(projectRoot, {
  chartIds: ['dbt-jaffle__daily_revenue', 'web-analytics__daily_revenue'],
  title: 'My Dashboard',
  outFile: 'composed.dash.yaml'
});

// Resolve chart reference (supports display keys)
const ref = await resolveChartRef(projectRoot, 'sales-dash__daily_sales');
```

## Disambiguation

When multiple charts match an ID:

```bash
# This fails if "revenue" exists on multiple dashes
$ dvfc dash compose --charts revenue

Error: Ambiguous chart reference 'revenue'. Multiple matches found:
  dbt-jaffle__daily_revenue, web-analytics__daily_revenue
Use display key format (dashName__chartId) to disambiguate.

# Use display key instead
$ dvfc dash compose --charts dbt-jaffle__daily_revenue
✅ Composed dash saved
```

## Examples

### Multi-dash revenue analysis

```bash
# Find all revenue charts
dvfc charts search revenue --all

# Compose comparison dash
dvfc dash compose \
  --charts dbt-jaffle__daily_revenue,web-analytics__daily_revenue \
  --title "Revenue Comparison (dbt vs Analytics)" \
  -o revenue-comparison.dash.yaml

# Build it
dvfc build revenue-comparison.dash.yaml
```

### Extract Single Chart

```bash
# Build just the daily revenue chart from dbt-jaffle
dvfc build examples/dbt-jaffle/jaffle.dash.yaml \
  --chart daily_revenue \
  -o dist-revenue-only
```

### Agent Pattern: Find & Enhance

```
1. Agent: "Find charts about customers"
   → search_charts({ query: "customer" })

2. Agent: "Get the top customer chart"
   → get_chart({ dashPath: "...", chartId: "top_customers" })

3. Agent: "Add a filter from daily_sales"
   → compose_dash({
       chartIds: ["daily_sales", "top_customers"]
     })

4. Agent: "Build it"
   → build_dashboard({ specPath: "composed.dash.yaml" })
```

## Constraints Met

✅ Charts addressable from standalone `*.chart.yaml` and inline dash charts  
✅ Stable key: dash path + chart id  
✅ Display key: `dashName__chartId`  
✅ Get/render/build preserve dash context  
✅ Ambiguous lookups return candidates

## See Also

- [MCP Cursor Setup](./mcp-cursor.md) - Configure MCP in Cursor
- [Agent Skill](../.cursor/skills/dvfc/SKILL.md) - Agent usage patterns
- [CLI README](../README.md) - Main documentation
