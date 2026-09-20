# Data Viz Factory (dvfc) Status Report

**Product:** Data Viz Factory, Cross-filtered boards for humans and agents  
**CLI:** `dvfc` (Data Viz Factory)  
**Last Updated:** September 18, 2026  
**Version:** 0.5.0  
**Status:** ✅ Production Ready - All post-rebrand tasks complete

---

## ✅ What Works

### Core Functionality

| Feature | Status | Command |
|---------|--------|---------|
| **Validate specs** | ✅ Working | `dvfc validate *.dash.yaml` |
| **Preview with hot reload** | ✅ Working | `dvfc preview *.dash.yaml` |
| **Build static HTML** | ✅ Working | `dvfc build *.dash.yaml` |
| **Build single chart** | ✅ Working | `dvfc build *.dash.yaml --chart id` |
| **Init from dbt** | ✅ Working | `dvfc init --from-dbt` |
| **Export to PDF** | ✅ Working | `dvfc export-pdf *.dash.yaml` |
| **Search charts** | ✅ Working | `dvfc charts search query` |
| **Get chart metadata** | ✅ Working | `dvfc charts get *.dash.yaml id` |
| **List charts** | ✅ Working | `dvfc charts list [--board path]` |
| **Compose boards** | ✅ Working | `dvfc charts compose --charts id,id` |
| **MCP server** | ✅ Working | `pnpm mcp` (13 tools) |
| **Python SDK** | ✅ Working | `cd python && uv sync --extra dev` |

### Chart Types

| Type | Status | Notes |
|------|--------|-------|
| `line` | ✅ | Time series, brushable |
| `bar` | ✅ | Categorical, filterable |
| `area` | ✅ | Stacked/single |
| `scatter` | ✅ | Point clouds |
| `heatmap` | ✅ | 2D cell plots |
| `histogram` | ✅ | Frequency distribution with bins |
| `boxplot` | ✅ | Statistical distribution summary |
| `density` | ✅ | Kernel density estimation |
| `number` | ✅ | KPI/metric display |
| `table` | ✅ | Data grid (100 rows) |
| `pie` | ✅ | SVG-based with percentages |
| `donut` | ✅ | Hollow pie with legend |
| `text` | ✅ | Narrative Markdown blocks |

### Features

- ✅ **JSON Schema validation** - Path-aware error messages
- ✅ **Semantic validation** - Data refs, selection wiring, duplicates
- ✅ **dbt integration** - Manifest resolution, ref() lookups, init from manifest
- ✅ **Real dbt projects** - Comprehensive guide for target/manifest.json
- ✅ **Hot reload** - File watching + auto-rebuild
- ✅ **Crossfiltering** - Mosaic native coordination
- ✅ **Layout systems** - Grid and flex layouts
- ✅ **In-browser SQL** - DuckDB-WASM execution
- ✅ **Static export** - Self-contained HTML (~333KB gzipped)
- ✅ **PDF export** - Via Playwright or manual browser print
- ✅ **Python SDK** - Build dashboards from Python
- ✅ **SQLMesh adapter** - Model reference resolution
- ✅ **Bruin adapter** - Asset reference resolution
- ✅ **MCP server** - 13 AI tools for dashboard authoring
- ✅ **Chart discovery** - Search, get, list, compose across boards
- ✅ **Chart addressability** - Board-scoped keys, display format
- ✅ **Single chart builds** - Extract individual charts with context
- ✅ **Unit tests** - 11 passing tests for chart discovery
- ✅ **CI/CD** - GitHub Actions workflow (build, test, validate)
- ✅ **Dogfood script** - Comprehensive testing of all commands
- ✅ **Analysis overlays** - Mean, median, trend (linear regression), moving average
- ✅ **Text charts** - Narrative Markdown blocks in board layout
- ✅ **Shareable filters** - URL state encodes brush selections

---

## 🚀 Quick Start

### 1. Install and Build (1 minute)

```bash
# Clone repo (if not already)
git clone https://github.com/KobaKhit/dvfc.git
cd dvfc

# Install dependencies
pnpm install

# Build packages
pnpm build
```

### 2. Validate a Dashboard (5 seconds)

```bash
pnpm exec dvfc validate examples/sales-board/sales.dash.yaml
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
pnpm exec dvfc preview examples/sales-board/sales.dash.yaml
```

**Opens:** http://localhost:3000  
**Features:**
- Live reload on file changes
- Auto-validation before rebuild
- Full crossfiltering

### 4. Build Static HTML (5 seconds)

```bash
pnpm exec dvfc build examples/sales-board/sales.dash.yaml --out-dir dist
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
pnpm exec dvfc preview examples/sales-board/sales.dash.yaml

# Build
pnpm exec dvfc build examples/sales-board/sales.dash.yaml --out-dir dist/sales
```

### Example 2: Web Analytics Dashboard
**Path:** `examples/web-analytics/`  
**Charts:** 6 (3 traffic, 3 conversions)  
**Features:** Dual filtering, flex layout

```bash
# Preview
pnpm exec dvfc preview examples/web-analytics/web-analytics.dash.yaml

# Build
pnpm exec dvfc build examples/web-analytics/web-analytics.dash.yaml --out-dir dist/web
```

### Example 3: dbt Jaffle Shop
**Path:** `examples/dbt-jaffle/`  
**Charts:** 4 (revenue trend, by payment method, by customer, by status)  
**Features:** Real dbt manifest, scaffold with `init --from-dbt`

```bash
# Validate
pnpm exec dvfc validate examples/dbt-jaffle/jaffle.dash.yaml

# Preview
pnpm exec dvfc preview examples/dbt-jaffle/jaffle.dash.yaml

# Build
pnpm exec dvfc build examples/dbt-jaffle/jaffle.dash.yaml --out-dir dist/jaffle

# Generate from dbt
cd examples/dbt-jaffle
pnpm exec dvfc init --from-dbt
```

---

## 🛠️ CLI Commands

### Validate

```bash
dvfc validate <spec.yaml>
```

**Checks:**
- JSON Schema compliance
- Semantic rules (data sources, selections)
- dbt manifest references
- File existence

**Exit codes:** 0 = valid, 1 = invalid

### Init

```bash
dvfc init [--from-dbt] [--manifest-path <path>] [-o <file>]
```

**Scaffold a new dashboard:**
- Basic template (default)
- From dbt manifest (with `--from-dbt`)
- Auto-detects mart models
- Creates time-series + bar charts

**Example:**
```bash
cd my-dbt-project
dvfc init --from-dbt --manifest-path target/manifest.json -o *.dash.yaml
```

### Preview

```bash
dvfc preview <spec.yaml> [--port 3000] [--open]
```

**Features:**
- Vite dev server
- Hot reload on spec changes
- Auto-validation
- CORS headers for DuckDB-WASM

**Default port:** 3000

### Build

```bash
dvfc build <spec.yaml> [--out-dir dist] [--minify]
```

**Output:**
- `dist/index.html` - Dashboard HTML
- `dist/assets/` - Bundled JS (~1.5MB, 333KB gzipped)
- `dist/data/` - CSV files

**Deployment:** Ready for any static host

### Export PDF

```bash
dvfc export-pdf <spec.yaml> [-o dashboard.pdf] [--no-browser]
```

**Automated (with Playwright):**
```bash
npm install -D playwright
dvfc export-pdf *.dash.yaml -o report.pdf
```

**Manual (browser print):**
```bash
dvfc export-pdf *.dash.yaml --no-browser
# Follow printed instructions
```

**Features:**
- A4 format
- Print-optimized styles
- Background graphics enabled
- 20px margins

---

## 🤖 MCP Server

The MCP server enables AI agents to author and modify dvfc dashboards programmatically.

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
    "dvfc": {
      "command": "node",
      "args": ["/absolute/path/to/dvfc/packages/mcp/dist/server.js"],
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
| `search_charts` | **NEW:** Search charts across project with scoring |
| `get_chart` | **NEW:** Get chart metadata with board context |
| `list_charts` | **NEW:** List all charts in project/board |
| `compose_board` | **NEW:** Compose board from chart IDs |
| `render_chart` | **NEW:** Build single chart with context |
| `explain_coordination` | Show crossfilter wiring |
| `apply_filter_plan` | Wire brush selections to charts |

**Total:** 13 tools (8 original + 5 chart discovery)

### Dogfood Checklist

✅ All 13 tools tested and working (see [docs/mcp-cursor.md](./docs/mcp-cursor.md))

### Agent Skill

**Location:** `.cursor/skills/dvfc/SKILL.md`

**Provides:**
- Coordination patterns
- Best practices
- Common workflows
- Troubleshooting

---

## 🐍 Python SDK

Build and manipulate dvfc dashboards from Python.

### Installation

```bash
pip install -e python/   # prefer: cd python && uv sync --extra dev
```

### Quick Example

```python
from dvfc import DashboardBuilder, ChartType, Data Viz FactoryClient

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
client = Data Viz FactoryClient()
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

## 🔍 Chart Discovery & Addressability

Find, inspect, and compose charts across dvfc dashboards.

### Key Features

- **Board-scoped charts**: Not standalone files, preserve context
- **Display keys**: `boardName__chartId` for disambiguation
- **Project-wide search**: Find charts by ID, title, type, fields
- **Composition**: Build ephemeral boards from chart IDs
- **Single chart builds**: Extract individual charts with board context

### CLI Commands

```bash
# Search across project
dvfc charts search revenue

# Get chart metadata
dvfc charts get examples/dbt-jaffle/jaffle.dash.yaml daily_revenue --format json

# List all charts
dvfc charts list
dvfc charts list --board examples/sales-board/sales.dash.yaml

# Compose from multiple boards
dvfc charts compose \
  --charts dbt-jaffle__daily_revenue,web-analytics__daily_revenue \
  --title "Revenue Comparison" \
  -o composed.yaml

# Build single chart
dvfc build examples/sales-board/sales.dash.yaml --chart daily_sales -o dist-single
```

### Disambiguation

When a chart ID exists on multiple boards:

```bash
# Ambiguous
$ dvfc charts compose --charts daily_revenue
Error: Ambiguous chart reference 'daily_revenue'.
Multiple matches: dbt-jaffle__daily_revenue, web-analytics__daily_revenue

# Use display key
$ dvfc charts compose --charts dbt-jaffle__daily_revenue
✅ Composed board saved
```

### Agent Workflow

```
1. Search  → find charts matching criteria
2. Get     → inspect chart with board context
3. Compose → build new dashboard from chart IDs
4. Render  → build single chart or full board
```

**Full guide:** [docs/chart-discovery.md](./docs/chart-discovery.md)

---

## 🔌 Adapters

dvfc supports multiple data transformation tools via adapters.

### dbt (Built-in)

```typescript
import { createDbtResolver } from '@dvfc/dbt-adapter';

const resolver = createDbtResolver({
  manifestPath: 'target/manifest.json',
  dataDir: 'data',
});

const path = await resolver.resolve('my_model');
```

### SQLMesh

```typescript
import { createSqlMeshResolver } from '@dvfc/adapter-sqlmesh';

const resolver = createSqlMeshResolver({
  contextPath: 'sqlmesh/context.yaml',
  dataDir: 'data',
});

const path = await resolver.resolve('my_model');
```

### Bruin

```typescript
import { createBruinResolver } from '@dvfc/adapter-bruin';

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
dvfc/
├── packages/
│   ├── core/              # TypeScript types + JSON Schema
│   ├── dbt-adapter/       # dbt manifest resolver
│   ├── adapter-sqlmesh/   # SQLMesh context resolver
│   ├── adapter-bruin/     # Bruin pipeline resolver
│   ├── charts/            # Chart discovery and addressability
│   ├── cli/               # CLI commands (validate, preview, build, charts, etc.)
│   └── mcp/               # MCP server for AI integration
├── python/                # Python SDK
│   ├── dvfc/        # SDK package
│   └── example.py         # Usage example
├── examples/
│   ├── sales-board/       # Business analytics example
│   ├── web-analytics/     # Web traffic example
│   └── dbt-jaffle/        # Real dbt project example
├── docs/
│   ├── mcp-cursor.md      # MCP setup guide
│   ├── pdf-export.md      # PDF export documentation
│   └── chart-discovery.md # Chart discovery guide
└── .cursor/skills/
    └── dvfc/        # Agent skill for Cursor
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
*.dash.yaml
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
pnpm exec dvfc validate examples/sales-board/sales.dash.yaml
pnpm exec dvfc validate examples/web-analytics/web-analytics.dash.yaml
```

### Build Examples

```bash
pnpm exec dvfc build examples/sales-board/sales.dash.yaml --out-dir test-sales
pnpm exec dvfc build examples/web-analytics/web-analytics.dash.yaml --out-dir test-web
```

### Test MCP Server

```bash
# Start server (stdio mode)
node packages/mcp/dist/server.js

# Server should print: "dvfc MCP server running"
# Stop with Ctrl+C
```

### Test Chart Discovery

```bash
# Search for revenue charts
pnpm exec dvfc charts search revenue

# List charts in board
pnpm exec dvfc charts list --board examples/dbt-jaffle/jaffle.dash.yaml

# Get chart metadata
pnpm exec dvfc charts get examples/dbt-jaffle/jaffle.dash.yaml daily_revenue

# Compose board from charts
pnpm exec dvfc charts compose \
  --charts dbt-jaffle__daily_revenue,web-analytics__daily_revenue \
  -o test-composed.yaml

# Build single chart
pnpm exec dvfc build examples/dbt-jaffle/jaffle.dash.yaml \
  --chart daily_revenue -o test-single
```

### Run Full Dogfood Suite

```bash
# Comprehensive test of all features
pnpm dogfood

# Tests:
# - Chart discovery (search, get, list)
# - Compose boards from multiple sources
# - Validate all examples
# - Build examples (full + single chart)
# - dbt init workflow
# - MCP server startup
```

### Run Unit Tests

```bash
# Chart discovery tests (11 tests)
cd packages/charts
pnpm test

# All passing:
# ✓ searchCharts finds revenue charts
# ✓ searchCharts returns top 10 by default
# ✓ searchCharts scores exact ID matches highest
# ✓ getChart returns chart with context
# ✓ getChart throws on missing chart
# ✓ resolveChartRef handles display keys
# ✓ resolveChartRef handles unambiguous plain IDs
# ✓ resolveChartRef throws on ambiguous IDs
# ✓ makeDisplayKey formats correctly
# ✓ parseDisplayKey extracts components
# ✓ parseDisplayKey returns null for invalid format
```

---

## 🔍 Troubleshooting

### Validation Errors

**Issue:** "dbt model not found"  
**Fix:** Ensure `dbt-stub/manifest.json` and CSVs exist next to *.dash.yaml

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
- **[docs/chart-discovery.md](./docs/chart-discovery.md)** - Chart discovery & addressability guide
- **[docs/dbt-integration.md](./docs/dbt-integration.md)** - Real dbt project integration guide
- **[docs/mcp-cursor.md](./docs/mcp-cursor.md)** - MCP setup guide (13 tools)
- **[docs/pdf-export.md](./docs/pdf-export.md)** - PDF export documentation
- **[packages/mcp/README.md](./packages/mcp/README.md)** - MCP tools reference
- **[python/README.md](./python/README.md)** - Python SDK guide
- **[.cursor/skills/dvfc/SKILL.md](./.cursor/skills/dvfc/SKILL.md)** - Agent skill
- **[scripts/dogfood.sh](./scripts/dogfood.sh)** - Comprehensive test suite

---

## ✅ Success Criteria Met

All v0.2 goals achieved:

### Task 1: Real dbt Smoke Test ✅
- ✅ `examples/dbt-jaffle/` with real dbt manifest + lineage
- ✅ `dvfc init --from-dbt` command
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
- ✅ `dvfc export-pdf` command
- ✅ Automated via Playwright (optional peer dep)
- ✅ Manual browser print fallback
- ✅ Print-optimized styles (A4, margins)
- ✅ No Chromium bundled in core

**C. Adapters ✅**
- ✅ `@dvfc/adapter-sqlmesh`
- ✅ `@dvfc/adapter-bruin`
- ✅ Same ModelRef API as dbt
- ✅ Read metadata, resolve file paths
- ✅ Documented stub implementations

### Task 5: Chart Discovery & Addressability (issue #20) ✅

**CLI Commands ✅**
- ✅ `dvfc charts search <query>` - project-wide search with scoring
- ✅ `dvfc charts get <board> <chart>` - metadata with board context
- ✅ `dvfc charts list [--board]` - enumerate all charts
- ✅ `dvfc charts compose --charts` - ephemeral board from IDs
- ✅ `dvfc build --chart` - single chart with board context
- ✅ Disambiguation: ambiguous IDs return candidates

**Library (@dvfc/charts) ✅**
- ✅ `searchCharts(projectRoot, query)` → ChartHit[]
- ✅ `getChart(dashPath, chartId)` → ChartResource
- ✅ `listCharts(projectRoot, dashPath?)` → ChartHit[]
- ✅ `composeDash(projectRoot, { chartIds, ... })` → dash YAML / `DashIR`
- ✅ `resolveChartRef(projectRoot, ref)` → ChartRef
- ✅ Display keys: `boardName__chartId` format

**MCP Tools ✅**
- ✅ `search_charts` - find across project with scoring
- ✅ `get_chart` - full metadata + board context
- ✅ `list_charts` - enumerate project/board
- ✅ `compose_board` - from chart IDs/metric
- ✅ `render_chart` - single chart build

**Documentation & Tests ✅**
- ✅ docs/chart-discovery.md with full guide
- ✅ Agent Skill updated with discovery workflow
- ✅ MCP dogfood checklist with 13 tests
- ✅ Demo: "revenue" search across dbt-jaffle + web-analytics
- ✅ Search returns 5 hits from 2 boards with scores
- ✅ Compose works with display keys
- ✅ Build --chart extracts single chart

**Design Constraints Met ✅**
- ✅ Charts stay board-scoped (not standalone files)
- ✅ Stable key: board path + chart id
- ✅ Display key: `{boardId}__{chartId}` optional format
- ✅ Get/render/build preserve board context
- ✅ Ambiguous lookups fail with candidate list

### Task 6: Quality, Hardening & Feature Foundations (Section B) ✅

**B.1 Quality/Hardening ✅**
- ✅ 11 unit tests for chart discovery (all passing)
- ✅ GitHub Actions CI workflow (build, test, validate)
- ✅ Automated node_modules check in CI
- ✅ Duplicate chart ID handling in compose
- ✅ Pie/donut chart edge cases tested

**B.2 Dogfood Paths ✅**
- ✅ `pnpm dogfood` comprehensive test script
- ✅ docs/dbt-integration.md for real target/manifest.json
- ✅ CSV export patterns from warehouses documented
- ✅ Real dbt project directory structure guide
- ✅ MCP checklist verified accurate (13 tools)

**B.3 Feature Foundations 🚧**
- ✅ Analysis overlay types (mean, median, trend, moving_average)
- ✅ Analysis overlay implementation (DuckDB SQL, multi-overlay support)
- ✅ Text chart type for narrative Markdown blocks
- ✅ Text chart rendering (Markdown → HTML)
- ✅ Shareable filter URL state (encode/decode in query string)
- ✅ Type definitions complete and built
- ✅ Example board: revenue-analysis with overlays + text
- ⚠️ Data-driven images (deferred - see API sketch below)

### Earlier Milestones ✅
- ✅ Validate command with clear errors
- ✅ Preview with hot reload
- ✅ Build to static HTML
- ✅ More chart types (number, table, heatmap, pie, donut, histogram, boxplot, density)
- ✅ Grid/flex layouts
- ✅ Examples gallery (3 dashboards)
- ✅ 5-minute quickstart README
- ✅ MCP server with 8 tools
- ✅ Agent skill for Cursor
- ✅ Clean git (no node_modules)
- ✅ GitHub Pages site with landing page and chart types gallery

---

## 🚦 Known Limitations

### Chart Types
- ✅ All core types implemented and working
- ✅ Histogram, boxplot, and density chart types now fully functional

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

## 🎯 Deferred Features

### Data-Driven Images

**Status:** Deferred (non-trivial, not blocking for v0.3)

**Use Case:** Embed dynamic images in dashboards where image properties (src, dimensions, filters) are driven by data values or selections.

**API Sketch:**

```yaml
# Image chart type
charts:
  - id: product_image
    type: image
    dataSource: products
    title: "Featured Product"
    encoding:
      src: { field: image_url }
      alt: { field: product_name }
    width: 400
    height: 300
    interaction:
      filterBy: productSelection  # Show image for selected product
      
  # Image with data-driven properties
  - id: status_icon
    type: image
    dataSource: status_metrics
    encoding:
      src: 
        field: status
        scale:
          type: ordinal
          domain: ["success", "warning", "error"]
          range: 
            - "/assets/check.svg"
            - "/assets/warning.svg"
            - "/assets/error.svg"
```

**Implementation Considerations:**

1. **Image Source Resolution**
   - Support `file:`, `http://`, `https://`, `data:` schemes
   - Handle relative paths (resolve against dashboard base)
   - Error handling for missing/broken images

2. **Dynamic Updates**
   - Re-render images when filterBy selections change
   - Preload images to avoid flicker
   - Fallback images for errors

3. **Data Binding**
   - Map field values to image URLs via scale
   - Support template strings: `"/products/${product_id}.jpg"`
   - Conditional image properties (opacity, size)

4. **Security**
   - Content Security Policy compliance
   - Sanitize URLs to prevent XSS
   - Restrict to safe schemes

**Alternative Approach:** Use text charts with embedded `<img>` tags in Markdown for MVP:

```yaml
- id: product_showcase
  type: text
  content: |
    ![Product Image](/assets/product-default.jpg)
    
    **Product:** ${product_name}
    **Status:** ${status}
```

This requires template variable substitution in text chart generator.

**Current Status:** Deferred to v0.5+. Text charts with static images work today.

---

## ♿ Accessibility (a11y)

### Current State

**Basic Support:**
- ✅ Semantic HTML structure (nav, main, footer)
- ✅ Alt text on example images
- ✅ Color contrast meets WCAG AA
- ✅ Responsive layouts (mobile-friendly)

**Crossfilter-Specific Gaps:**
- ⚠️ Keyboard navigation for brush interactions
- ⚠️ ARIA labels for interactive charts
- ⚠️ Screen reader announcements on filter changes
- ⚠️ Focus management across coordinated views

### Recommended Improvements

**1. Keyboard Crossfilter Controls**

Add to generated dashboards:

```javascript
// Clear all filters on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Clear all selections
    Object.values(selections).forEach(sel => sel.update(undefined));
    announceToScreenReader('All filters cleared');
  }
});

// Focus outline for brushable charts
document.querySelectorAll('[role="img"]').forEach(chart => {
  chart.tabIndex = 0;
  chart.setAttribute('aria-label', chart.dataset.title || 'Chart');
});
```

**2. ARIA Attributes**

```html
<div id="chart-daily_revenue" 
     role="img" 
     aria-label="Daily Revenue trend chart. Click and drag to filter by date range."
     tabindex="0">
  <!-- Mosaic chart -->
</div>

<div id="status" 
     role="status" 
     aria-live="polite" 
     aria-atomic="true">
  Dashboard ready. 3 of 6 charts filtered.
</div>
```

**3. Screen Reader Announcements**

```javascript
function announceToScreenReader(message) {
  const announcer = document.getElementById('sr-announcer');
  if (announcer) {
    announcer.textContent = message;
  }
}

// On selection change
dateBrush.addEventListener('value', (value) => {
  if (value) {
    const start = value[0], end = value[1];
    announceToScreenReader(`Filtered to ${start} through ${end}. 3 charts updated.`);
  } else {
    announceToScreenReader('Date filter cleared');
  }
});
```

**4. Focus Management**

- Set focus to first filtered chart after brush
- Visible focus indicators (outline or ring)
- Skip links for keyboard users

### Implementation Path

1. Update `packages/cli/src/generator.ts` to emit a11y-enhanced HTML
2. Add keyboard event handlers in generated main.ts
3. Include ARIA attributes in chart containers
4. Add screen reader live region to status div
5. Test with screen readers (NVDA, JAWS, VoiceOver)

**Note:** Mosaic itself doesn't provide a11y primitives, so these must be added in the generator layer.

---

## 🎯 Next Steps (v0.4)

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

**Status:** ✅ Production ready - Post-rebrand tasks complete, ready for publication  
**License:** Apache-2.0  
**Completed:** 
- **Rebrand:** coordboard → Data Viz Factory (dvfc) complete
- **Real dbt dogfood:** End-to-end workflow with chart discovery
- **MCP in Cursor:** 13 tools, agent loops, workspace config
- **Publishing prep:** PUBLISHING.md, CONTRIBUTING.md, CHANGELOG.md, badges
- **Deferred gaps:** a11y docs, PDF export paths, data-driven images API
