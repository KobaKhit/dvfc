# coordboard

**Build interactive analytics dashboards from declarative YAML** → Powered by [Mosaic](https://idl.uw.edu/mosaic/) + dbt

Define dashboards in YAML, get native crossfiltering and in-browser SQL. No backend required.

---

## ⚡ 5-Minute Quickstart

```bash
# 1. Clone and install (1 min)
git clone <repo-url>
cd coordboard
pnpm install

# 2. Build packages (30 sec)
pnpm build

# 3. Preview example with hot reload (30 sec)
pnpm exec coordboard preview examples/sales-board/board.yaml
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

---

## 📊 Quick Examples

### Example 1: Sales & Flights
6-chart dashboard with time-based crossfiltering
```bash
pnpm exec coordboard preview examples/sales-board/board.yaml
```

### Example 2: Web Analytics
Traffic sources, conversions, and revenue
```bash
pnpm exec coordboard preview examples/web-analytics/board.yaml
```

See [examples/README.md](./examples/README.md) for full gallery.

---

## 🛠️ CLI Commands

### Validate a board spec
```bash
coordboard validate board.yaml
```
- JSON Schema validation
- Semantic checks (data refs, selections)
- dbt manifest verification

### Preview with hot reload
```bash
coordboard preview board.yaml --port 3000
```
- Vite dev server
- File watching
- Auto-reload on changes

### Build static HTML
```bash
coordboard build board.yaml --out-dir dist
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
| `pie`/`donut` | ⚠️ | Recognized (needs Observable Plot integration) |

---

## 📂 Project Structure

```
coordboard/
├── packages/
│   ├── core/              # Types + JSON Schema
│   ├── dbt-adapter/       # dbt manifest resolver
│   └── cli/               # CLI commands (validate, preview, build)
├── examples/
│   ├── sales-board/       # Business analytics
│   └── web-analytics/     # Traffic + conversions
└── README.md              # You are here
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
- **[VERDICT.md](./VERDICT.md)** - Architecture spike results (Mosaic GO decision)
- **[Mosaic Docs](https://idl.uw.edu/mosaic/)** - Visualization library reference

---

## 🎯 Design Decisions

### Why Mosaic?
✅ Lightweight (~200KB vs 2-3MB Perspective)  
✅ SQL-first (natural fit with dbt)  
✅ Flexible (Observable Plot + vgplot)  
✅ Production-ready (UW IDL active maintenance)

### What coordboard adds
✅ Declarative YAML specs  
✅ CLI tooling (validate, preview, build)  
✅ dbt integration (ref() resolution)  
✅ Static HTML generation  
✅ Developer experience (hot reload, validation)

---

## 🤝 Contributing

Currently proof-of-concept. See [VERDICT.md](./VERDICT.md) for v0.1 status.

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
pnpm exec coordboard preview examples/sales-board/board.yaml
```
