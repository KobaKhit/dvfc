# MCP & agents

dvfc exposes an MCP server so Cursor and other agents can validate, build, search, and compose specs without leaving the IDE.

## Setup

See [mcp-cursor.md](../mcp-cursor.md) for Cursor wiring.

Package: `@dvfc/mcp` — run via `pnpm mcp` from the repo root (after `pnpm build`).

## Tools (overview)

Typical tools include:

- Validate a chart/dash path (structured report)
- Build HTML / html-dc / html-static / svg / png
- Search / list / get charts
- Compose and extract
- Dash mutate helpers (add/update chart, explain coordination)

Exact names and schemas live in `packages/mcp/src/tools.ts`.

## Tips for agents

1. Prefer `validate` before `build`
2. For multi-chart dashes, pass `chartId` when requesting `svg` / `png`
3. Use gallery specs under `examples/` as templates
4. Prefer `--format html-dc-static` when the user wants a single file without WASM
