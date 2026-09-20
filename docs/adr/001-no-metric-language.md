# ADR 001: No metric language, dbt owns semantics

**Status:** Accepted  
**Date:** 2026-09-20

## Context

Products adjacent to dvfc sometimes invent a mini metric DSL (YAML measures, rollups, time grains). That duplicates dbt’s semantic layer / MetricFlow and creates two sources of truth.

## Decision

dvfc charts bind to data via connectors only:

| `data.type` | Meaning |
|-------------|---------|
| `dbt_metric` | Named dbt semantic metric; resolve via compiled SQL artifact (or future live MF) |
| `dbt` | dbt model CSV / relation |
| `sql` | Engine SQL (DuckDB in Mosaic builds) |
| `data` | File path or already-loaded table |

There is **no** dvfc-owned metric expression language.

## Consequences

- Integration budget goes to MetricFlow / manifest wiring, not a new compiler.
- Authors who lack dbt still use `sql` or `data`.
- Errors point at missing metrics/files, not inventing formulas.
