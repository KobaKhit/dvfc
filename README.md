# Mosaic + dbt Architecture Spike

An architecture spike demonstrating **UW Mosaic** (`@uwdata/vgplot`) with **DuckDB-WASM** as a crossfilter engine for analytics dashboards, integrated with dbt-style data models.

## 🎯 What This Proves

This spike validates that we can:

1. ✅ **Compose Mosaic** for native crossfiltering (brush one chart → others update)
2. ✅ **Integrate dbt-style data models** via a simple manifest resolver
3. ✅ **Export self-contained static HTML** that works offline with DuckDB-WASM
4. ✅ **Ship a runnable demo** in under 5 minutes

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5174 in your browser.

## 📦 Build for Production

```bash
# Build static HTML bundle
npm run build

# Preview the production build
npm run preview
```

The built files are in `dist/` and can be opened directly in a browser (`dist/index.html`).

## 🏗️ Architecture

### Components

- **UW Mosaic** (`@uwdata/vgplot`) - Declarative visualization with built-in coordination
- **DuckDB-WASM** - In-browser SQL database (bundled by vgplot)
- **dbt-style models** - Fake manifest + CSV data that simulates dbt output
- **Vite** - Build tool for bundling everything into static HTML

### Data Flow

```
dbt manifest.json → DbtResolver → ref('model_name') → CSV files
                                                          ↓
                                        DuckDB-WASM loads CSV
                                                          ↓
                                        vgplot creates coordinated charts
                                                          ↓
                                        User brushes chart A
                                                          ↓
                                        Charts B & C auto-filter
```

### Files

- `dbt-stub/manifest.json` - Fake dbt manifest with model definitions
- `dbt-stub/*.csv` - Sample data tables (sales_daily, flights_summary)
- `src/dbt-resolver.ts` - Utility to resolve `ref('model_name')` to file paths
- `src/main.ts` - Dashboard implementation with Mosaic crossfiltering
- `src/index.html` - HTML entry point

## 🎨 Features Demonstrated

### Sales Dashboard
- **Bar chart** (Sales by Region) with brush selection
- **Bar chart** (Sales by Product) - filters when region is selected
- **Line chart** (Daily Sales Trend) - filters when region is selected

### Flights Dashboard
- **Bar chart** (Flights by Route) with brush selection
- **Bar chart** (Average Delay by Origin) - filters when route is selected
- **Line chart** (Daily Passenger Trend) - filters when route is selected

### Interactive Crossfiltering
1. Click and drag horizontally on any bar chart to create a selection
2. Other charts in the same section automatically filter
3. Click outside the selection to reset

## 📊 dbt Integration

The spike includes a minimal dbt-style workflow:

```typescript
import { DbtResolver } from './dbt-resolver';

const resolver = new DbtResolver(
  '../dbt-stub/manifest.json',
  '../dbt-stub'
);

// Resolve model name to file path (like dbt's ref() function)
const salesPath = resolver.ref('sales_daily');
// Returns: '../dbt-stub/sales_daily.csv'

// List all available models
const models = resolver.listModels();
// Returns: ['sales_daily', 'flights_summary']
```

### CLI Demo

Test the resolver from the command line:

```bash
# List all dbt models
npm run demo:resolver

# Get details for a specific model
npm run demo:resolver sales_daily
```

## 📝 Key Findings

See [VERDICT.md](./VERDICT.md) for the detailed go/no-go decision and recommendations.

## 📄 License

Apache-2.0
