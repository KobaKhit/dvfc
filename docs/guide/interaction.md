# Interaction

Crossfiltering links charts through named selections.

## Spec fields

| Field | Role |
|-------|------|
| `interaction.publishes` / `selection` | Name of the selection this chart writes |
| `interaction.filterBy` | Selection(s) this chart reads |
| `interaction.brush` | Enable brush / region select |
| `interaction.brushAxis` | `x`, `y`, or `xy` when relevant |
| `interaction.select` | `auto` / point vs interval hints |

Example:

```yaml
# Publisher
interaction:
  brush: true
  brushAxis: x
  publishes: era

# Subscriber
interaction:
  filterBy: era
```

A chart can both publish and filter (e.g. timeline that also reacts to itself via dash coordination rules).

## Per renderer

| Format | Engine | How filters work |
|--------|--------|------------------|
| `html` | Mosaic + DuckDB-WASM | `Selection.crossfilter` → SQL predicates |
| `html-dc` / `html-dc-static` | dc.js + crossfilter | Shared crossfilter per data source |
| `html-dc-wasm` | DuckDB-WASM → crossfilter → dc.js | Load via DuckDB, filter in crossfilter |
| `html-static` | Vega-Lite | Linked `params` + `filter` transforms |
| `svg` / `png` | Vega-Lite | No interaction (snapshot) |

## URL state

Mosaic HTML builds can persist brush state in the query string for shareable filtered views.
