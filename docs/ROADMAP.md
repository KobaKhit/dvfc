# dvfc Roadmap

**Companion to:** [ARCHITECTURE.md](./ARCHITECTURE.md)  
**Last updated:** 2026-09-20  
**Goal:** Evolve from board-centric Mosaic HTML tool → chart/dash compiler with multi-format export, dbt semantic metrics, and pluggable chart types.

---

## Guiding principles

1. **Ship vertical slices** — each phase leaves `validate` / `preview` / `build` working.  
2. **Don’t break examples** — migrate with aliases; rename publicly when IR is stable.  
3. **Chart plugins early enough** — avoid hard-coding types into the generator forever.  
4. **No metric DSL** — spend integration budget on dbt semantic → SQL, not a new language.

---

## Phase 0 — Spec freeze & docs (now)

**Outcome:** Shared written contract for implementation.

- [x] Write `docs/ARCHITECTURE.md` (chart / dash / connectors / renderers / plugins)  
- [x] Write this roadmap  
- [x] Add ADR stub: “No metric language; dbt owns semantics” (`docs/adr/001-no-metric-language.md`)  
- [x] Sketch JSON Schema drafts for `Chart` + `Dash` in `packages/core` (ChartIR / DashIR)

**Exit:** Contributors can implement against ARCHITECTURE without re-litigating naming.

---

## Phase 1 — IR + parse (YAML / TOML / JSON)

**Outcome:** One parser path; board files still load as dashes.

| Task | Detail |
|------|--------|
| Types | `ChartIR`, `DashIR`, `DataRef` (`dbt_metric` \| `dbt` \| `sql` \| `data`) in `@dvfc/core` |
| Schema | JSON Schema export; AJV validate via CLI |
| Parse | YAML + JSON + TOML (`smol-toml`) |
| Compat | `DashboardSpec` / `board.yaml` → adapter → `DashIR` (inline charts) |
| Tests | Fixtures in `packages/core/test` + example `*.chart.yaml` / `*.dash.yaml` |

**Status:** ✅ Landed in `@dvfc/core` + CLI `validate` / `charts types`

**Exit:** `dvfc validate` accepts `*.chart.*` and `*.dash.*` and legacy boards.

---

## Phase 2 — Chart type registry (extensibility foundation)

**Outcome:** Built-ins registered as plugins; generator no longer is a giant switch forever.

| Task | Detail |
|------|--------|
| Contract | `ChartTypeModule` in `@dvfc/core` |
| Built-ins | Metadata registered for line/bar/area/… (`registerBuiltinChartTypes`) |
| Loader | `loadChartTypeModules` + example plugin fixture |
| CLI | `dvfc charts types` lists ids + capabilities |
| Docs | ARCHITECTURE §7 — full Mosaic/Vega render move still open |

**Status:** ✅ Registry + builtins + CLI list; Mosaic generator checks `renderMosaic` plugin hook (`@dvfc/render-mosaic`); Vega export checks `renderVegaLite` / `capabilities.vegaLite` (`@dvfc/render-vega`)

**Exit:** Adding a stub type (e.g. `hello`) works via local plugin without editing `generator.ts` internals.

---

## Phase 3 — Resolve layer (connectors)

**Outcome:** Charts bind to resolved relations before render.

| Task | Detail |
|------|--------|
| `data` / `sql` / `dbt` model | Port existing dbt-adapter behavior into `@dvfc/resolve` |
| Grain checks | Multi-measure alignment validation |
| `dbt_metric` (MVP) | Integrate MetricFlow compile **or** read prebuilt semantic SQL/artifacts; document required dbt version |
| Errors | Path-aware: “metric X not found”, “grain mismatch” |

**Status:** ✅ `resolveDataRef` + `findDbtStubDir` in `@dvfc/core`; public package `@dvfc/resolve`; `dbt_metric` via compiled SQL fixtures (`examples/charts/semantic/`)

**Exit:** Resolved IR available to Mosaic generator; semantic metric path works on at least one example (can be stubbed SQL if MF wiring is partial, but API shape final).

---

## Phase 4 — Dash compose & discovery retarget

**Outcome:** Chart atom + dash composition are the product verbs.

| Task | Detail |
|------|--------|
| Discovery | Index `*.chart.*` and charts inside `*.dash.*` |
| Keys | `dashId/chartId` (replace `board__chart` gradually) |
| `dvfc dash compose` | From chart ids → dash YAML with `coordination.auto` |
| `dvfc charts extract` | Inline → files |
| MCP | Rename/add tools; keep temporary aliases |
| Skill | Update `.cursor/skills/dvfc` |

**Status:** ✅ `dvfc dash compose`, `dvfc charts extract`, discovery over `*.chart.*` / dashes

**Exit:** Compose → validate → preview dash works on examples.

---

## Phase 5 — Mosaic renderer (dash HTML) on new IR

**Outcome:** Interactive HTML builds from Dash IR (legacy boards still work via adapter).

| Task | Detail |
|------|--------|
| Split | Extract generator from CLI into `@dvfc/render-mosaic` |
| Coordination | Implement `coordination.auto` + explicit `publishes` / `filterBy` |
| Preview/build | Wire CLI to ResolvedDashIR |
| Examples | Migrate 1–2 examples to `*.dash.yaml`; keep others on adapter |

**Status:** ✅ Builds from chart/dash IR via `normalizeFile` → `@dvfc/render-mosaic`; examples under `examples/charts` + `examples/dashes` + migrated `*.dash.yaml` siblings

**Exit:** Sales example as dash + charts; crossfilter parity with current site demos.

---

## Phase 6 — Vega-Lite export (SVG / PNG)

**Outcome:** Minimum portable artifacts from a chart spec.

| Task | Detail |
|------|--------|
| `@dvfc/render-vega` | ChartIR → VL spec |
| Built-ins | Implement `renderVegaLite` for core types (line, bar, area, scatter, …) |
| CLI | `--format svg\|png` on chart (dash → zip of charts or “primary chart” policy — document choice) |
| Plugins | Types without VL renderer error clearly |
| CI | Golden SVG tests for fixtures |

**Status:** ✅ CLI `--format svg|png` via `@dvfc/render-vega`; golden SVG smoke test; dash multi-chart requires `--chart <id>`

**Exit:** `dvfc build chart.yaml --format svg` and `--format png` documented and tested.

---

## Phase 7 — Python SDK

**Outcome:** First-class Python authoring/export without teaching Node.

| Task | Detail |
|------|--------|
| API | `Chart`, `Dash`, `validate`, `build` |
| Formats | html / svg / png |
| Packaging | PyPI-ready; examples in `python/` |
| Bridge | CLI subprocess OK initially; note replacement path |

**Status:** ✅ `DataVizFactoryClient.build(..., format=)` + validate; `python/smoke_test.py`

**Exit:** `pip install` / `uv add` path mirrors ARCHITECTURE examples.

---

## Phase 8 — Polish, migrate, publish

| Task | Detail |
|------|--------|
| Migrate | All examples → chart/dash; site copy; README |
| Deprecate | `board` wording warnings → removal schedule |
| Docs site | Architecture + “add a chart type” + dbt metrics |
| Optional | `dvfc emit framework` spike (non-blocking) |
| Optional | Parquet / remote URL connectors |

**Status:** ✅ Example `*.dash.yaml` siblings + `examples/charts` / `examples/dashes`; README + MCP + skill retarget; `docs/add-chart-type.md`, `docs/dbt-metrics.md`; legacy `board.yaml` deprecated with compat; Parquet + http(s) URL in `data` connector; `@dvfc/render-mosaic` / `@dvfc/render-vega` packages

---

## Suggested near-term order (execution)

```text
Phase 0 (done-ish) → 1 (IR) → 2 (registry) → 3 (resolve)
    → 5 (mosaic on IR) → 4 (compose/discovery)  # 4 can overlap 5
    → 6 (svg/png) → 7 (python) → 8 (migrate)
```

Compose (4) can start as soon as IR exists; Mosaic split (5) unblocks HTML confidence; SVG/PNG (6) is the “beat dbt Charts on portable atoms” milestone.

---

## Milestone definitions

| Milestone | User-visible win |
|-----------|------------------|
| **M1 — Chart atom** | Author/validate `*.chart.yaml`; list types; plugins load |
| **M2 — Dash** | Author dash with inline + refs; auto-coordination preview |
| **M3 — Portable** | SVG + PNG from chart; Python `build(..., format="svg")` |
| **M4 — dbt semantic** | Real `dbt_metric` against a sample dbt project |
| **M5 — Clean break** | No “board” in docs/examples; site + MCP updated — **in progress** (dash-first docs; board compat remains) |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| MetricFlow / semantic API churn | Stable Chart `data.type: dbt_metric` shape; isolate in `@dvfc/resolve` |
| Dual renderer drift (Mosaic vs VL) | Shared encoding IR; per-type capability flags; golden tests |
| Big-bang rewrite | Adapter from `board.yaml`; phase Mosaic last among IR steps |
| Plugin security | Load only configured paths; no arbitrary remote code in default CI |

---

## Immediate next implementation tasks (when you say go)

1. Add `ChartSpec` / `DashSpec` / `DataRef` to `@dvfc/core` + JSON Schema.  
2. Introduce chart type registry; wrap existing `line`/`bar` as modules.  
3. Compat layer: load current `examples/*/board.yaml` as dashes.  
4. Spike `renderVegaLite` for `line` + `bar` → SVG.  
5. Spike `dbt_metric` resolve against one MetricFlow-enabled fixture (or documented compile step).

---

## Open decisions (resolve during Phase 1–3)

1. **Dash → SVG/PNG:** export all charts as a directory vs require `--chart id`?  
2. **Config file name:** `dvfc.config.js` vs `dvfc.toml`?  
3. **dbt_metric MVP:** live MetricFlow invoke vs checked-in compiled SQL fixtures first?  
4. **Package layout:** monorepo split `@dvfc/render-*` now vs later?

Defaults if unspecified: (1) `--chart` required for svg/png from dash, (2) `dvfc.config.js` + optional toml, (3) compiled SQL fixtures first then live MF, (4) split render packages when Phase 5 starts.
