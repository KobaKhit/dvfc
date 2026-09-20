# Sales & Flights Dashboard Example

This example demonstrates a complete working dashboard with Mosaic crossfiltering, dbt-style data models, and static HTML export.

## Features Demonstrated

✅ **Multi-chart dashboard** with 6 interactive visualizations  
✅ **Time-based crossfiltering** via Mosaic selections  
✅ **dbt integration** with manifest.json and ref() lookups  
✅ **Static HTML export** that works offline with DuckDB-WASM  
✅ **Dashboard spec** (*.dash.yaml) showing declarative configuration

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
# Opens at http://localhost:5174

# Build static HTML
pnpm build
# Output in dist/

# Preview production build
pnpm preview
# Opens at http://localhost:5174
```

## Dashboard Sections

### Sales Analytics
- **Daily Sales Trend** (line chart) - Brush to filter by date range
- **Sales by Region** (bar chart) - Filters based on date selection
- **Sales by Product** (bar chart) - Filters based on date selection

### Flights Analytics
- **Daily Passengers** (line chart) - Brush to filter by date range
- **Flights by Origin** (bar chart) - Filters based on date selection
- **Average Delay** (bar chart) - Filters based on date selection

## How Crossfiltering Works

1. **Click and drag** horizontally on either line chart to select a date range
2. The bar charts in that section **automatically filter** to show only data from the selected dates
3. **Click outside** the selection to reset and show all data
4. Each section (Sales / Flights) has its own independent selection

## Files

- `*.dash.yaml` - Dashboard specification (shows target format for v0.1)
- `src/main.ts` - Current Mosaic implementation (manual)
- `src/index.html` - HTML entry point
- `dbt-stub/manifest.json` - Fake dbt manifest
- `dbt-stub/*.csv` - Sample data files
- `dist/` - Built static HTML (after `pnpm build`)

## Data Sources

Data comes from dbt-style models referenced in the manifest:
- `ref('sales_daily')` → `dbt-stub/sales_daily.csv`
- `ref('flights_summary')` → `dbt-stub/flights_summary.csv`

## Architecture

```
*.dash.yaml
    ↓
(Future: CLI renders to Mosaic code)
    ↓
Mosaic + DuckDB-WASM
    ↓
Interactive dashboard with crossfiltering
```

**Current state:** Manual Mosaic code in `src/main.ts`  
**v0.1 goal:** CLI reads `*.dash.yaml` and generates the Mosaic code automatically

## Technologies

- **UW Mosaic** - Coordination and crossfiltering
- **DuckDB-WASM** - In-browser SQL analytics
- **Vite** - Build tool and dev server
- **TypeScript** - Type-safe development
