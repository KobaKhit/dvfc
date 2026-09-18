# dvfc MCP Server for Cursor

This document explains how to use the `@dvfc/mcp` server with Cursor IDE to enable AI-powered dashboard authoring.

## What is the MCP Server?

The Model Context Protocol (MCP) server exposes `dvfc` functionality to AI agents, allowing them to:

- Validate dashboard specifications
- Build dashboards from YAML specs
- List dbt models from a manifest
- Create, update, and search charts
- Explain coordination (crossfilter) relationships
- Apply filter plans to wire up interactive brushing

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

```json
{
  "mcpServers": {
    "dvfc": {
      "command": "node",
      "args": [
        "/absolute/path/to/dvfc/packages/mcp/dist/server.js"
      ],
      "disabled": false
    }
  }
}
```

**Replace `/absolute/path/to/dvfc/`** with the actual path to your cloned repository.

For example:
- macOS/Linux: `"/Users/yourname/projects/dvfc/packages/mcp/dist/server.js"`
- Windows: `"C:\\Users\\yourname\\projects\\dvfc\\packages\\mcp\\dist\\server.js"`

### 3. Restart Cursor

After updating `mcp.json`, restart Cursor IDE to load the new MCP server.

### 4. Verify Connection

Open the Cursor AI chat and ask:

```
List available dvfc MCP tools
```

You should see 8 tools:
1. `validate_dashboard_spec`
2. `build_dashboard`
3. `list_models`
4. `create_chart`
5. `update_chart`
6. `search_charts`
7. `explain_coordination`
8. `apply_filter_plan`

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
