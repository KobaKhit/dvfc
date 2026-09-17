# Web Analytics Dashboard

A comprehensive web analytics dashboard tracking page views, traffic sources, and conversion metrics.

## Features

**Traffic Analysis:**
- Daily page views with time-based filtering
- Views breakdown by page
- Bounce rate analysis by page

**Conversion Metrics:**
- Daily revenue tracking
- Revenue by traffic source
- Conversions by source

**Crossfiltering:**
- Brush date range on traffic chart → filters page metrics
- Brush date range on revenue chart → filters conversion metrics

## Quick Start

```bash
# From repository root
cd /workspace

# Validate the spec
pnpm exec coordboard validate examples/web-analytics/board.yaml

# Preview with hot reload
pnpm exec coordboard preview examples/web-analytics/board.yaml

# Build static HTML
pnpm exec coordboard build examples/web-analytics/board.yaml --out-dir dist/web-analytics
```

## Data Sources

Uses dbt-style models:
- `page_views` - Daily metrics per page (views, sessions, bounce rate, duration)
- `conversions` - Daily conversion metrics per source (conversions, revenue, cost)

## How to Use

1. **Brush the traffic charts** (Daily Page Views) to select a date range
2. **Watch page metrics update** automatically
3. **Brush the revenue chart** to analyze conversion patterns
4. **Click outside** to reset filters

## Customization

Edit `board.yaml` to:
- Add more metrics (ROI, cost per conversion)
- Change chart types (add number KPIs)
- Adjust layout (grid vs flex)
- Modify colors and styling
