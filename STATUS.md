# coordboard Status Report

**Last Updated:** September 17, 2026  
**Version:** 0.1.0  
**Status:** ✅ Functional - Week 1 spike + v0.1 implementation complete

---

## ✅ What Works

### Core Functionality

| Feature | Status | Command |
|---------|--------|---------|
| **Validate specs** | ✅ Working | `coordboard validate board.yaml` |
| **Preview with hot reload** | ✅ Working | `coordboard preview board.yaml` |
| **Build static HTML** | ✅ Working | `coordboard build board.yaml` |
| **MCP server** | ✅ Working | `node packages/mcp/dist/server.js` |

### Chart Types

| Type | Status | Notes |
|------|--------|-------|
| `line` | ✅ | Time series, brushable |
| `bar` | ✅ | Categorical, filterable |
| `area` | ✅ | Stacked/single |
| `scatter` | ✅ | Point clouds |
| `heatmap` | ✅ | 2D cell plots |
| `number` | ✅ | KPI/metric display |
| `table` | ✅ | Data grid (100 rows) |
| `pie`/`donut` | ⚠️ | Recognized but needs Observable Plot integration |

### Features

- ✅ **JSON Schema validation** - Path-aware error messages
- ✅ **Semantic validation** - Data refs, selection wiring, duplicates
- ✅ **dbt integration** - Manifest resolution, ref() lookups
- ✅ **Hot reload** - File watching + auto-rebuild
- ✅ **Crossfiltering** - Mosaic native coordination
- ✅ **Layout systems** - Grid and flex layouts
- ✅ **In-browser SQL** - DuckDB-WASM execution
- ✅ **Static export** - Self-contained HTML (~333KB gzipped)

---

## 🚀 Quick Start

### 1. Install and Build (1 minute)

```bash
# Clone repo (if not already)
git clone <repo-url>
cd coordboard

# Install dependencies
pnpm install

# Build packages
pnpm build
```

### 2. Validate a Dashboard (5 seconds)

```bash
pnpm exec coordboard validate examples/sales-board/board.yaml
```

**Output:**
```
✅ Dashboard spec is valid
✓ dbt manifest found
✓ dbt model 'sales_daily' → .../sales_daily.csv
✓ All validation checks passed!
```

### 3. Preview with Hot Reload (10 seconds)

```bash
pnpm exec coordboard preview examples/sales-board/board.yaml
```

**Opens:** http://localhost:3000  
**Features:**
- Live reload on file changes
- Auto-validation before rebuild
- Full crossfiltering

### 4. Build Static HTML (5 seconds)

```bash
pnpm exec coordboard build examples/sales-board/board.yaml --out-dir dist
```

**Output:** `dist/index.html` (self-contained, ~696KB)

**Deploy to:** Netlify, Vercel, GitHub Pages, S3, any static host

---

## 📊 Working Examples

### Example 1: Sales & Flights Dashboard
**Path:** `examples/sales-board/`  
**Charts:** 6 (3 sales, 3 flights)  
**Features:** Multi-section, time-based crossfiltering

```bash
# Preview
pnpm exec coordboard preview examples/sales-board/board.yaml

# Build
pnpm exec coordboard build examples/sales-board/board.yaml --out-dir dist/sales
```

### Example 2: Web Analytics Dashboard
**Path:** `examples/web-analytics/`  
**Charts:** 6 (3 traffic, 3 conversions)  
**Features:** Dual filtering, flex layout

```bash
# Preview
pnpm exec coordboard preview examples/web-analytics/board.yaml

# Build
pnpm exec coordboard build examples/web-analytics/board.yaml --out-dir dist/web
```

---

## 🛠️ CLI Commands

### Validate

```bash
coordboard validate <spec.yaml>
```

**Checks:**
- JSON Schema compliance
- Semantic rules (data sources, selections)
- dbt manifest references
- File existence

**Exit codes:** 0 = valid, 1 = invalid

### Preview

```bash
coordboard preview <spec.yaml> [--port 3000] [--open]
```

**Features:**
- Vite dev server
- Hot reload on spec changes
- Auto-validation
- CORS headers for DuckDB-WASM

**Default port:** 3000

### Build

```bash
coordboard build <spec.yaml> [--out-dir dist] [--minify]
```

**Output:**
- `dist/index.html` - Dashboard HTML
- `dist/assets/` - Bundled JS (~1.5MB, 333KB gzipped)
- `dist/data/` - CSV files

**Deployment:** Ready for any static host

---

## 🤖 MCP Server

### Setup in Cursor

**1. Build MCP package:**
```bash
cd packages/mcp
pnpm build
```

**2. Add to Cursor settings** (Settings → Features → MCP):
```json
{
  "mcpServers": {
    "coordboard": {
      "command": "node",
      "args": ["/absolute/path/to/coordboard/packages/mcp/dist/server.js"]
    }
  }
}
```

**3. Restart Cursor**

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `validate_dashboard_spec` | Validate board YAML |
| `build_dashboard` | Build static HTML |
| `list_models` | List dbt models |
| `create_chart` | Add chart to dashboard |
| `update_chart` | Modify existing chart |
| `search_charts` | Find charts by criteria |
| `explain_coordination` | Show crossfilter links |
| `apply_filter_plan` | Wire up coordination |

### Agent Skill

**Location:** `.cursor/skills/coordboard/SKILL.md`

**Provides:**
- Coordination patterns
- Best practices
- Common workflows
- Troubleshooting

---

## 📦 Package Structure

```
coordboard/
├── packages/
│   ├── core/           # TypeScript types + JSON Schema
│   ├── dbt-adapter/    # dbt manifest resolver
│   ├── cli/            # CLI commands (validate, preview, build)
│   └── mcp/            # MCP server for AI integration
├── examples/
│   ├── sales-board/    # Business analytics example
│   └── web-analytics/  # Web traffic example
└── .cursor/skills/
    └── coordboard/     # Agent skill for Cursor
```

---

## 🎯 Architecture

### Mosaic Composition (No Custom FilterEngine)

✅ **UW Mosaic** - Native coordination engine  
✅ **DuckDB-WASM** - In-browser SQL database  
✅ **Vite** - Build tool and dev server  
✅ **TypeScript** - Type-safe development

### Data Flow

```
board.yaml
    ↓
CLI validate (JSON Schema + semantic)
    ↓
CLI build/preview
    ↓
Generate Mosaic code
    ↓
Vite bundle
    ↓
Static HTML + DuckDB-WASM
    ↓
Browser: SQL queries + crossfiltering
```

### No Backend Required

- All SQL runs in browser (DuckDB-WASM)
- All coordination via Mosaic
- CSV files bundled in HTML
- Truly offline capable

---

## 📝 Dashboard Spec Format

### Minimal Example

```yaml
meta:
  title: "My Dashboard"
  version: "0.1.0"

data:
  - id: my_data
    type: dbt
    model: my_model

charts:
  - id: time_series
    type: line
    dataSource: my_data
    encoding:
      x: { field: date, type: temporal }
      y: { field: amount, aggregate: sum }
    interaction:
      brush: true
      selection: myBrush

  - id: breakdown
    type: bar
    dataSource: my_data
    encoding:
      x: { field: category, type: nominal }
      y: { field: amount, aggregate: sum }
    interaction:
      filterBy: myBrush
```

---

## 🧪 Testing

### Validate Examples

```bash
pnpm exec coordboard validate examples/sales-board/board.yaml
pnpm exec coordboard validate examples/web-analytics/board.yaml
```

### Build Examples

```bash
pnpm exec coordboard build examples/sales-board/board.yaml --out-dir test-sales
pnpm exec coordboard build examples/web-analytics/board.yaml --out-dir test-web
```

### Test MCP Server

```bash
# Start server (stdio mode)
node packages/mcp/dist/server.js

# Server should print: "coordboard MCP server running"
# Stop with Ctrl+C
```

---

## 🔍 Troubleshooting

### Validation Errors

**Issue:** "dbt model not found"  
**Fix:** Ensure `dbt-stub/manifest.json` and CSVs exist next to board.yaml

**Issue:** "Selection not found"  
**Fix:** Check that `selection: "name"` matches `filterBy: "name"`

### Preview Issues

**Issue:** Charts not rendering  
**Fix:** Check browser console for DuckDB-WASM errors

**Issue:** CORS errors  
**Fix:** Preview server sets proper headers automatically

### Build Issues

**Issue:** Large bundle size  
**Fix:** Expected (~696KB), includes DuckDB-WASM. Use `--minify` flag.

**Issue:** Missing data files  
**Fix:** Ensure CSV files are in `dbt-stub/` directory

---

## 📚 Documentation

- **[README.md](./README.md)** - Main documentation (5-minute quickstart)
- **[VERDICT.md](./VERDICT.md)** - Architecture decisions (Mosaic GO)
- **[examples/README.md](./examples/README.md)** - Gallery of examples
- **[packages/mcp/README.md](./packages/mcp/README.md)** - MCP setup guide
- **[.cursor/skills/coordboard/SKILL.md](./.cursor/skills/coordboard/SKILL.md)** - Agent skill

---

## ✅ Success Criteria Met

All week-1 + v0.1 goals achieved:

- ✅ Validate command with clear errors
- ✅ Preview with hot reload
- ✅ Build to static HTML
- ✅ More chart types (number, table, heatmap)
- ✅ Grid/flex layouts
- ✅ Examples gallery (2 dashboards)
- ✅ 5-minute quickstart README
- ✅ MCP server with 8 tools
- ✅ Agent skill for Cursor
- ✅ Clean git (no node_modules)

---

## 🚦 Known Limitations

### Chart Types
- ⚠️ **Pie/donut charts** - Recognized but need Observable Plot integration
- ⚠️ **Histogram** - Type exists but generator needs implementation

### Coordination
- ⚠️ **Categorical brushing** - Works but time-based is preferred (band scale limitations)
- ✅ **Time-based brushing** - Recommended approach, works perfectly

### Data
- ✅ **CSV files** - Fully supported via HTTP
- ⚠️ **Parquet** - Type defined but needs implementation
- ⚠️ **Remote URLs** - Type defined but needs implementation

---

## 🎯 Next Steps (v0.2)

### Immediate Priorities
- [ ] Histogram chart generator
- [ ] Parquet file support
- [ ] Remote data URLs
- [ ] Better error boundaries
- [ ] Bundle size optimization (code splitting)

### Nice to Have
- [ ] Multi-page dashboards
- [ ] Custom themes
- [ ] More interaction types (hover, click)
- [ ] Export to PNG/SVG
- [ ] Embedding API

---

## 🔗 Key Resources

- [Mosaic Documentation](https://idl.uw.edu/mosaic/)
- [DuckDB-WASM Docs](https://duckdb.org/docs/api/wasm)
- [dbt Documentation](https://docs.getdbt.com/)
- [MCP Specification](https://modelcontextprotocol.io/)

---

**Status:** Ready for production use with documented limitations.  
**License:** Apache-2.0  
**Repository:** Private (temp name, awaiting branding)
