# dvfc Architecture

**Status:** Target architecture (implementation roadmap in [ROADMAP.md](./ROADMAP.md))  
**Last updated:** 2026-09-20  
**Supersedes (directionally):** board-centric model in `STATUS.md`, examples and docs are **Dash IR** only (`*.dash.yaml`).

---

## 1. Product thesis

**dvfc** (Data Viz Factory) is a **chart compiler and dash composer** for humans and agents.

- **Auditable specs** (YAML / TOML / JSON), not vibecoded dashboard apps  
- **Portable artifacts**, interactive HTML (Mosaic + DuckDB-WASM) and standalone SVG / PNG (Vega-Lite)  
- **Exploration-first**, native crossfiltering (dc.js lineage), not only static reports  
- **Turnkey**, validate → preview → export without a warehouse requirement  
- **dbt-native metrics**, consume dbt OSS semantic layer; **do not** invent a metric language  

**Not in scope as identity:** rebuilding on Observable Framework (optional future *emit* only).  
**Competitors we differentiate from:** [dbt Charts](https://github.com/dbt-labs/dbt-charts) (board/report-centric) by making **charts atomic** and **dashes composable**, with auto-coordination as a value-add.

---

## 2. Core concepts

```text
dbt semantic metrics / models     sql | files | tables
              \                     /
               →  Chart  →  renderers (mosaic | vega-lite | dc.js)
                       ↓
                     Dash  (compose + coordination + layout)
```

| Concept | Role | File convention |
|---------|------|-----------------|
| **Chart** | Atomic unit: data binding + mark + encoding + optional interaction. May use **multiple measures** (columns / dbt metrics). | `*.chart.yaml` (also `.toml` / `.json`) |
| **Dash** | Composition unit: ordered charts (refs and/or **inline**), layout, coordination. | `*.dash.yaml` |
| **Metric** | *Not a dvfc language.* Owned by **dbt** (semantic models / metrics / MetricFlow). Charts *reference* them. | dbt project |

### 2.1 Naming (do not use “board”)

| Avoid | Use |
|-------|-----|
| board, view (as product noun) | **dash** |
| dvfc metric DSL | **dbt metric / semantic** references |

---

## 3. What dvfc owns vs borrows

| Layer | Owner | Notes |
|-------|--------|------|
| Metric definitions & semantics | **dbt OSS** (semantic layer / MetricFlow) | Resolve to SQL or a relation; no parallel algebra in dvfc |
| SQL execution / file reads | **DuckDB** (WASM or native), engine APIs | Passthrough, Mosaic/vgplot/Vega-Lite already expect tables/SQL |
| Interactive coordination | **Mosaic / vgplot** | Brush / selections for HTML dashes |
| Static vector/raster export | **Vega-Lite** (+ PNG encode) | Per-chart SVG/PNG; optional static HTML |
| Chart + dash grammar, validate, compose, CLI, MCP, Python SDK | **dvfc** | Product surface |

---

## 4. Spec formats

All public specs accept **YAML, TOML, and JSON** with the same JSON Schema (generated from TypeScript types in `@dvfc/core`).

### 4.1 Data binding (connectors, not languages)

A chart’s `data` is one of:

```yaml
# A) dbt semantic metric (preferred for governed measures)
data:
  type: dbt_metric
  metric: revenue                 # dbt metric name
  group_by: [metric_time__day, customer__region]
  # where: ...                    # optional MetricFlow filters

# B) dbt model (relation, not necessarily a semantic metric)
data:
  type: dbt
  model: sales_daily              # manifest ref → relation/file

# C) inline SQL (engine runs it, same idea as dbt Charts queries)
data:
  type: sql
  sql: |
    SELECT date, sum(sales) AS sales
    FROM read_csv_auto('data/sales.csv')
    GROUP BY 1

# D) direct data reference
data:
  type: data
  path: data/sales_daily.csv      # or table: sales_daily
```

**Implementation note:** connectors produce a **resolved relation** (SQL + optional materialization) for the active renderer. Charts never branch on “metric algebra” inside dvfc.

### 4.2 Chart spec

```yaml
# charts/revenue_trend.chart.yaml
id: revenue_trend
title: Daily revenue
type: line                        # registered chart type id

data:
  type: dbt_metric
  metric: revenue
  group_by: [metric_time__day]

# Multi-measure: either multiple metrics or multiple fields from one relation
measures:
  - id: revenue
    field: revenue                # column after resolve
  # - id: target
  #   data: { type: dbt_metric, metric: revenue_target, group_by: [metric_time__day] }

encoding:
  x: { field: metric_time__day, type: temporal }
  y: { field: revenue, type: quantitative }
  # color: { field: measure }     # when multiple measures → series

interaction:
  brush: x
  publishes: time                 # selection name for dash coordination

overlays:                         # optional
  - type: mean
```

**Multi-metric / multi-measure charts:** one chart may bind several measures (aligned on grain / join keys). Validation fails if grains are incompatible unless `join` is explicit.

### 4.3 Dash spec (refs + inline charts)

```yaml
# dashes/sales.dash.yaml
id: sales
title: Sales overview
layout:
  type: grid
  columns: 2

coordination:
  auto: true                      # value-add: wire publishes → filterBy when compatible
  # selections:                   # optional explicit map
  #   time: { source: revenue_trend, axis: x }

charts:
  - chart: revenue_trend          # reference to charts/revenue_trend.chart.yaml (or package path)

  - id: by_region                 # inline chart (same schema as *.chart.yaml)
    type: bar
    data:
      type: dbt
      model: sales_daily
    x: region
    y: sum(sales)
    filterBy: time

theme:
  # optional, light theming tokens only in v1
```

**Rules:**

- Inline chart shape ≡ standalone chart schema (one IR).  
- `dvfc charts extract <dash>` promotes inline → `*.chart.yaml`.  
- Addressability: `sales/by_region` (dash id / chart id).  
- Auto-compose (`dvfc dash compose --charts a,b,c`) emits a dash with `coordination.auto: true` and sensible layout.

---

## 5. Intermediate representation (IR)

```text
parse (yaml|toml|json)
  → ChartIR | DashIR
  → resolve connectors (dbt_metric | dbt | sql | data)
  → ResolvedDashIR (all charts inlined, relations bound)
  → renderer
```

**ResolvedDashIR** is renderer-agnostic: charts with bound SQL/paths, encodings, interaction graph, layout.

Packages:

| Package | Responsibility |
|---------|----------------|
| `@dvfc/core` | Types, JSON Schema, parse helpers |
| `@dvfc/core` | Connectors, grain checks, dbt semantic → SQL |
| `@dvfc/charts` | Discovery, addressability, extract, compose helpers |
| `@dvfc/render-mosaic` *(new or split from cli)* | Interactive HTML |
| `@dvfc/render-vega` *(new)* | SVG / PNG / static HTML fragment |
| `@dvfc/render-dc` | dc.js HTML: static CDN (`html-dc` / `html-dc-static`) or DuckDB-WASM (`html-dc-wasm`) |
| `@dvfc/cli` | UX over the above |
| `@dvfc/mcp` | Agent tools aligned to chart/dash |
| `python/dvfc` | SDK mirroring IR operations |

---

## 6. Renderers

| Target | Engine | Use |
|--------|--------|-----|
| `html` (interactive) | Mosaic + DuckDB-WASM | Dashes and single-chart preview with crossfilter |
| `html-dc` / `html-dc-static` | dc.js + crossfilter2 + d3 (CDN) | Shareable single-file page; CSV inlined; no WASM |
| `html-dc-wasm` | dc.js + DuckDB-WASM → crossfilter | Vite-bundled; CSV/Parquet via DuckDB, then native dc transitions |
| `svg` | Vega-Lite | Single chart (and optional small multi-view) |
| `png` | Vega-Lite → raster | Single chart CI / docs / agents |
| `html-static` | Vega-Lite embed | Non-WASM shareable page; multi-chart dashes link via VL `params` / `filter` |

**Capability matrix:** interaction (`brush` / `filterBy`) is honored in Mosaic HTML, dc.js (`html-dc` / `html-dc-static` / `html-dc-wasm`), and Vega-Lite `html-static`. SVG/PNG ignore interaction but keep encodings.

CLI sketch:

```bash
dvfc validate path/to/file.{yaml,toml,json}
dvfc preview sales.dash.yaml
dvfc build sales.dash.yaml -o dist --format html
dvfc build sales.dash.yaml -o dist-dc --format html-dc-static
dvfc build sales.dash.yaml -o dist-dc-wasm --format html-dc-wasm
dvfc build revenue_trend.chart.yaml -o out --format svg
dvfc build revenue_trend.chart.yaml -o out --format png
dvfc dash compose --charts a,b,c -o sales.dash.yaml
dvfc charts extract sales.dash.yaml --out-dir charts/
```

---

## 7. Extensible chart types (plugin system)

Built-in types remain (`line`, `bar`, `area`, `scatter`, …). **New types must be addable without forking core.**

### 7.1 Chart type module contract

Each type registers:

```ts
interface ChartTypeModule {
  id: string;                    // e.g. "hexbin", "sankey"
  spec: JSONSchema;              // extra encoding / options for this type
  capabilities: {
    mosaic?: boolean;
    vegaLite?: boolean;
    interaction?: Array<'brush' | 'filter' | 'toggle'>;
  };
  /** Map ChartIR → Mosaic/vgplot fragment */
  renderMosaic?(ctx: RenderContext): MosaicNode | string;
  /** Map ChartIR → Vega-Lite unit/spec */
  renderVegaLite?(ctx: RenderContext): VlSpec;
  /** Optional validate beyond base schema */
  validate?(chart: ChartIR): ValidationIssue[];
}
```

### 7.2 Registration

- **Built-ins:** `@dvfc/chart-types` (or `packages/chart-types/*`)  
- **User / package plugins:**  
  - `dvfc.config` → `chartTypes: ['./types/hexbin.js', '@acme/dvfc-sankey']`  
  - or `package.json` `"dvfc.chartTypes"` export  

CLI loads plugins at validate/build time. Unknown `type: sankey` → clear error listing registered ids.

### 7.3 Authoring a new type (intended DX)

1. Implement `ChartTypeModule` with at least one renderer (prefer both Mosaic + Vega-Lite when possible).  
2. Register in config or publish as npm package.  
3. Use `type: your_id` in any chart / inline dash chart.  
4. Add fixture under `examples/` + schema snapshot test.

If only one renderer is implemented, `build --format` for the other fails with “type X does not support svg” (not a silent blank).

---

## 8. dbt integration

| Mode | Behavior |
|------|----------|
| `dbt` model | Existing: `manifest.json` → relation / CSV path (keep) |
| `dbt_metric` | New: MetricFlow / semantic manifest → compiled SQL (or pre-materialized table in `target/`) |
| Fallback | If semantic layer unavailable, allow `sql:` that an agent/human pasted from `mf query` |

**No dvfc metric YAML.** Docs teach: define metrics in dbt; reference them from charts.

---

## 9. Python SDK

Mirror the IR, not a second product:

```python
from dvfc import Chart, Dash, build

chart = Chart.from_file("charts/revenue_trend.chart.yaml")
build(chart, format="svg", out="revenue.svg")

dash = Dash.parse({...})  # inline dict / path; supports inline charts
build(dash, format="html", out="dist/")
```

Prefer calling shared logic (JS CLI as subprocess *or* eventual Rust/wasm core). Short term: subprocess to `dvfc` CLI is acceptable if API is stable; medium term: thin native bindings or shared schema package.

---

## 10. Agents (MCP / skills)

Tools should align to atoms:

- `validate_chart` / `validate_dash`  
- `list_chart_types` (includes plugins)  
- `search_charts` / `get_chart`  
- `compose_dash`  
- `extract_charts`  
- `build` with `format`  
- `list_dbt_metrics` (when manifest/semantic artifacts present)  

Update `.cursor/skills/dvfc` to chart + dash vocabulary (retire “board” in skill copy).

---

## 11. Migration from v0.5 `board.yaml` (complete)

Legacy **`board.yaml`** and board-shaped specs are **removed** from examples, product docs, and the CLI. Author **`*.dash.yaml`** and atomic **`*.chart.yaml`** only. There is no board compat adapter; migrate older repos to dash IR before upgrading.

---

## 12. Non-goals (near term)

- Custom metric language / MetricFlow reimplementation  
- Observable Framework as core runtime  
- Full warehouse live-query platform (portable DuckDB-first; warehouse later)  
- Pixel-perfect editorial theme system matching dbt Charts Clarity (good defaults yes; theme market no)

---

## 13. Success criteria

- [x] Chart is the reusable, searchable, exportable atom (svg/png/html)  
- [x] Dash composes refs + inline charts with optional auto-coordination  
- [x] Data via `dbt_metric` | `dbt` | `sql` | `data` without a metric DSL  
- [x] New chart types via plugin registration  
- [x] Python SDK can validate + build chart and dash  
- [x] Agents use the same schemas as humans  

---

## 14. Related docs

- [ROADMAP.md](./ROADMAP.md), phased implementation plan  
- [dbt-integration.md](./dbt-integration.md), current model resolver (to extend)  
- [chart-discovery.md](./chart-discovery.md), search, get, list, `composeDash`, and dash-scoped addressability  
- Root `VERDICT.md`, Mosaic GO for interactive path (still valid for HTML renderer)
