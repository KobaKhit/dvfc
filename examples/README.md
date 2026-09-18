# Examples Gallery

Interactive dashboard examples demonstrating dvfc capabilities.

## Available Examples

### 1. Sales & Flights Dashboard
**Path:** `examples/sales-board/`  
**Domain:** Business analytics  
**Charts:** 6 (3 sales, 3 flights)

**Features:**
- Multi-section coordinated dashboard
- Sales analytics with region and product breakdown
- Flight operations with delay analysis
- Time-based brushing and filtering

**Quick start:**
```bash
pnpm exec dvfc preview examples/sales-board/board.yaml
```

---

### 2. Web Analytics Dashboard
**Path:** `examples/web-analytics/`  
**Domain:** Web traffic & conversions  
**Charts:** 6 (3 traffic, 3 conversions)

**Features:**
- Page view tracking and bounce rate analysis
- Revenue and conversion metrics by source
- Dual filtering sections (traffic + conversions)
- Flex layout with responsive design

**Quick start:**
```bash
pnpm exec dvfc preview examples/web-analytics/board.yaml
```

---

### 3. dbt Jaffle Shop
**Path:** `examples/dbt-jaffle/`  
**Domain:** E-commerce order analytics  
**Charts:** 4 (revenue trends, payment methods, customers, status)

**Features:**
- Real dbt project structure with manifest
- Customer order analytics
- Revenue and payment method breakdown
- Order status distribution

**Quick start:**
```bash
pnpm exec dvfc preview examples/dbt-jaffle/board.yaml
```

---

### 4. Revenue Analysis with Insights
**Path:** `examples/revenue-analysis/`  
**Domain:** Financial performance with analysis overlays  
**Charts:** 7 (3 narrative text blocks, 4 analytical charts)

**Features:**
- **Analysis overlays**: Mean, median, linear trend, moving averages (5-day, 7-day)
- **Narrative text blocks**: Executive summary, insights, methodology
- Revenue, profit, and cost trend analysis
- Regional performance breakdown
- Grid layout with mixed content types

**Demonstrates:**
- `overlays` field: multiple analysis layers per chart
- `type: text` charts: Markdown → HTML rendering
- Shareable filter state: URL encodes brush selections
- Complex dashboard with narrative + data

**Quick start:**
```bash
pnpm exec dvfc preview examples/revenue-analysis/board.yaml
```

---

## Common Commands

### Validate a board
```bash
pnpm exec dvfc validate examples/<example>/board.yaml
```

### Preview with hot reload
```bash
pnpm exec dvfc preview examples/<example>/board.yaml
```

### Build static HTML
```bash
pnpm exec dvfc build examples/<example>/board.yaml --out-dir dist/<example>
```

## Example Structure

Each example follows this structure:
```
examples/<name>/
├── board.yaml           # Dashboard specification
├── README.md            # Example-specific docs
└── dbt-stub/
    ├── manifest.json    # dbt manifest
    └── *.csv            # Data files
```

## Creating Your Own

1. Copy an existing example as a template
2. Update `board.yaml` with your data sources and charts
3. Add your CSV files to `dbt-stub/`
4. Update `dbt-stub/manifest.json` with your models
5. Validate and preview

```bash
pnpm exec dvfc validate your-board.yaml
pnpm exec dvfc preview your-board.yaml
```

## Learn More

- [Main README](../README.md) - Full documentation
- [VERDICT.md](../VERDICT.md) - Architecture decisions
- [Mosaic Docs](https://idl.uw.edu/mosaic/) - Visualization library
