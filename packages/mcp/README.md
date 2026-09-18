# @dvfc/mcp

**MCP Server for dvfc** - Build coordinated analytics dashboards with AI

## What This Is

An MCP (Model Context Protocol) server that provides AI assistants with tools to:
- Validate dashboard specifications
- Build static HTML dashboards
- Manage dbt models
- Create and update charts
- Wire up crossfilter coordination

## Installation in Cursor

### 1. Build the MCP package

```bash
cd packages/mcp
pnpm install
pnpm build
```

### 2. Configure MCP in Cursor

Add to your Cursor settings (Settings → Features → Model Context Protocol):

```json
{
  "mcpServers": {
    "dvfc": {
      "command": "node",
      "args": ["/absolute/path/to/dvfc/packages/mcp/dist/server.js"]
    }
  }
}
```

**Important:** Replace `/absolute/path/to/dvfc` with your actual repository path.

### 3. Restart Cursor

The dvfc MCP server will be available in your AI chat.

### 4. Verify Installation

In Cursor AI chat, you can now use tools like:
- `validate_dashboard_spec`
- `build_dashboard`
- `create_chart`
- etc.

## Available Tools

### validate_dashboard_spec
```typescript
{
  specPath: string  // Path to board.yaml
}
```
Validates JSON Schema, semantic rules, and dbt references.

### build_dashboard
```typescript
{
  specPath: string
  outDir?: string    // Default: 'dist'
  minify?: boolean   // Default: false
}
```
Generates static HTML with crossfiltering.

### list_models
```typescript
{
  manifestPath: string  // Path to manifest.json
}
```
Lists dbt models from manifest.

### create_chart
```typescript
{
  specPath: string
  chart: ChartSpec
}
```
Adds a new chart to the dashboard.

### update_chart
```typescript
{
  specPath: string
  chartId: string
  updates: Partial<ChartSpec>
}
```
Updates an existing chart.

### search_charts
```typescript
{
  specPath: string
  query?: {
    id?: string
    type?: string
    dataSource?: string
  }
}
```
Finds charts matching criteria.

### explain_coordination
```typescript
{
  specPath: string
}
```
Shows how charts are linked via selections.

### apply_filter_plan
```typescript
{
  specPath: string
  plan: {
    brushChart: string
    selectionName: string
    filteredCharts: string[]
  }
}
```
Wires up crossfilter coordination.

## Example Workflow

```markdown
User: "Create a dashboard with sales by region"

AI: [Uses create_chart to add charts]
    [Uses apply_filter_plan to link them]
    [Uses validate_dashboard_spec to check]
    [Uses build_dashboard to generate HTML]

Result: Working dashboard with crossfiltering!
```

## Skill Integration

A dvfc agent skill is available at:
```
.cursor/skills/dvfc/SKILL.md
```

This provides:
- Coordination patterns
- Best practices
- Common workflows
- Troubleshooting

## Development

```bash
# Watch mode
pnpm dev

# Build
pnpm build

# Test locally
node dist/server.js
```

## Troubleshooting

### MCP server not appearing
1. Check absolute path in settings
2. Verify `dist/server.js` exists
3. Restart Cursor
4. Check Cursor logs

### Tool errors
- Ensure you've run `pnpm build` in packages/mcp
- Check that paths are relative to workspace root
- Verify board.yaml is valid

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [dvfc README](../../README.md)
- [Agent Skill](.cursor/skills/dvfc/SKILL.md)
