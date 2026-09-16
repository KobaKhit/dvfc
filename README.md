# coordboard

**Analytics dashboards powered by Mosaic + dbt**

Build interactive, self-contained analytics dashboards from declarative YAML/JSON specs. Features native crossfiltering via [UW Mosaic](https://idl.uw.edu/mosaic/), in-browser SQL with DuckDB-WASM, and seamless dbt integration.

**Status:** Week-1 architecture spike + v0.1 skeleton (in development)

---

## ✨ Features

- 🎯 **Declarative dashboards** - Define charts and interactions in YAML/JSON
- 🔗 **Native crossfiltering** - Mosaic coordination engine (no custom filter code)
- 🗄️ **In-browser SQL** - DuckDB-WASM for client-side analytics
- 📊 **dbt integration** - Resolve `ref('model_name')` from manifest.json
- 📦 **Static export** - Self-contained HTML that works offline
- ⚡ **Fast development** - Vite dev server with hot reload

---

## 🚀 5-Minute Quickstart

```bash
# Clone and install
pnpm install

# Run working example
pnpm example:sales

# Opens at http://localhost:5174
# Try brushing the line charts to see crossfiltering!

# Build static HTML
pnpm example:build

# Preview production build
pnpm example:preview
```

### Try the Demo

1. **Open the dashboard** at http://localhost:5174
2. **Click and drag** horizontally on the "Daily Sales Trend" line chart
3. **Watch** the bar charts filter instantly to show only the selected date range
4. **Click outside** the selection to reset

---

## 📂 Repository Structure

```
coordboard/
├── packages/
│   ├── core/              # Dashboard spec types + JSON Schema
│   ├── dbt-adapter/       # dbt manifest resolver
│   └── cli/               # CLI tool (preview, build commands)
├── examples/
│   └── sales-board/       # Working demo with crossfiltering
├── VERDICT.md             # Architecture spike results (GO decision)
└── README.md              # This file
```

### Package Overview

| Package | Description | Status |
|---------|-------------|--------|
| `@coordboard/core` | TypeScript types for dashboard specs | ✅ API defined |
| `@coordboard/dbt-adapter` | dbt manifest `ref()` resolver | ✅ API defined |
| `@coordboard/cli` | CLI tool (`preview`, `build`) | ⚠️ Stub (commands exist) |
| `@coordboard/example-sales-board` | Working 6-chart dashboard | ✅ Fully functional |

---

## 🎨 Dashboard Spec Example

Define dashboards declaratively in YAML:

```yaml
meta:
  title: "Sales Analytics"
  version: "0.1.0"

data:
  - id: sales_daily
    type: dbt
    model: sales_daily

charts:
  - id: sales_trend
    type: line
    dataSource: sales_daily
    title: "Daily Sales Trend"
    encoding:
      x:
        field: date
        type: temporal
      y:
        field: sales
        aggregate: sum
    interaction:
      brush: true
      brushAxis: x
      selection: dateBrush
    
  - id: sales_by_region
    type: bar
    dataSource: sales_daily
    title: "Sales by Region"
    encoding:
      x: { field: region, type: nominal }
      y: { field: sales, aggregate: sum }
    interaction:
      filterBy: dateBrush
```

**Future:** `coordboard build board.yaml` → static HTML with working crossfiltering

**Current:** See `examples/sales-board/` for manual Mosaic implementation

---

## 🛠️ Development

### Setup

```bash
# Install pnpm if needed
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Working with Packages

```bash
# Build all packages (except examples)
pnpm build

# Watch mode for development
pnpm dev

# Clean all build outputs
pnpm clean
```

### Working with Examples

```bash
# Run sales-board example
pnpm example:sales

# Build sales-board example
pnpm example:build

# Preview built example
pnpm example:preview
```

### Package Development

Each package can be developed independently:

```bash
# Work on core types
cd packages/core
pnpm build
pnpm dev  # watch mode

# Work on dbt-adapter
cd packages/dbt-adapter
pnpm build

# Work on CLI
cd packages/cli
pnpm build
```

---

## 📋 Current State (Week-1 Spike)

### ✅ What Works

- **Working demo** with 6 charts and crossfiltering (examples/sales-board/)
- **Static HTML export** via Vite (~696KB bundle, 213KB gzipped)
- **dbt integration pattern** (manifest resolver + CSV loading)
- **In-browser DuckDB-WASM** for SQL analytics
- **Time-based crossfiltering** using Mosaic selections

### 🚧 What's Next (v0.1)

- [ ] **CLI commands** - Implement `preview` and `build` (currently stubs)
- [ ] **YAML → Mosaic compiler** - Read `board.yaml` and generate dashboard code
- [ ] **dbt resolver integration** - Use `@coordboard/dbt-adapter` in builds
- [ ] **Template system** - Generate HTML/JS from dashboard specs
- [ ] **Data source handling** - Support CSV, Parquet, remote URLs
- [ ] **Error boundaries** - Better error handling and validation
- [ ] **Bundle optimization** - Code splitting for smaller initial load

---

## 📖 Documentation

### Architecture

See **[VERDICT.md](./VERDICT.md)** for:
- ✅ Week-1 spike results (GO decision)
- Architecture validation and rationale
- Bundle size analysis (~696KB minified)
- Friction points and solutions
- Production readiness checklist
- Recommended next steps

### Examples

See **[examples/sales-board/README.md](./examples/sales-board/README.md)** for:
- Complete working demo walkthrough
- How crossfiltering works
- Data sources and dbt integration
- Build and deployment instructions

### API Reference

Each package has inline TypeScript documentation:

```bash
# Core types
packages/core/src/types.ts

# dbt adapter
packages/dbt-adapter/src/resolver.ts

# CLI commands
packages/cli/src/commands.ts
```

---

## 🎯 Design Decisions

### Why Mosaic?

- ✅ **Lightweight** - ~200KB (vs 2-3MB for Perspective)
- ✅ **Flexible** - Observable Plot + vgplot composability
- ✅ **SQL-first** - Natural fit with dbt paradigm
- ✅ **Production-ready** - Active UW IDL maintenance

### Why Not Build Custom FilterEngine?

Mosaic's coordination engine is mature, performant, and feature-rich. Building custom would be:
- Higher maintenance burden
- Slower development
- Fewer features
- More bugs

See VERDICT.md for complete analysis.

### Why pnpm Workspace?

- Fast installs with symlinked dependencies
- Strict dependency resolution
- Better monorepo support than npm/yarn
- Industry standard for modern tooling

---

## 🚦 Roadmap

### v0.1 (Next)
- [ ] Implement CLI `preview` and `build` commands
- [ ] YAML → Mosaic code generator
- [ ] Basic template system
- [ ] Integration tests for end-to-end flow

### v0.2 (Future)
- [ ] Parquet support (better for large datasets)
- [ ] Remote data sources (S3, GCS, HTTP)
- [ ] Advanced interactions (click, hover, tooltips)
- [ ] Custom themes and styling
- [ ] More chart types (heatmap, histogram, scatter)

### v0.3 (Future)
- [ ] Multi-page dashboards
- [ ] Embedding API
- [ ] Collaborative features
- [ ] Plugin system

---

## 🤝 Contributing

This is currently a proof-of-concept / architecture spike. Not yet ready for external contributions.

---

## 📄 License

Apache-2.0

See [LICENSE](./LICENSE) for full text.

---

## 🙏 Credits

Built with:
- [UW Mosaic](https://idl.uw.edu/mosaic/) - Coordination engine
- [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview) - In-browser SQL
- [Vite](https://vitejs.dev/) - Build tool
- [dbt](https://www.getdbt.com/) - Data transformation framework

Inspired by Observable Framework, Streamlit, and Tableau.

---

## 📞 Support

For questions about the architecture spike, see VERDICT.md.

For issues with the demo, check examples/sales-board/README.md.
