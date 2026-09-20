# Data Viz Factory

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/KobaKhit/dvfc/ci.yml?branch=main&label=CI)](https://github.com/KobaKhit/dvfc/actions)
[![Coverage](https://img.shields.io/badge/coverage-93%25-brightgreen)](#-development)

**dvfc = Data Viz Factory, Charts, dashes, and crossfiltering for humans and agents**

**Build interactive analytics from declarative YAML**, atomic `*.chart.yaml` specs and composed `*.dash.yaml` dashboards → Powered by [Mosaic](https://idl.uw.edu/mosaic/) + dbt

Define charts and dashes in YAML, get native crossfiltering and in-browser SQL. No backend required.

---

## 🌐 Live Demos

**See it in action:** [https://kobakhit.github.io/dvfc/](https://kobakhit.github.io/dvfc/)

Try the interactive examples (click and drag to crossfilter):
- [Sales & Flights Dashboard](https://kobakhit.github.io/dvfc/examples/sales-board/), Business analytics with time-based brushing
- [Web Analytics](https://kobakhit.github.io/dvfc/examples/web-analytics/), Traffic sources and conversion metrics
- [dbt Jaffle Shop](https://kobakhit.github.io/dvfc/examples/dbt-jaffle/), E-commerce order analytics
- [Revenue Analysis](https://kobakhit.github.io/dvfc/examples/revenue-analysis/), Financial performance with analysis overlays

---

## ⚡ 5-Minute Quickstart

```bash
# 1. Clone and install (1 min)
git clone https://github.com/KobaKhit/dvfc.git
cd dvfc
pnpm install

# 2. Build packages (30 sec)
pnpm build

# 3. Preview example with hot reload (30 sec)
pnpm exec dvfc preview examples/sales-board/sales.dash.yaml
# Opens at http://localhost:3000

# 4. Try crossfiltering! (2 min)
# → Click and drag on the line charts
# → Watch bar charts filter instantly
# → Click outside to reset
```

**That's it!** You now have a working dashboard with native Mosaic crossfiltering.

---

## 🎯 What You Get

✅ **Declarative dashboards** - Write YAML, not code  
✅ **Native crossfiltering** - Mosaic coordination engine  
✅ **In-browser SQL** - DuckDB-WASM, no backend  
✅ **dbt integration** - Resolve `ref('model_name')`  
✅ **Static export** - Self-contained offline HTML  
✅ **Hot reload** - File watch + instant updates  
✅ **Analysis overlays** - Mean, median, trend, moving averages  
✅ **Text charts** - Narrative Markdown blocks  
✅ **Shareable filters** - URL encodes brush selections

---

## 📊 Quick Examples

**Chart atom** (portable SVG/PNG):

```bash
dvfc validate examples/charts/revenue_trend.chart.yaml
dvfc build examples/charts/revenue_trend.chart.yaml --format svg
```

**Dash** (canonical gallery examples):

```bash
dvfc preview examples/sales-board/sales.dash.yaml
dvfc preview examples/web-analytics/web-analytics.dash.yaml
dvfc preview examples/revenue-analysis/revenue-analysis.dash.yaml
```

See [examples/README.md](./examples/README.md), start with `examples/charts/` and `examples/dashes/`.

---

## 🛠️ CLI Commands

Works on `*.chart.yaml` and `*.dash.yaml`.

### Validate
```bash
dvfc validate my.dash.yaml
dvfc validate my.chart.yaml
```

### Preview (interactive Mosaic HTML)
```bash
dvfc preview my.dash.yaml --port 3000
```

### Build
```bash
dvfc build my.dash.yaml --out-dir dist              # self-contained HTML
dvfc build my.chart.yaml --format svg               # Vega-Lite → SVG
dvfc build my.chart.yaml --format png
```

### Compose, extract, normalize, types
```bash
dvfc dash compose --charts id1,id2 -o composed.dash.yaml
dvfc charts extract my.dash.yaml -o charts/
dvfc normalize my.dash.yaml                         # Mosaic-ready YAML (debug)
dvfc charts types                                   # registered chart plugins
```

### Python SDK
```python
from dvfc import DataVizFactoryClient
client = DataVizFactoryClient()
client.validate("examples/charts/revenue_trend.chart.yaml")
client.build("examples/charts/revenue_trend.chart.yaml", format="svg")
```

See `python/` and [docs/dbt-metrics.md](./docs/dbt-metrics.md) for semantic metrics.

---

## 📝 Spec formats (chart + dash)

**Atomic chart** (`revenue_trend.chart.yaml`):

```yaml
id: revenue_trend
type: line
data:
  type: sql
  query: SELECT date, revenue FROM ...
encoding:
  x: { field: date, type: temporal }
  y: { field: revenue, aggregate: sum }
```

**Dash** (`sales.dash.yaml`):

```yaml
id: sales
title: Sales overview
coordination:
  auto: true
data:
  - id: sales_daily
    type: dbt
    model: sales_daily
charts:
  - chart: revenue_trend          # library ref
  - id: by_region
    type: bar
    dataSource: sales_daily
    encoding:
      x: { field: region, type: nominal }
      y: { field: sales, aggregate: sum }
    interaction:
      filterBy: time
```

---

## 🎨 Supported Chart Types

| Type | Status | Description |
|------|--------|-------------|
| `line` | ✅ | Time series, brushable |
| `bar` | ✅ | Categorical aggregates |
| `area` | ✅ | Stacked or single |
| `scatter` | ✅ | Point clouds |
| `heatmap` | ✅ | 2D density |
| `histogram` | ✅ | Frequency distribution |
| `boxplot` | ✅ | Statistical distribution |
| `density` | ✅ | Kernel density estimation |
| `number` | ✅ | KPI / single metric |
| `table` | ✅ | Data grid (100 rows) |
| `pie`/`donut` | ✅ | Part-to-whole with percentages |
| `text` | ✅ | Narrative Markdown blocks |

---

## 📂 Project Structure

```
dvfc/
├── packages/
│   ├── core/              # Types + JSON Schema
│   ├── cli/               # CLI commands (validate, preview, build)
│   ├── dbt-adapter/       # dbt manifest resolver
│   ├── charts/            # Chart discovery and addressability
│   ├── mcp/               # MCP server for AI integration
│   ├── adapter-sqlmesh/   # SQLMesh context resolver
│   └── adapter-bruin/     # Bruin pipeline resolver
├── python/                # Python SDK
├── examples/
│   ├── charts/            # Atomic *.chart.yaml (canonical)
│   ├── dashes/            # Composed *.dash.yaml (canonical)
│   ├── sales-board/       # Full demo + sales.dash.yaml
│   ├── web-analytics/     # Traffic + conversions
│   ├── revenue-analysis/  # Overlays + text charts
│   └── dbt-jaffle/        # dbt stub project
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md    # Chart/dash architecture
│   ├── ROADMAP.md         # Implementation phases
│   ├── add-chart-type.md  # ChartTypeModule plugins
│   ├── dbt-metrics.md     # dbt_metric connector
│   ├── mcp-cursor.md      # MCP setup guide
│   ├── chart-discovery.md # Chart search & compose
│   ├── dbt-integration.md # dbt integration guide
│   ├── pdf-export.md      # PDF export documentation
│   └── PUBLISHING.md      # Publishing guide
└── .cursor/skills/dvfc/   # Agent skill for Cursor
```

---

## 🚀 Development

```bash
# Install
pnpm install

# Build all packages
pnpm build

# Watch mode
pnpm dev

# Unit tests (@dvfc/core, charts, resolve, render-vega), TypeScript via Node strip-types
pnpm test

# Line coverage
pnpm test:coverage

# Run example
pnpm example:sales
```

**Test coverage:** ~**93%** line coverage on package `dist/` sources (`pnpm test:coverage`, excluding `**/test/**`). Tests are TypeScript (`.test.ts`) run with `node --experimental-strip-types`.
---

## 📖 Key Documentation

- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Target architecture (chart → dash, connectors, renderers, plugins)
- **[docs/ROADMAP.md](./docs/ROADMAP.md)** - Phased implementation plan toward that architecture
- **[examples/README.md](./examples/README.md)** - Gallery of working dashboards
- **[STATUS.md](./STATUS.md)** - Feature status and capabilities (v0.5)
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Development guide and workflow
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes
- **[VERDICT.md](./VERDICT.md)** - Architecture spike results (Mosaic GO decision)
- **[docs/mcp-cursor.md](./docs/mcp-cursor.md)** - MCP server setup for AI agents
- **[docs/chart-discovery.md](./docs/chart-discovery.md)** - Chart search and composition
- **[docs/dbt-integration.md](./docs/dbt-integration.md)** - Real dbt project integration
- **[docs/pdf-export.md](./docs/pdf-export.md)** - PDF export guide
- **[docs/PUBLISHING.md](./docs/PUBLISHING.md)** - Package publishing guide
- **[Mosaic Docs](https://idl.uw.edu/mosaic/)** - Visualization library reference

---

## 🎯 Design Decisions

### Why Mosaic?
✅ Lightweight (~200KB vs 2-3MB Perspective)  
✅ SQL-first (natural fit with dbt)  
✅ Flexible (Observable Plot + vgplot)  
✅ Production-ready (UW IDL active maintenance)

### What dvfc adds
✅ Declarative YAML specs  
✅ CLI tooling (validate, preview, build)  
✅ dbt integration (ref() resolution)  
✅ Static HTML generation  
✅ Developer experience (hot reload, validation)

---

## 🤝 Contributing

Data Viz Factory is production-ready (v0.5) and actively maintained. Contributions welcome!

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for:
- Development setup
- Code standards
- Testing guidelines
- Pull request process

Key documentation:
- **[STATUS.md](./STATUS.md)** - Current features and roadmap
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history
- **[docs/PUBLISHING.md](./docs/PUBLISHING.md)** - Package publishing guide

---

## 📄 License

Apache-2.0

---

## 🔗 Links

- [UW Mosaic](https://idl.uw.edu/mosaic/) - Visualization engine
- [DuckDB-WASM](https://duckdb.org/docs/api/wasm) - In-browser database
- [dbt](https://www.getdbt.com/) - Data transformation framework

---

**Ready to build?** Start with [examples/README.md](./examples/README.md) or run:

```bash
pnpm exec dvfc preview examples/sales-board/sales.dash.yaml
```
