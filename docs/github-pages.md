# GitHub Pages Deployment

The Data Viz Factory project is automatically deployed to GitHub Pages at:

🌐 **https://kobakhit.github.io/dvfc/**

## Live Examples

All examples are built with real interactive dashboards (not screenshots):

- [Sales & Flights Dashboard](https://kobakhit.github.io/dvfc/examples/sales-board/)
- [Web Analytics Dashboard](https://kobakhit.github.io/dvfc/examples/web-analytics/)
- [dbt Jaffle Shop](https://kobakhit.github.io/dvfc/examples/dbt-jaffle/)
- [Revenue Analysis with Insights](https://kobakhit.github.io/dvfc/examples/revenue-analysis/)

## How It Works

### Build Pipeline

The GitHub Actions workflow (`.github/workflows/pages.yml`) runs on every push to `main`:

1. **Install dependencies**: `pnpm install` + `pnpm build`
2. **Build examples**: For each example, runs:
   ```bash
   node packages/cli/dist/cli.js build examples/<name>/board.yaml \
     -o site/examples/<name> \
     --base /dvfc/
   ```
3. **Deploy**: Uses official GitHub Pages actions to upload and deploy the `site/` directory

### Base Path Configuration

Since this is a **project Pages site** (not an organization/user site), it's served at `/dvfc/` instead of the root.

The `--base /dvfc/` flag ensures all asset paths (JS, CSS, data) are correctly prefixed:
- ✅ `/dvfc/assets/index-CCb7jIt3.js`
- ✅ `/dvfc/examples/sales-board/data/sales_daily.csv`
- ❌ `/assets/index-CCb7jIt3.js` (would fail)

Vite's `base` option handles this automatically during the build.

### Site Structure

```
site/
├── index.html                          # Landing page with gallery
└── examples/
    ├── sales-board/
    │   ├── index.html                  # Real interactive dashboard
    │   ├── assets/
    │   │   └── index-CCb7jIt3.js      # Bundled app (~334KB gzipped)
    │   └── data/
    │       ├── sales_daily.csv
    │       └── flights_summary.csv
    ├── web-analytics/
    ├── dbt-jaffle/
    └── revenue-analysis/
```

Each example directory contains the full output from `dvfc build`:
- `index.html` — Entry point
- `assets/` — Bundled JS with Mosaic, DuckDB-WASM, vgplot
- `data/` — CSV data files loaded by DuckDB

## Repository Settings

⚠️ **Important**: GitHub Pages must be configured to use "GitHub Actions" as the source.

1. Go to **Settings → Pages** in the GitHub repository
2. Under **Build and deployment**, set:
   - **Source**: GitHub Actions (not "Deploy from a branch")
3. The workflow will automatically deploy on the next push to `main`

If this setting is not enabled, the workflow will fail to deploy.

## Rebuilding the Site

### Automatically (Push to Main)

Any push to the `main` branch triggers a rebuild and redeploy:

```bash
git add .
git commit -m "Update examples"
git push origin main
```

The site updates in ~2-3 minutes (build + deploy time).

### Manually (Workflow Dispatch)

You can also trigger a rebuild manually:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow** → **Run workflow**

### Locally (Testing)

To test the site locally before pushing:

```bash
# Build all examples
pnpm build
./scripts/build-site.sh  # (if you create one)

# Or manually:
node packages/cli/dist/cli.js build examples/sales-board/board.yaml -o site/examples/sales-board --base /dvfc/
# ... repeat for other examples

# Preview locally with base path
npx serve site -l 3000
# Visit: http://localhost:3000/dvfc/
```

Note: Local preview with `--base /dvfc/` requires accessing `http://localhost:3000/dvfc/` (not just `http://localhost:3000/`).

## Known Limitations

### DuckDB-WASM Requires Network Access

The dashboards load DuckDB-WASM bundles from a CDN on first visit:
- `https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/...`

If you're viewing offline or in a restricted environment, the dashboard may fail to initialize.

This is a trade-off to keep the bundle size reasonable (~334KB vs ~6MB if we inline DuckDB).

### No Server-Side Data Processing

All data is included as CSV files in the deployment. The dashboards are fully static and run entirely in the browser.

For large datasets (>100MB), consider:
- Pre-aggregating data
- Using Parquet files (DuckDB-WASM supports them)
- Or hosting data separately and fetching it at runtime

### Browser Compatibility

The dashboards require:
- ES modules support
- SharedArrayBuffer (for DuckDB-WASM multi-threading)
- WebAssembly

Modern browsers (Chrome 92+, Firefox 95+, Safari 15.2+, Edge 92+) work fine.

## Troubleshooting

### Workflow fails with "Pages deployment not enabled"

→ Set **Settings → Pages → Source** to "GitHub Actions"

### Assets load with 404 errors

→ Verify `--base /dvfc/` flag is used in all build commands

### Examples don't load / blank page

→ Check browser console for errors. Likely CORS or DuckDB-WASM initialization issue.

### Build succeeds but site shows old content

→ GitHub Pages caching. Wait 5-10 minutes or hard-refresh (Ctrl+Shift+R)

## Additional Resources

- [GitHub Pages documentation](https://docs.github.com/en/pages)
- [GitHub Actions for Pages](https://github.com/actions/deploy-pages)
- [Vite base path docs](https://vitejs.dev/config/shared-options.html#base)
