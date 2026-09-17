# coordboard Status Report

**Last Updated:** September 17, 2026  
**Version:** 0.2.0  
**Status:** ✅ Production Ready - All v0.2 features shipped

---

## ✅ What Works

### Core Functionality

| Feature | Status | Command |
|---------|--------|---------|
| **Validate specs** | ✅ Working | `coordboard validate board.yaml` |
| **Preview with hot reload** | ✅ Working | `coordboard preview board.yaml` |
| **Build static HTML** | ✅ Working | `coordboard build board.yaml` |
| **Init from dbt** | ✅ Working | `coordboard init --from-dbt` |
| **Export to PDF** | ✅ Working | `coordboard export-pdf board.yaml` |
| **MCP server** | ✅ Working | `pnpm mcp` |
| **Python SDK** | ✅ Working | `pip install -e python/` |

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
| `pie` | ✅ | SVG-based with percentages |
| `donut` | ✅ | Hollow pie with legend |

### Features

- ✅ **JSON Schema validation** - Path-aware error messages
- ✅ **Semantic validation** - Data refs, selection wiring, duplicates
- ✅ **dbt integration** - Manifest resolution, ref() lookups, init from manifest
- ✅ **Hot reload** - File watching + auto-rebuild
- ✅ **Crossfiltering** - Mosaic native coordination
- ✅ **Layout systems** - Grid and flex layouts
- ✅ **In-browser SQL** - DuckDB-WASM execution
- ✅ **Static export** - Self-contained HTML (~333KB gzipped)
- ✅ **PDF export** - Via Playwright or manual browser print
- ✅ **Python SDK** - Build dashboards from Python
- ✅ **SQLMesh adapter** - Model reference resolution
- ✅ **Bruin adapter** - Asset reference resolution
- ✅ **MCP server** - 8 AI tools for dashboard authoring

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

### Example 3: dbt Jaffle Shop
**Path:** `examples/dbt-jaffle/`  
**Charts:** 4 (revenue trend, by payment method, by customer, by status)  
**Features:** Real dbt manifest, scaffold with `init --from-dbt`

```bash
# Validate
pnpm exec coordboard validate examples/dbt-jaffle/board.yaml

# Preview
pnpm exec coordboard preview examples/dbt-jaffle/board.yaml

# Build
pnpm exec coordboard build examples/dbt-jaffle/board.yaml --out-dir dist/jaffle

# Generate from dbt
cd examples/dbt-jaffle
pnpm exec coordboard init --from-dbt
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

### Init

```bash
coordboard init [--from-dbt] [--manifest-path <path>] [-o <file>]
```

**Scaffold a new dashboard:**
- Basic template (default)
- From dbt manifest (with `--from-dbt`)
- Auto-detects mart models
- Creates time-series + bar charts

**Example:**
```bash
cd my-dbt-project
coordboard init --from-dbt --manifest-path target/manifest.json -o board.yaml
```

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

### Export PDF

```bash
coordboard export-pdf <spec.yaml> [-o dashboard.pdf] [--no-browser]
```

**Automated (with Playwright):**
```bash
npm install -D playwright
coordboard export-pdf board.yaml -o report.pdf
```

**Manual (browser print):**
```bash
coordboard export-pdf board.yaml --no-browser
# Follow printed instructions
```

**Features:**
- A4 format
- Print-optimized styles
- Background graphics enabled
- 20px margins

---

## 🤖 MCP Server

The MCP server enables AI agents to author and modify coordboard dashboards programmatically.

### Quick Launch

```bash
# From repo root
pnpm mcp

# Or directly
node packages/mcp/dist/server.js
```

### Setup in Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "coordboard": {
      "command": "node",
      "args": ["/absolute/path/to/coordboard/packages/mcp/dist/server.js"],
      "disabled": false
    }
  }
}
```

**Restart Cursor** after updating config.

**Detailed guide:** [docs/mcp-cursor.md](./docs/mcp-cursor.md)

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `validate_dashboard_spec` | Validate board YAML (schema + semantic) |
| `build_dashboard` | Build static HTML |
| `list_models` | List dbt models from manifest |
| `create_chart` | Add chart to dashboard (with validation) |
| `update_chart` | Modify existing chart (with validation) |
| `search_charts` | Find charts by type/field |
| `explain_coordination` | Show crossfilter wiring |
| `apply_filter_plan` | Wire brush selections to charts |

### Dogfood Checklist

✅ All 8 tools tested and working (see [docs/mcp-cursor.md](./docs/mcp-cursor.md))

### Agent Skill

**Location:** `.cursor/skills/coordboard/SKILL.md`

**Provides:**
- Coordination patterns
- Best practices
- Common workflows
- Troubleshooting

---

## 🐍 Python SDK

Build and manipulate coordboard dashboards from Python.

### Installation

```bash
pip install -e python/
```

### Quick Example

```python
from coordboard import DashboardBuilder, ChartType, CoordboardClient

# Create dashboard
dashboard = (
    DashboardBuilder("Sales Analytics", "Revenue dashboard")
    .add_dbt_source("sales", "sales_daily")
    .chart("revenue_trend", ChartType.LINE, "sales")
        .title("Daily Revenue")
        .x("date", type="temporal", label="Date")
        .y("revenue", type="quantitative", aggregate="sum")
        .brush("x", "dateBrush")
        .build()
    .chart("by_region", ChartType.BAR, "sales")
        .title("Revenue by Region")
        .x("region", type="nominal")
        .y("revenue", aggregate="sum")
        .filter_by("dateBrush")
        .build()
    .build()
)

# Build to HTML
client = CoordboardClient()
html_path = client.build(dashboard, out_dir="dist")
print(f"Built: {html_path}")

# Validate
if client.validate(dashboard):
    print("✓ Valid spec")

# Export YAML
yaml_str = client.to_yaml(dashboard)
```

### Features

- ✅ Pydantic models for type safety
- ✅ Fluent API for building dashboards
- ✅ Shells to Node CLI for build/validate
- ✅ Convert to YAML/JSON/HTML
- ✅ Load existing specs
- ✅ Python 3.8+

**Full docs:** [python/README.md](./python/README.md)  
**Example script:** [python/example.py](./python/example.py)

---

## 🔌 Adapters

coordboard supports multiple data transformation tools via adapters.

### dbt (Built-in)

```typescript
import { createDbtResolver } from '@coordboard/dbt-adapter';

const resolver = createDbtResolver({
  manifestPath: 'target/manifest.json',
  dataDir: 'data',
});

const path = await resolver.resolve('my_model');
```

### SQLMesh

```typescript
import { createSqlMeshResolver } from '@coordboard/adapter-sqlmesh';

const resolver = createSqlMeshResolver({
  contextPath: 'sqlmesh/context.yaml',
  dataDir: 'data',
});

const path = await resolver.resolve('my_model');
```

### Bruin

```typescript
import { createBruinResolver } from '@coordboard/adapter-bruin';

const resolver = createBruinResolver({
  pipelinePath: 'pipeline.yml',
  dataDir: 'data',
});

const path = await resolver.resolve('my_asset');
```

### Status

All adapters follow the same ModelRef API pattern:
- ✅ Read metadata (manifest/context/pipeline)
- ✅ Resolve names to file paths
- ✅ Support CSV/Parquet
- ⚠️ Stub implementations (file-based, not runtime integration)

**Future:** Direct runtime integration, query APIs, auto-export

---

## 📦 Package Structure

```
coordboard/
├── packages/
│   ├── core/              # TypeScript types + JSON Schema
│   ├── dbt-adapter/       # dbt manifest resolver
│   ├── adapter-sqlmesh/   # SQLMesh context resolver
│   ├── adapter-bruin/     # Bruin pipeline resolver
│   ├── cli/               # CLI commands (validate, preview, build, etc.)
│   └── mcp/               # MCP server for AI integration
├── python/                # Python SDK
│   ├── coordboard/        # SDK package
│   └── example.py         # Usage example
├── examples/
│   ├── sales-board/       # Business analytics example
│   ├── web-analytics/     # Web traffic example
│   └── dbt-jaffle/        # Real dbt project example
├── docs/
│   ├── mcp-cursor.md      # MCP setup guide
│   └── pdf-export.md      # PDF export documentation
└── .cursor/skills/
    └── coordboard/        # Agent skill for Cursor
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
- **[STATUS.md](./STATUS.md)** - This file (comprehensive status report)
- **[examples/README.md](./examples/README.md)** - Gallery of examples
- **[docs/mcp-cursor.md](./docs/mcp-cursor.md)** - MCP setup guide
- **[docs/pdf-export.md](./docs/pdf-export.md)** - PDF export documentation
- **[packages/mcp/README.md](./packages/mcp/README.md)** - MCP tools reference
- **[python/README.md](./python/README.md)** - Python SDK guide
- **[.cursor/skills/coordboard/SKILL.md](./.cursor/skills/coordboard/SKILL.md)** - Agent skill

---

## ✅ Success Criteria Met

All v0.2 goals achieved:

### Task 1: Real dbt Smoke Test ✅
- ✅ `examples/dbt-jaffle/` with real dbt manifest + lineage
- ✅ `coordboard init --from-dbt` command
- ✅ End-to-end validate → preview → build working
- ✅ Auto-detects mart models, creates charts

### Task 2: Harden Remaining Stubs ✅
- ✅ Real pie/donut charts (SVG-based with percentages)
- ✅ MCP `apply_filter_plan` fully functional
- ✅ MCP `explain_coordination` shows wiring
- ✅ MCP `create_chart` with validation
- ✅ MCP `update_chart` with validation

### Task 3: MCP Dogfood Readiness ✅
- ✅ `pnpm mcp` script to launch server
- ✅ `docs/mcp-cursor.md` with exact setup instructions
- ✅ 8-step dogfood checklist (all tools tested)
- ✅ Clean install without global config edits

### Task 4: v0.2 Depth (All 3 Features) ✅

**A. Python SDK ✅**
- ✅ `python/` package pip-installable
- ✅ Pydantic models + fluent API
- ✅ Build/validate via Node CLI
- ✅ Example script + README
- ✅ to_yaml, to_json, to_html methods

**B. PDF Export ✅**
- ✅ `coordboard export-pdf` command
- ✅ Automated via Playwright (optional peer dep)
- ✅ Manual browser print fallback
- ✅ Print-optimized styles (A4, margins)
- ✅ No Chromium bundled in core

**C. Adapters ✅**
- ✅ `@coordboard/adapter-sqlmesh`
- ✅ `@coordboard/adapter-bruin`
- ✅ Same ModelRef API as dbt
- ✅ Read metadata, resolve file paths
- ✅ Documented stub implementations

### Earlier Milestones ✅
- ✅ Validate command with clear errors
- ✅ Preview with hot reload
- ✅ Build to static HTML
- ✅ More chart types (number, table, heatmap, pie, donut)
- ✅ Grid/flex layouts
- ✅ Examples gallery (3 dashboards)
- ✅ 5-minute quickstart README
- ✅ MCP server with 8 tools
- ✅ Agent skill for Cursor
- ✅ Clean git (no node_modules)

---

## 🚦 Known Limitations

### Chart Types
- ✅ All core types implemented and working
- ⚠️ **Histogram** - Type defined but generator needs implementation

### Coordination
- ⚠️ **Categorical brushing** - Works but time-based is preferred (band scale limitations)
- ✅ **Time-based brushing** - Recommended approach, works perfectly

### Data
- ✅ **CSV files** - Fully supported via HTTP
- ⚠️ **Parquet** - Type defined but needs implementation
- ⚠️ **Remote URLs** - Type defined but needs implementation

### Adapters
- ⚠️ **SQLMesh/Bruin** - Stub implementations (file-based, not runtime)
- ⚠️ **CLI auto-detect** - `--adapter` flag documented but not yet implemented

---

## 🎯 Next Steps (v0.3)

### Data & Sources
- [ ] Parquet file support
- [ ] Remote data URLs (HTTP/S3)
- [ ] SQLMesh runtime integration
- [ ] Bruin runtime integration
- [ ] CLI `--adapter` flag + auto-detection

### Charts & Viz
- [ ] Histogram chart generator
- [ ] More interaction types (hover, click)
- [ ] Custom color scales
- [ ] Chart export (SVG/PNG individual)

### Platform
- [ ] Multi-page dashboards
- [ ] Better error boundaries
- [ ] Bundle size optimization (code splitting)
- [ ] Embedding API
- [ ] Custom themes (beyond basic colors)

### Ecosystem
- [ ] Published npm packages
- [ ] Published Python package (PyPI)
- [ ] Documentation site
- [ ] Video walkthrough
- [ ] Template gallery

---

## 🔗 Key Resources

- [Mosaic Documentation](https://idl.uw.edu/mosaic/)
- [DuckDB-WASM Docs](https://duckdb.org/docs/api/wasm)
- [dbt Documentation](https://docs.getdbt.com/)
- [MCP Specification](https://modelcontextprotocol.io/)

---

**Status:** ✅ Production ready with all v0.2 features shipped  
**License:** Apache-2.0  
**Completed:** Real dbt integration, pie/donut charts, hardened MCP, Python SDK, PDF export, SQLMesh + Bruin adapters
