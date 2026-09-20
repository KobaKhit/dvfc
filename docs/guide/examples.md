# Examples

Canonical demos live under `examples/`.

## Gallery (marketing site)

| Spec | Live |
|------|------|
| `examples/site-gallery/showcase.dash.yaml` | [Mosaic showcase](https://kobakhit.github.io/dvfc/examples/showcase/) · [dc.js](https://kobakhit.github.io/dvfc/examples/showcase-dc/) |
| `examples/sales-dash/sales.dash.yaml` | [Sales & Flights](https://kobakhit.github.io/dvfc/examples/sales-dash/) |
| `examples/web-analytics/web-analytics.dash.yaml` | [Web Analytics](https://kobakhit.github.io/dvfc/examples/web-analytics/) |
| `examples/dbt-jaffle/jaffle.dash.yaml` | [dbt Jaffle](https://kobakhit.github.io/dvfc/examples/dbt-jaffle/) |
| `examples/revenue-analysis/revenue-analysis.dash.yaml` | [Revenue](https://kobakhit.github.io/dvfc/examples/revenue-analysis/) |

Chart type catalog (SVG pages): [charts.html](https://kobakhit.github.io/dvfc/charts.html)

## Local preview

```bash
pnpm exec dvfc preview examples/site-gallery/showcase.dash.yaml
pnpm exec dvfc build examples/site-gallery/showcase.dash.yaml \
  -o /tmp/showcase-dc.html --format html-dc-static
```

## Atomic charts

Reusable `*.chart.yaml` files under `examples/charts/` — good for SVG export and compose.

More: [examples/README.md](https://github.com/KobaKhit/dvfc/blob/main/examples/README.md).
