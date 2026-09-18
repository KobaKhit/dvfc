# Data Viz Factory

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/KobaKhit/dvfc/ci.yml?branch=main&label=CI)](https://github.com/KobaKhit/dvfc/actions)

**dvfc = Data Viz Factory — Cross-filtered boards for humans and agents**

**Build interactive analytics dashboards from declarative YAML** → Powered by [Mosaic](https://idl.uw.edu/mosaic/) + dbt

Define dashboards in YAML, get native crossfiltering and in-browser SQL. No backend required.

---

## 🌐 Live Demos

**See it in action:** [https://kobakhit.github.io/dvfc/](https://kobakhit.github.io/dvfc/)

Try the interactive examples (click and drag to crossfilter):
- [Sales & Flights Dashboard](https://kobakhit.github.io/dvfc/examples/sales-board/) — Business analytics with time-based brushing
- [Web Analytics](https://kobakhit.github.io/dvfc/examples/web-analytics/) — Traffic sources and conversion metrics
- [dbt Jaffle Shop](https://kobakhit.github.io/dvfc/examples/dbt-jaffle/) — E-commerce order analytics
- [Revenue Analysis](https://kobakhit.github.io/dvfc/examples/revenue-analysis/) — Financial performance with analysis overlays

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
pnpm exec dvfc preview examples/sales-board/board.yaml
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

### Example 1: Sales & Flights
6-chart dashboard with time-based crossfiltering
```bash
pnpm exec dvfc preview examples/sales-board/board.yaml
```

### Example 2: Web Analytics
Traffic sources, conversions, and revenue
```bash
pnpm exec dvfc preview examples/web-analytics/board.yaml
```

### Example 3: Revenue Analysis with Overlays
Analysis overlays (trend, mean, MA) + narrative text blocks
```bash
pnpm exec dvfc preview examples/revenue-analysis/board.yaml
```

See [examples/README.md](./examples/README.md) for full gallery.

---

## 🛠️ CLI Commands

### Validate a board spec
```bash
dvfc validate board.yaml
```
- JSON Schema validation
- Semantic checks (data refs, selections)
- dbt manifest verification

### Preview with hot reload
```bash
dvfc preview board.yaml --port 3000
```
- Vite dev server
- File watching
- Auto-reload on changes

### Build static HTML
```bash
dvfc build board.yaml --out-dir dist
```
- Generates self-contained HTML
- ~333KB gzipped
- Works offline with DuckDB-WASM

---

## 📝 Dashboard Spec Format

```yaml
meta:
  title: "My Dashboard"
  version: "0.1.0"

data:
  - id: sales
    type: dbt
    model: sales_daily

charts:
  - id: trend
    type: line
    dataSource: sales
    encoding:
      x: { field: date, type: temporal }
      y: { field: amount, aggregate: sum }
    interaction:
      brush: true
      selection: dateBrush
  
  - id: breakdown
    type: bar
    dataSource: sales
    encoding:
      x: { field: region, type: nominal }
      y: { field: amount, aggregate: sum }
    interaction:
      filterBy: dateBrush  # Linked to trend!
```

**That's all it takes!** The CLI generates Mosaic code and bundles everything.

---

## 🎨 Supported Chart Types

| Type | Status | Description |
|------|--------|-------------|
| `line` | ✅ | Time series, brushable |
| `bar` | ✅ | Categorical aggregates |
| `area` | ✅ | Stacked or single |
| `scatter` | ✅ | Point clouds |
| `heatmap` | ✅ | 2D density |
| `number` | ✅ | KPI / single metric |
| `table` | ✅ | Data grid (100 rows) |
| `pie` | ✅ | SVG-based with percentages |
| `donut` | ✅ | Hollow pie with legend |

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
│   ├── sales-board/       # Business analytics
│   ├── web-analytics/     # Traffic + conversions
│   ├── revenue-analysis/  # Analysis overlays + text charts
│   └── dbt-jaffle/        # Real dbt project example
├── docs/                  # Documentation
│   ├── mcp-cursor.md      # MCP setup guide
│   ├── chart-discovery.md # Chart discovery guide
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

# Run example
pnpm example:sales
```

---

## 📖 Key Documentation

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
pnpm exec dvfc preview examples/sales-board/board.yaml
```
