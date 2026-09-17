# Chart Discovery & Addressability

Chart discovery enables finding, inspecting, and composing charts across coordboard dashboards.

## Overview

**Design principles:**
- Charts are board-scoped (not standalone files)
- Stable key: `board path + chart id`
- Display key format: `{boardName}__{chartId}`
- All operations preserve board context (queries, variables, styles)
- Ambiguous lookups return candidates or fail with list

## CLI Commands

### Search Charts

Search for charts across the project:

```bash
# Search by query (matches ID, title, type, fields)
coordboard charts search revenue

# Return all matches (default: top 10)
coordboard charts search revenue --all

# Filter by board
coordboard charts search revenue --board examples/sales-board/board.yaml

# JSON output (for scripting/agents)
coordboard charts search revenue --json
```

**Output example:**
```
Found 5 chart(s):

📊 web-analytics__revenue_by_source
   Chart ID: revenue_by_source
   Type: bar
   Title: Revenue by Traffic Source
   Board: examples/web-analytics/board.yaml
   Score: 80

📊 dbt-jaffle__revenue_by_method
   Chart ID: revenue_by_method
   Type: bar
   Title: Revenue by Payment Method
   Board: examples/dbt-jaffle/board.yaml
   Score: 80
```

### Get Chart Metadata

Get full chart specification with board context:

```bash
# Get chart (JSON format)
coordboard charts get examples/dbt-jaffle/board.yaml daily_revenue

# YAML format
coordboard charts get examples/dbt-jaffle/board.yaml daily_revenue --format yaml
```

**Returns:**
- Chart specification (type, encoding, interaction)
- Board path and display key
- Board context (data sources, theme, layout)

### List Charts

List all charts in project or specific board:

```bash
# List all charts in project
coordboard charts list

# List charts in specific board
coordboard charts list --board examples/sales-board/board.yaml

# JSON output
coordboard charts list --json
```

### Compose Boards

Compose ephemeral boards from chart IDs:

```bash
# Compose from display keys
coordboard charts compose \
  --charts dbt-jaffle__daily_revenue,web-analytics__daily_revenue \
  --title "Revenue Comparison" \
  -o revenue-comparison.yaml

# Compose from chart IDs (must be unambiguous)
coordboard charts compose --charts daily_sales,top_products

# With metric (stub for now)
coordboard charts compose \
  --charts sales-board__daily_sales \
  --metric "Total Revenue" \
  --title "Sales Dashboard"
```

**Features:**
- Resolves chart IDs across project
- Supports `boardName__chartId` display keys
- Merges data sources from all boards
- Preserves theme and layout from first chart's board
- Returns error with candidates if ambiguous

### Build Single Chart

Build a single chart while preserving board context:

```bash
# Build specific chart from board
coordboard build examples/sales-board/board.yaml --chart daily_sales -o dist-single

# Regular build (all charts)
coordboard build examples/sales-board/board.yaml -o dist
```

**Preserves:**
- Board queries and data sources
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

Returns: Array of `ChartHit` objects with scores.

### `get_chart`

Get chart with board context:

```json
{
  "boardPath": "examples/dbt-jaffle/board.yaml",
  "chartId": "daily_revenue"
}
```

Returns: `ChartResource` with full context.

### `list_charts`

List all charts:

```json
{
  "projectRoot": "/path/to/project",
  "boardPath": "examples/sales-board/board.yaml"  // optional
}
```

Returns: Array of all charts.

### `compose_board`

Compose board from chart IDs:

```json
{
  "projectRoot": "/path/to/project",
  "chartIds": ["daily_revenue", "sales-board__top_products"],
  "title": "Custom Dashboard",
  "metric": "Revenue"  // stub
}
```

Returns: Composed `DashboardSpec`.

### `render_chart`

Build single chart:

```json
{
  "boardPath": "examples/sales-board/board.yaml",
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
   → Returns multiple hits across boards
   ```

2. **Get** → Inspect specific chart
   ```
   get_chart({ boardPath: "...", chartId: "..." })
   → Returns full spec + context
   ```

3. **Compose** → Build new dashboard
   ```
   compose_board({ chartIds: [...] })
   → Returns YAML spec
   ```

4. **Render** → Build single chart or full board
   ```
   render_chart({ boardPath: "...", chartId: "..." })
   → Builds HTML
   ```

## Library API

For programmatic use:

```typescript
import {
  searchCharts,
  getChart,
  listCharts,
  composeBoard,
  resolveChartRef,
  makeDisplayKey
} from '@coordboard/charts';

// Search
const hits = await searchCharts({
  projectRoot: '/path/to/project',
  query: 'revenue',
  all: false
});

// Get chart
const resource = await getChart(boardPath, chartId);

// List charts
const allCharts = await listCharts(projectRoot);
const boardCharts = await listCharts(projectRoot, boardPath);

// Compose board
const spec = await composeBoard(projectRoot, {
  charts: [
    { boardPath: '...', chartId: '...' },
    { boardPath: '...', chartId: '...' }
  ],
  title: 'My Dashboard'
});

// Resolve chart reference (supports display keys)
const ref = await resolveChartRef(projectRoot, 'sales-board__daily_sales');
```

## Disambiguation

When multiple charts match an ID:

```bash
# This fails if "revenue" exists on multiple boards
$ coordboard charts compose --charts revenue

Error: Ambiguous chart reference 'revenue'. Multiple matches found:
  dbt-jaffle__daily_revenue, web-analytics__daily_revenue
Use display key format (boardName__chartId) to disambiguate.

# Use display key instead
$ coordboard charts compose --charts dbt-jaffle__daily_revenue
✅ Composed board saved
```

## Examples

### Multi-board Revenue Analysis

```bash
# Find all revenue charts
coordboard charts search revenue --all

# Compose comparison board
coordboard charts compose \
  --charts dbt-jaffle__daily_revenue,web-analytics__daily_revenue \
  --title "Revenue Comparison (dbt vs Analytics)" \
  -o revenue-comparison.yaml

# Build it
coordboard build revenue-comparison.yaml
```

### Extract Single Chart

```bash
# Build just the daily revenue chart from dbt-jaffle
coordboard build examples/dbt-jaffle/board.yaml \
  --chart daily_revenue \
  -o dist-revenue-only
```

### Agent Pattern: Find & Enhance

```
1. Agent: "Find charts about customers"
   → search_charts({ query: "customer" })

2. Agent: "Get the top customer chart"
   → get_chart({ boardPath: "...", chartId: "top_customers" })

3. Agent: "Add a filter from daily_sales"
   → compose_board({
       chartIds: ["daily_sales", "top_customers"]
     })

4. Agent: "Build it"
   → build_dashboard({ specPath: "composed.yaml" })
```

## Constraints Met

✅ Charts stay board-scoped (not standalone files)  
✅ Stable key: board path + chart id  
✅ Display key: `boardName__chartId`  
✅ Get/render/build preserve board context  
✅ Ambiguous lookups return candidates

## See Also

- [MCP Cursor Setup](./mcp-cursor.md) - Configure MCP in Cursor
- [Agent Skill](../.cursor/skills/coordboard/SKILL.md) - Agent usage patterns
- [CLI README](../README.md) - Main documentation
