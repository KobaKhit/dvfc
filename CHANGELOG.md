# Changelog

All notable changes to Data Viz Factory (dvfc) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Mosaic crossfiltering: per-publisher selections + `crossfilter({ include })` composite; no shared-selection Highlight on aggregates (fixes DuckDB GROUP BY binder errors)
- Pie/donut/number/table filters use `Selection.predicate()` and re-query on selection `value` events (`saveStateToURL` scoped inside `createDashboard`)
- Bar/heatmap click filters work on first click (omit sticky Plot `tip` which stole `pointerdown` from Mosaic toggle)
- Pie/donut slice clicks publish via `clausePoint` when `publishes` is set; publishers skip their own clause so the pie does not collapse
- Disable Mosaic `highlight` entirely (avoids empty `SELECT  FROM …` binder errors under crossfilter)
- Smoother crossfilter updates: `vg.xDomain/yDomain/colorDomain(vg.Fixed)` + short opacity pulse (vgplot has no dc.js-style geometry tweening)
- New `@dvfc/render-dc` renderer: `--format html-dc` / `html-dc-static` (CDN + inlined CSV) and `--format html-dc-wasm` (Vite + DuckDB-WASM → crossfilter → dc.js)
- Documentation site (MkDocs Material) at `/docs/` — overview, quickstart, guides, CLI, renderers; built into GitHub Pages
- Vega-Lite `html-static` dashes honor `brush` / `filterBy` via linked params (no DuckDB-WASM); multi-chart html-static export supported
- Renamed `@dvfc/dbt-adapter` → `@dvfc/adapter-dbt` (`packages/adapter-dbt`) for consistent `adapter-*` naming
- Gallery dashes upgraded beyond line/bar: area, KPI, pie/donut, heatmap, scatter, histogram, density, table (+ overlays on revenue-analysis); site rebuild
- Fix Mosaic pie/donut/number/table queries: request `{ type: 'json' }` (default Arrow tables are not arrays)
- Click/region selection on bar, heatmap, and scatter (shared Selection.crossfilter); `interaction.select`
- Mosaic chart polish: `tip: true` tooltips, navy commercial palette, heatmap left margins (no overlapping yLabel), cleaner dashboard chrome

## [0.5.0] - 2026-09-20

### Added
- `validateSpecFileWithResult` — structured validation reports for MCP/build
- `interactionToRuntime` helper in `@dvfc/core` for publishes→selection mapping
- Ajv compile cache for ChartIR/DashIR validation
- `filterSpecToChart`, `resolveDataSource` / `dataSourceToRef` in `@dvfc/core`
- `chartIRToDashboardSpec` for discovery listing
- Unit tests: `packages/build/test/dash-mutate.test.ts`; expanded MCP tool smoke tests

### Changed
- **dbt validate is fail-closed by default** (`strictDbt: true`); unresolved models fail validate
- Discovery no longer dual-writes deprecated `boardPath` on hits/resources
- CLI `charts compose` drops unused `--metric`; compose uses a single discovery pass
- Bruin/SQLMesh adapters moved to `experiments/`; `@dvfc/resolve` package removed
- `examples/sales-board` renamed to `examples/sales-dash`; legacy Vite app removed
- Python: `DashboardSpec` removed from public `__all__`; DataSourceType gains url/sql; Dash IR fields expanded
- Removed unused DashboardSpec Ajv validators (`validateDashboardSpec` / `validateWithReport` / `validateSemantics`)
- Shared dash.data resolution via `resolveDataSource` (same path as chart connectors)
- `findChartFile` throws on ambiguous glob matches; prefers `charts/` and `examples/charts/`
- Mutate/scaffold IR writes prefer `publishes` only (runtime `selection` derived in normalize)
- STATUS.md stubbed; VERDICT moved under docs/history
- CI and root `pnpm test` include `@dvfc/mcp`
- Removed unused CLI `resolveChartRef` import, `composeDashCommand`, and validator re-exports
- Converted `board-pie-test.yaml` → `examples/dbt-jaffle/pie.dash.yaml`
- Python mypy `python_version` 3.10; CI runs `mypy dvfc --ignore-missing-imports`
- MCP `create_chart` type is a registered id string (not a frozen enum)
- Discovery `loadSpec` reuses `dashToDashboardSpec` (ref stubs only for path charts)
- SQL file refs fall back to dbt stub CSVs for bare filenames
- Removed CLI `--board`, MCP `compose_board` / `boardPath` (use `--dash` / `compose_dash` / `dashPath`)

## [0.4.0] - 2026-09-17

### Added
- **Analysis overlays**: Mean, median, linear trend, moving average
- **Text charts**: Narrative Markdown blocks in dashboard layout
- **Shareable filters**: URL state encodes brush selections
- **Chart discovery**: Search, get, list, compose operations
- **Chart addressability**: Board-scoped keys with display format
- **Single chart builds**: Extract individual charts with context
- **MCP chart discovery**: 5 new tools (search_charts, get_chart, list_charts, compose_board, render_chart); `compose_board` is an alias of `compose_dash`
- Comprehensive dbt integration documentation
- End-to-end agent loop workflows
- 11 unit tests for chart discovery (all passing)
- GitHub Actions CI workflow
- Comprehensive dogfood test script

### Changed
- **Rebrand**: coordboard → Data Viz Factory (dvfc)
- CLI binary: `coordboard` → `dvfc`
- npm scope: `@coordboard/*` → `@dvfc/*`
- Python package: `coordboard` → `dvfc`
- Python client: `CoordboardClient` → `DataVizFactoryClient`
- MCP tools expanded from 8 to 13

### Fixed
- Chart display keys now handle relative paths correctly
- Compose automatically renames duplicate chart IDs
- Init command output uses `dvfc` binary name

## [0.3.0] - 2026-09-17

### Added
- Chart discovery and addressability (issue #20)
- Quality improvements: tests, CI, dogfood script
- Real dbt project integration guide

### Fixed
- No node_modules in git
- All validation checks passing

## [0.2.0] - 2026-09-17

### Added
- Real dbt smoke test with jaffle_shop example
- Python SDK with fluent API
- PDF export via Playwright
- SQLMesh adapter for model reference resolution
- Bruin adapter for asset reference resolution
- MCP server with 8 AI tools
- Agent skill for Cursor IDE
- Pie/donut chart types
- Number/KPI chart type
- Table chart type
- Heatmap chart type
- Hot reload for preview command
- JSON Schema validation with semantic checks

### Changed
- Monorepo structure with pnpm workspaces
- Separated packages: core, cli, charts, dbt-adapter, mcp, adapters

## [0.1.0] - 2026-09-16

### Added
- Initial architecture spike
- Mosaic integration for native crossfiltering
- DuckDB-WASM for in-browser SQL
- dbt manifest resolution and ref() lookups
- Static HTML export (self-contained)
- Grid and flex layouts
- Basic chart types: line, bar, area, scatter
- Example dashboards: sales-dash, web-analytics
- VERDICT.md documenting architecture decisions

---

## Legend

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes
