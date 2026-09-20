# Sales & Flights Dashboard Example

Declarative dash demo with Mosaic crossfiltering and dbt-style data models.

**Canonical path:** `sales.dash.yaml` via the `dvfc` CLI (same path CI and the site gallery use).

## Quick Start

```bash
# From repo root (after pnpm install && pnpm build)
pnpm exec dvfc preview examples/sales-dash/sales.dash.yaml
pnpm exec dvfc build examples/sales-dash/sales.dash.yaml -o dist/sales --format html

# Or from this directory
pnpm preview   # dvfc preview sales.dash.yaml
pnpm build     # dvfc build → dist/
```

Root shortcuts: `pnpm example:sales` / `pnpm example:build` / `pnpm example:preview`.

## Dashboard Sections

### Sales
- **Total sales** (`number`) — KPI updates with the brush
- **Daily sales** (`area`) — brush the date range
- **Sales by region** (`bar`)
- **Product mix** (`pie`)
- **Region × product** (`heatmap`)
- **Units vs sales** (`scatter`)

### Flights
- **Daily passengers** (`area`) — independent brush
- **Delay vs passengers** (`scatter`)
- **Delay distribution** (`histogram`)
- **Average delay by origin** (`bar`)
- **Flights by origin** (`bar`)
- **Route summary** (`table`)

## How Crossfiltering Works

1. **Click and drag** horizontally on either area chart to select a date range
2. Charts in that section **automatically filter** to the selected dates
3. **Click outside** the selection to reset
4. Sales and flights each have their own brush selection

## Files

- `sales.dash.yaml` — Dash IR (canonical; use with `dvfc validate` / `preview` / `build`)
- `dbt-stub/manifest.json` — Fake dbt manifest
- `dbt-stub/*.csv` — Sample data files

## Data Sources

- `ref('sales_daily')` → `dbt-stub/sales_daily.csv`
- `ref('flights_summary')` → `dbt-stub/flights_summary.csv`
