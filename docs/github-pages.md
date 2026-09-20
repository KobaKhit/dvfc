# GitHub Pages

The project deploys automatically to **[https://kobakhit.github.io/dvfc/](https://kobakhit.github.io/dvfc/)**.

Documentation (MkDocs) is published at **[https://kobakhit.github.io/dvfc/docs/](https://kobakhit.github.io/dvfc/docs/)**.

## Live examples

- [Showcase (Mosaic)](https://kobakhit.github.io/dvfc/examples/showcase/)
- [Showcase (dc.js)](https://kobakhit.github.io/dvfc/examples/showcase-dc/)
- [Sales & Flights](https://kobakhit.github.io/dvfc/examples/sales-dash/)
- [Web Analytics](https://kobakhit.github.io/dvfc/examples/web-analytics/)
- [dbt Jaffle Shop](https://kobakhit.github.io/dvfc/examples/dbt-jaffle/)
- [Revenue Analysis](https://kobakhit.github.io/dvfc/examples/revenue-analysis/)
- [Chart types gallery](https://kobakhit.github.io/dvfc/charts.html)

## Build pipeline

`.github/workflows/pages.yml` on push to `main`:

1. `pnpm install` + `pnpm build`
2. Install MkDocs via `uv` + `requirements-docs.txt`
3. `./scripts/build-site.sh` — Mosaic examples, dc.js showcase, SVG previews, marketing pages, then MkDocs → `site/docs/`
4. Upload `site/` to GitHub Pages

### Always use the CLI for dashboards

Examples must be built with `dvfc build`, not ad-hoc Vite configs. The CLI sets the correct `--base` (e.g. `/dvfc/examples/sales-dash/`) and stages `data/` next to each example.

```bash
./scripts/build-site.sh
```

### Site layout

```text
site/
├── index.html
├── charts.html
├── style.css
├── docs/                 # MkDocs Material
├── assets/previews/
└── examples/
    ├── showcase/
    ├── showcase-dc/
    ├── sales-dash/
    │   ├── index.html
    │   ├── assets/
    │   └── data/
    └── ...
```

## Base path

This is a **project** Pages site under `/dvfc/`. Pass `--base` when building Mosaic / wasm apps so JS and CSV URLs resolve.

## Local preview

```bash
pnpm build
./scripts/build-site.sh
npx serve site -p 3000
# Marketing: http://localhost:3000/  (or open index.html via a /dvfc/ rewrite)
# Docs:      http://localhost:3000/docs/
```

For docs-only iteration:

```bash
./scripts/build-docs.sh   # or: pnpm docs:serve
```

## Repository settings

**Settings → Pages → Source** must be **GitHub Actions** (not “Deploy from a branch”).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Workflow: Pages not enabled | Set Pages source to GitHub Actions |
| Asset 404s | Rebuild with correct `--base /dvfc/examples/<name>/` |
| `/dbt-stub/` in output | Use CLI build only; run verification in `build-site.sh` |
| DuckDB fails offline | WASM often loads from CDN on first visit |
| Docs missing | Ensure `uv`/`mkdocs` step ran; check `site/docs/index.html` |

## Related

- [Quickstart](quickstart.md)
- [Renderers](guide/renderers.md)
- [ARCHITECTURE](ARCHITECTURE.md)
