# dvfc refactor plan

**Status:** complete (2026-09-26). Do not re-run these tasks.
**Repo root:** `/home/koba/Desktop/dvfc`

`dvfc` compiles declarative chart and dash specs into artifacts:

```
spec (YAML / TOML / JSON)  →  @dvfc/core (normalize → DashboardSpec + FileAsset[])  →  renderer  →  artifact
```

| Package | Formats | Tech |
| --- | --- | --- |
| `@dvfc/render-mosaic` | `html` | Mosaic + DuckDB-WASM, interactive |
| `@dvfc/render-vega` | `svg`, `png`, `html-static` | Vega-Lite, static, no browser |
| `@dvfc/render-dc` | `html-dc`, `html-dc-static`, `html-dc-wasm` | dc.js + crossfilter |

`html-dc` and `html-dc-static` are aliases for the same CDN + inlined CSV build. `@dvfc/cli` and `@dvfc/mcp` both call `@dvfc/build` `runBuildPipeline`.

Verification:

```bash
cd /home/koba/Desktop/dvfc
pnpm build && pnpm lint && pnpm test 2>&1 | grep -c "# fail 0"
```

That count is **9** (core, charts, render-mosaic, render-vega, render-dc, adapter-dbt, build, cli, mcp).

---

## Landed

| Task | What changed |
| --- | --- |
| 1 | Shared dc.js page shell in `packages/render-dc/src/shell.ts` (`html.ts` and `wasm.ts` both use it) |
| 2 | Shared build dispatcher `packages/build/src/dispatch.ts` (`runBuildPipeline`); CLI and MCP delegate to it |
| 3 | Shared `fileExists`, `publishedName`, and `escapeHtml` in `@dvfc/core` |
| 4 | dc.js marks split under `packages/render-dc/src/marks/` |
| 5 | CLI and adapter-dbt tests; coverage script includes mcp, render-dc, cli, and adapter-dbt |
| 6 | Dead exports removed (`buildPackageDir`, `createDcWasmPreviewViteConfig`, `toModelInfo`, `unregisterChartType`, `SpecValidator`, unused Mosaic color helpers, `buildHighlightInteractor`) |
| 7 | Shared DuckDB load SQL in `packages/core/src/duckdb-load.ts` (`duckDbCreateTableSql`) |

Streamlining pass (same date, separate from Tasks 1–7):

| Item | Where |
| --- | --- |
| One `chartIRToChartSpec` | `packages/core/src/compat.ts`, used by normalize and discovery |
| Spec reads go through `parseSpecString` | validate, discovery, compose, dash-mutate, chart-ref loading |
| Mosaic cell fill | `.dvfc-plot`, `mosaicPlotSizeOptions`, embed `data-chart-type` |
| Chart type ids | `BUILTIN_CHART_TYPE_IDS` drives the TS union and the JSON Schema enum |
| dbt stubs | `packages/build/src/dbt-stub.ts` shared by validate and HTML build |
| Mosaic dispatch | `BUILTIN_MOSAIC_GENERATORS` in `packages/render-mosaic/src/generator.ts` |
| MCP chart edits | `create_chart` / `update_chart` accept ChartIR via `ChartMutationInput` |

Product phases 0–8 are recorded in `docs/ROADMAP.md`.

---

## Still open (not cleanup)

These need a product decision. They were out of scope for this refactor:

- `interaction.filterBy` linked filtering in `@dvfc/render-dc` (Mosaic already honors it).
- SVG/PNG export from the dc.js renderer.
- Matching the Vega-Lite theme to the Mosaic/dc navy palette.
- Changes to `resolveDataRef` SQL rewriting or dbt stub discovery in `packages/core/src/normalize.ts`.
- Renaming published package exports (check `scripts/`, `python/`, and `docs/` first).

Publish, live warehouse adapters, and the Observable Framework emit spike are listed under **Remaining** in `docs/ROADMAP.md`.
