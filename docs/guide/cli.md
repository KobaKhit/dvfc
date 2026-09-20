# CLI

Entry point: `pnpm exec dvfc` (or a globally linked `dvfc` after install).

## Commands

### validate

```bash
dvfc validate path/to/file.{yaml,toml,json}
```

Schema, wiring, and data refs. Fail-closed for unresolved dbt models by default.

### preview

```bash
dvfc preview my.dash.yaml --port 3000
```

Vite + Mosaic hot reload. Sets COOP/COEP headers for DuckDB-WASM.

### build

```bash
dvfc build my.dash.yaml -o dist
dvfc build my.dash.yaml -o dist --format html
dvfc build my.dash.yaml -o out.html --format html-dc-static
dvfc build my.dash.yaml -o dist-wasm --format html-dc-wasm
dvfc build my.chart.yaml -f svg -o chart.svg
dvfc build my.dash.yaml -f svg --chart trend -o trend.svg
dvfc build my.dash.yaml -f html-static -o static.html
```

Options: `-o/--out-dir`, `-f/--format`, `--chart`, `--base`, `-m/--minify`.

### init

```bash
dvfc init -o dashboard.dash.yaml
dvfc init --from-dbt --manifest-path dbt-stub/manifest.json
```

### charts

```bash
dvfc charts types
dvfc charts search "revenue"
dvfc charts get <id>
dvfc charts list
dvfc charts extract my.dash.yaml -o charts/
dvfc charts compose ...
```

### dash

```bash
dvfc dash compose --charts a,b,c -o composed.dash.yaml
```

### normalize

```bash
dvfc normalize my.dash.yaml
```

Debug: emit Mosaic-ready DashboardSpec YAML.

### export-pdf

```bash
dvfc export-pdf my.dash.yaml -o report.pdf
```

Builds HTML then prints (Playwright optional). See [PDF export](../pdf-export.md).

## MCP

Agents can call the same pipeline via `@dvfc/mcp` — [MCP & agents](mcp.md).
