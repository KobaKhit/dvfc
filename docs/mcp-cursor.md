# dvfc MCP Server for Cursor

This document explains how to use the `@dvfc/mcp` server with Cursor IDE to enable AI-powered dashboard authoring.

## What is the MCP Server?

The Model Context Protocol (MCP) server exposes `dvfc` functionality to AI agents, allowing them to:

- Validate chart (`*.chart.yaml`), dash (`*.dash.yaml`), and legacy board specs
- Build HTML, SVG, or PNG from specs
- List dbt models from a manifest
- Create, update, and search charts
- Explain coordination (crossfilter) relationships
- Apply filter plans to wire up interactive brushing
- Compose dashes, extract charts, normalize IR, list chart types (`compose_dash`, `extract_charts`, `normalize_spec`, `list_chart_types`)

Legacy tool names (`validate_dashboard_spec`, `build_dashboard`, `compose_board`) remain aliases for the same workflows.

## Installation

### 1. Build the MCP Server

From the dvfc repository root:

```bash
pnpm install
pnpm run build
```

This builds `packages/mcp/dist/server.js`.

### 2. Configure Cursor

Add the MCP server to your Cursor configuration file (`~/.cursor/mcp.json` or workspace-specific config):

**Recommended: Workspace-relative path**

If you're working within the dvfc repository:

```json
{
  "mcpServers": {
    "dvfc": {
      "command": "node",
      "args": [
        "${workspaceFolder}/packages/mcp/dist/server.js"
      ],
      "disabled": false,
      "env": {}
    }
  }
}
```

**Alternative: Absolute path**

For global installation or use outside the repository:

```json
{
  "mcpServers": {
    "dvfc": {
      "command": "node",
      "args": [
        "/absolute/path/to/dvfc/packages/mcp/dist/server.js"
      ],
      "disabled": false,
      "env": {}
    }
  }
}
```

**Replace `/absolute/path/to/dvfc/`** with the actual path to your cloned repository.

For example:
- macOS/Linux: `"/Users/yourname/projects/dvfc/packages/mcp/dist/server.js"`
- Windows: `"C:\\Users\\yourname\\projects\\dvfc\\packages\\mcp\\dist\\server.js"`

**Using pnpm script:**

You can also configure Cursor to use the pnpm script:

```json
{
  "mcpServers": {
    "dvfc": {
      "command": "pnpm",
      "args": ["mcp"],
      "cwd": "${workspaceFolder}",
      "disabled": false
    }
  }
}
```

### 3. Restart Cursor

After updating `mcp.json`, restart Cursor IDE to load the new MCP server.

### 4. Verify Connection

Open the Cursor AI chat and ask:

```
List available dvfc MCP tools
```

You should see 13 tools:
1. `validate_dashboard_spec`
2. `build_dashboard`
3. `list_models`
4. `create_chart`
5. `update_chart`
6. `search_charts`
7. `get_chart`
8. `list_charts`
9. `compose_board`
10. `render_chart`
11. `explain_coordination`
12. `apply_filter_plan`
13. `compile_dashboard`

## Quick Launch (Alternative)

Instead of manually configuring `mcp.json`, you can run the MCP server standalone for testing:

```bash
# From repo root
pnpm mcp
```

Or directly:

```bash
node packages/mcp/dist/server.js
```

The server runs on stdio and waits for MCP protocol messages.

## End-to-End Agent Loop

Here's how an AI agent can use dvfc MCP tools to build coordinated dashboards:

### Discovery → Composition Workflow

**1. Search for charts**
```
Agent: Use search_charts to find all revenue-related charts
Result: Multiple hits across different boards (sales, dbt-jaffle, web-analytics)
```

**2. Get detailed metadata**
```
Agent: Use get_chart for each interesting chart
Result: Full chart spec + board context (data sources, theme, layout)
```

**3. Compose new dashboard**
```
Agent: Use compose_board with selected chart display keys
Result: New board spec merging charts from multiple sources
```

**4. Validate**
```
Agent: Use validate_dashboard_spec on composed board
Result: Schema + semantic validation passes
```

**5. Build or render**
```
Agent: Use build_dashboard to create static HTML
Or: Use render_chart to build single chart for testing
Result: Interactive dashboard with native crossfiltering
```

### Iteration → Enhancement Workflow

**1. Explain current coordination**
```
Agent: Use explain_coordination on existing board
Result: Shows which charts brush and which are filtered
```

**2. Apply filter plan**
```
Agent: Use apply_filter_plan to wire up new interactions
Result: Board updated with brush and filterBy connections
```

**3. Create new charts**
```
Agent: Use create_chart or update_chart to add visualizations
Result: Charts added to board with proper encodings
```

**4. Validate and build**
```
Agent: Validate, then build to test changes
Result: Updated dashboard with new interactions
```

### dbt Integration Workflow

**1. List available models**
```
Agent: Use list_models on target/manifest.json
Result: All dbt models with schemas and dependencies
```

**2. Select mart models**
```
Agent: Filter for models in marts/ or tagged 'mart'
Result: Subset of models suitable for visualization
```

**3. Create charts for each model**
```
Agent: Use create_chart for time-series, categoricals, KPIs
Result: Dashboard spec with auto-generated charts
```

**4. Wire coordination**
```
Agent: Use apply_filter_plan to connect time brushes to filters
Result: Full coordinated dashboard from dbt models
```

This workflow is automated in the Agent Skill (`.cursor/skills/dvfc/SKILL.md`).

## Dogfood Checklist

Use these prompts in Cursor to verify the MCP server:

### ✅ 1. Validate a Dashboard

```
Use dvfc MCP to validate examples/sales-board/board.yaml
```

Expected: Validation passes with schema and semantic checks.

### ✅ 2. List dbt Models

```
Use dvfc MCP to list models from examples/dbt-jaffle/dbt-stub/manifest.json
```

Expected: Returns 1 mart model (`customer_orders`) and 3 seeds.

### ✅ 3. Explain Coordination

```
Use dvfc MCP to explain coordination in examples/sales-board/board.yaml
```

Expected: Shows brush selections and which charts are filtered by each selection.

### ✅ 4. Create a Chart

```
Use dvfc MCP to add a new bar chart to examples/sales-board/board.yaml:
- id: new_chart
- dataSource: sales_daily
- x: product, y: revenue (sum)
```

Expected: Chart added to YAML file.

### ✅ 5. Build Dashboard

```
Use dvfc MCP to build examples/sales-board/board.yaml to dist/test
```

Expected: Static HTML dashboard built successfully.

### ✅ 6. Search Charts

```
Use dvfc MCP to search for all charts with type "line" in examples/sales-board/board.yaml
```

Expected: Returns matching chart specs.

### ✅ 7. Apply Filter Plan

```
Use dvfc MCP to wire a filter from chart "daily_sales" (selection: "dateBrush") 
to filter charts ["revenue_by_region", "top_products"]
```

Expected: `board.yaml` updated with brush and filterBy interactions.

### ✅ 8. Update Chart

```
Use dvfc MCP to update the title of chart "daily_sales" to "Sales Trend (2024)"
```

Expected: Chart title updated in YAML.

### ✅ 9. Search Charts

```
Use dvfc MCP to search for charts matching "revenue" across the project
```

Expected: Returns multiple hits from different boards (dbt-jaffle, web-analytics) with scores.

### ✅ 10. Get Chart

```
Use dvfc MCP to get chart metadata for "daily_revenue" from examples/dbt-jaffle/board.yaml
```

Expected: Returns full chart spec with board context (data sources, theme, layout).

### ✅ 11. List Charts

```
Use dvfc MCP to list all charts in examples/sales-board/board.yaml
```

Expected: Returns all charts in the board with display keys.

### ✅ 12. Compose Board

```
Use dvfc MCP to compose a board from these charts:
- dbt-jaffle__daily_revenue
- web-analytics__daily_revenue
Title: "Revenue Comparison"
```

Expected: Returns composed board YAML with both charts and merged data sources.

### ✅ 13. Render Chart

```
Use dvfc MCP to render only the "daily_revenue" chart from examples/dbt-jaffle/board.yaml
```

Expected: Builds HTML with single chart while preserving board context.

## Troubleshooting

### Server doesn't start
- Verify the path in `mcp.json` is absolute and correct
- Check that `pnpm run build` completed successfully
- Try running `node packages/mcp/dist/server.js` directly to see errors

### Tools not visible in Cursor
- Restart Cursor after updating `mcp.json`
- Check Cursor MCP logs (View → Developer Tools)
- Ensure `"disabled": false` in the config

### Permission errors
- On Unix systems, ensure the script is readable: `chmod +r packages/mcp/dist/server.js`

## Agent Skill

The dvfc Agent Skill (`.cursor/skills/dvfc/SKILL.md`) provides prompts and guidance for AI agents to use these MCP tools effectively. It's automatically loaded by Cursor when working with dvfc dashboards.

## Reference

- [MCP Package README](../packages/mcp/README.md)
- [Agent Skill Documentation](../.cursor/skills/dvfc/SKILL.md)
- [Main README](../README.md)
