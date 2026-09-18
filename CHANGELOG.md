# Changelog

All notable changes to Data Viz Factory (dvfc) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial public release preparation
- Publishing guide (docs/PUBLISHING.md)
- Contributing guide (CONTRIBUTING.md)
- Repository metadata for all packages

## [0.4.0] - 2026-09-17

### Added
- **Analysis overlays**: Mean, median, linear trend, moving average
- **Text charts**: Narrative Markdown blocks in dashboard layout
- **Shareable filters**: URL state encodes brush selections
- **Chart discovery**: Search, get, list, compose operations
- **Chart addressability**: Board-scoped keys with display format
- **Single chart builds**: Extract individual charts with context
- **MCP chart discovery**: 5 new tools (search_charts, get_chart, list_charts, compose_board, render_chart)
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
- Example dashboards: sales-board, web-analytics
- VERDICT.md documenting architecture decisions

---

## Legend

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Features that will be removed
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security vulnerability fixes
