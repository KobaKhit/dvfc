# Using dvfc with Real dbt Projects

This guide shows how to use dvfc with a real dbt project's `target/manifest.json`.

## Prerequisites

- A dbt project with `target/manifest.json` generated
- dvfc CLI installed (`pnpm install` from repo root)

## Quick Start with Real dbt

### 1. Generate dbt Manifest

In your dbt project directory:

```bash
# Parse your dbt project to generate manifest
dbt parse

# Or run your project (also generates manifest)
dbt run

# Verify manifest exists
ls -lh target/manifest.json
```

### 2. Generate Dashboard Spec from dbt

```bash
# From your dbt project root
dvfc init --from-dbt \
  --manifest-path target/manifest.json \
  -o *.dash.yaml
```

This will:
- Read your `target/manifest.json`
- Find mart models (in `marts` schema or tagged with `mart`)
- Auto-generate charts based on column types
- Create time-series + bar charts for common patterns

### 3. Prepare Data Files

dvfc needs CSV exports of your dbt models. You have two options:

#### Option A: Use dbt seeds (recommended for dashboards)

```bash
# In your dbt project
mkdir -p seeds/dashboard_data

# Export specific models as seeds
dbt show --select my_model --output json | \
  jq -r '(.[0] | keys_unsorted) as $keys | $keys, map([.[$keys[]]])[] | @csv' \
  > seeds/dashboard_data/my_model.csv

# Update dbt_project.yml
# seeds:
#   my_project:
#     dashboard_data:
#       +schema: dashboard
```

#### Option B: Export from your data warehouse

```sql
-- DuckDB
COPY (SELECT * FROM my_model) TO 'my_model.csv' (HEADER, DELIMITER ',');

-- PostgreSQL
\copy (SELECT * FROM my_model) TO 'my_model.csv' CSV HEADER

-- Snowflake
COPY INTO @my_stage/my_model.csv
FROM my_model
FILE_FORMAT = (TYPE = CSV HEADER = TRUE);
```

### 4. Set Up Directory Structure

```
my-dbt-project/
├── dbt-stub/                    # Or any name you prefer
│   ├── manifest.json            # Copy from target/manifest.json
│   ├── customers.csv            # Your exported data
│   ├── orders.csv
│   └── revenue_summary.csv
├── *.dash.yaml                   # Your dashboard spec
└── dbt_project.yml              # Your dbt project file
```

**Copy manifest:**
```bash
mkdir -p dbt-stub
cp target/manifest.json dbt-stub/
cp path/to/exported/*.csv dbt-stub/
```

### 5. Edit Generated Dashboard

The generated `*.dash.yaml` is a starting point. Customize it:

```yaml
meta:
  title: "My Analytics Dashboard"
  description: "Revenue and customer insights"
  version: "0.1.0"

data:
  - id: revenue_summary
    type: dbt
    model: revenue_summary  # Must match model name in manifest

charts:
  - id: daily_revenue
    type: line
    dataSource: revenue_summary
    title: "Daily Revenue Trend"
    encoding:
      x: { field: date, type: temporal }
      y: { field: revenue, aggregate: sum }
    interaction:
      brush: true
      selection: dateBrush
    width: 700
    height: 250
```

### 6. Validate and Build

```bash
# Validate
dvfc validate *.dash.yaml

# Preview with hot reload
dvfc preview *.dash.yaml

# Build static HTML
dvfc build *.dash.yaml -o dist
```

## manifest.json Location

dvfc looks for `dbt-stub/manifest.json` relative to your `*.dash.yaml` by default.

**Custom location:**
- Edit your *.dash.yaml path if needed
- dvfc CLI assumes `dbt-stub/` in the same directory as *.dash.yaml
- For now, you need to copy manifest and CSVs to this location

**Future:** Direct `--manifest-path` and `--data-dir` flags on build/preview commands.

## Common Patterns

### Pattern 1: Mart Models Dashboard

```bash
# Generate from marts only
dvfc init --from-dbt \
  --manifest-path target/manifest.json \
  -o marts-*.dash.yaml

# dvfc auto-detects models in marts/ schema
```

### Pattern 2: Specific Models Dashboard

Manually edit *.dash.yaml to reference specific models:

```yaml
data:
  - id: fact_orders
    type: dbt
    model: fact_orders
  
  - id: dim_customers
    type: dbt
    model: dim_customers

charts:
  - id: orders_trend
    type: line
    dataSource: fact_orders
    # ...
```

### Pattern 3: Real-time Development

```bash
# Terminal 1: dbt
cd my-dbt-project
dbt run --select +my_model

# Terminal 2: Export and copy
dbt show --select my_model --limit 1000 > /tmp/my_model.json
jq -r '...' /tmp/my_model.json > dbt-stub/my_model.csv

# Terminal 3: Preview dashboard
dvfc preview *.dash.yaml
```

## Refreshing Data

When your dbt models change:

```bash
# 1. Re-run dbt
dbt run

# 2. Re-export data
# (use your preferred export method)

# 3. Copy new CSVs to dbt-stub/
cp new-exports/*.csv dbt-stub/

# 4. If schema changed, regenerate dash scaffold
dvfc init --from-dbt -o dash-new.yaml
# Merge changes into your existing *.dash.yaml
```

## Troubleshooting

### "dbt manifest not found"

dvfc expects `dbt-stub/manifest.json` next to your `*.dash.yaml`.

```bash
# Check paths
ls -la dbt-stub/manifest.json
ls -la *.dash.yaml

# They should be in the same directory
```

### "dbt model not found"

The model exists in manifest but CSV file is missing.

```bash
# Check model name matches
cat *.dash.yaml | grep "model:"
ls dbt-stub/*.csv

# Ensure model name matches CSV filename
# *.dash.yaml: model: revenue_summary
# File: dbt-stub/revenue_summary.csv
```

### Empty or missing data

```bash
# Verify CSV has data
wc -l dbt-stub/my_model.csv
head dbt-stub/my_model.csv

# Should have header + data rows
```

### Manifest out of sync

```bash
# Regenerate manifest
cd my-dbt-project
dbt parse
cp target/manifest.json path/to/dvfc/dbt-stub/
```

## Best Practices

1. **Version control**: Commit *.dash.yaml, not dbt-stub/ (data is transient)
2. **Data freshness**: Document when CSVs were exported
3. **Sample data**: Use `LIMIT 10000` for faster dashboards
4. **Model selection**: Focus on mart/analytics models, not raw staging
5. **Iteration**: Start with 2-3 charts, expand as you validate

## Examples

See [`examples/dbt-jaffle/`](../examples/dbt-jaffle/) for a complete working example with realistic dbt manifest and data.

## See Also

- [dbt Documentation](https://docs.getdbt.com/)
- [Chart Discovery](./chart-discovery.md)
- [Main README](../README.md)
