# Site thumbnail charts

Small `*.chart.yaml` specs used by `scripts/build-site.sh` to export real Vega-Lite
SVGs into `site/assets/previews/` for the marketing gallery and chart-type tiles.

```bash
pnpm exec dvfc build examples/site-thumbs/line_demo.chart.yaml --format svg
bash scripts/build-site.sh
```
