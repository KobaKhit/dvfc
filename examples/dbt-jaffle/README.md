# Jaffle Shop Analytics Dashboard

Real dbt-shaped example based on the classic [dbt jaffle_shop](https://github.com/dbt-labs/jaffle_shop) project.

## Structure

```
dbt-jaffle/
├── board.yaml          # Dashboard spec (manually created)
└── dbt-stub/
    ├── manifest.json   # dbt manifest with lineage
    ├── customers.csv   # Raw customer data
    ├── orders.csv      # Raw order data
    ├── payments.csv    # Raw payment data
    └── customer_orders.csv  # Mart model (joined data)
```

## Features

- **Real dbt manifest**: Includes proper lineage, schemas, and metadata
- **Multi-model lineage**: Seeds → Mart model dependency graph
- **Realistic data**: Customer orders with payments (25 orders, 15 customers)
- **Coordinated views**: Time-series brush filters bar charts

## Running

```bash
# From repo root
coordboard validate examples/dbt-jaffle/board.yaml
coordboard preview examples/dbt-jaffle/board.yaml
coordboard build examples/dbt-jaffle/board.yaml -o dist/jaffle
```

## Testing init from dbt

This example can also be regenerated using:

```bash
cd examples/dbt-jaffle
coordboard init --from-dbt -o board-generated.yaml
```

The `init --from-dbt` command reads `dbt-stub/manifest.json` and scaffolds a starter `board.yaml` with charts for mart models.
