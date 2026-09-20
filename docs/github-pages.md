# GitHub Pages Deployment

<<<<<<< HEAD
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
   node packages/cli/dist/cli.js build examples/<name>/*.dash.yaml \
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
=======
The dvfc project is deployed to GitHub Pages at [https://kobakhit.com/dvfc/](https://kobakhit.com/dvfc/).

## Build Process

### Always Use CLI Build

**IMPORTANT:** All examples MUST be built exclusively through the `dvfc` CLI, never through custom Vite builds or other build systems.

The CLI ensures:
- Correct base path configuration (`/dvfc/examples/<name>/`)
- Proper data directory structure (`data/` relative to each example)
- Consistent HTML/JS generation with crossfiltering support
- No hardcoded paths like `/dbt-stub/` that break on deployment

### Build Script

The `scripts/build-site.sh` script builds the entire GitHub Pages site:

```bash
./scripts/build-site.sh
```

This script:
1. Builds each example via CLI: `dvfc build <*.dash.yaml> -o site/examples/<name> --base /dvfc/examples/<name>/`
2. Copies marketing pages from `site-src/` (index.html, charts.html)
3. Verifies no hardcoded `/dbt-stub/` paths exist
4. Confirms all examples have `data/` directories with CSV files

### Directory Structure

```
site/
├── index.html              # Landing page
├── charts.html             # Chart types gallery
├── .nojekyll               # Disable Jekyll processing
└── examples/
    ├── sales-board/
    │   ├── index.html
    │   ├── assets/
    │   │   └── index-*.js
>>>>>>> 8432e6c (Fix GitHub Pages data loading and redesign site)
    │   └── data/
    │       ├── sales_daily.csv
    │       └── flights_summary.csv
    ├── web-analytics/
<<<<<<< HEAD
    ├── dbt-jaffle/
    └── revenue-analysis/
```

Each example directory contains the full output from `dvfc build`:
- `index.html`, Entry point
- `assets/`, Bundled JS with Mosaic, DuckDB-WASM, vgplot
- `data/`, CSV data files loaded by DuckDB

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
node packages/cli/dist/cli.js build examples/sales-board/sales.dash.yaml -o site/examples/sales-board --base /dvfc/
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
=======
    │   └── ...
    ├── dbt-jaffle/
    │   └── ...
    └── revenue-analysis/
        └── ...
```

### Data Loading

Each example loads data from its own `data/` directory using the base path:

```javascript
// Generated by CLI with --base /dvfc/examples/sales-board/
const base = "/dvfc/examples/sales-board/";

await vg.coordinator().exec(`
  CREATE TABLE IF NOT EXISTS sales_daily AS 
  SELECT * FROM read_csv_auto('${base}/data/sales_daily.csv')
`);
```

When `--base` is not provided, the CLI generates fallback logic:

```javascript
const base = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, "");
```

This works for local preview but is less predictable for deployments.

## GitHub Actions Workflow

The `.github/workflows/deploy-pages.yml` workflow:

1. Installs dependencies with pnpm
2. Builds all packages (`pnpm run build`)
3. Runs `./scripts/build-site.sh` to build the site
4. Uploads the `site/` directory as a Pages artifact
5. Deploys to GitHub Pages

The workflow runs on every push to `main` and can be triggered manually via `workflow_dispatch`.

## Adding a New Example

1. Create `examples/<name>/*.dash.yaml`
2. Create `examples/<name>/dbt-stub/` with CSV files
3. Add the example name to `scripts/build-site.sh` in the `examples` array
4. Update `site-src/index.html` to link to the new example

Example array in `build-site.sh`:

```bash
examples=(
  "sales-board"
  "web-analytics"
  "dbt-jaffle"
  "revenue-analysis"
  "new-example"  # Add here
)
```

## Local Testing

Build and preview the site locally:

```bash
# Build the site
./scripts/build-site.sh

# Serve locally
npx serve site -p 3000

# Open http://localhost:3000/dvfc/
```

The base path `/dvfc/` is hardcoded in the build script to match the production deployment.

## Troubleshooting

### Example fails to load data (IO Error: No files found)

**Symptom:** Browser console shows:
```
IO Error: No files found that match the pattern "https://kobakhit.com/dbt-stub/sales_daily.csv"
```

**Cause:** The example was built with a custom Vite config or hardcoded paths instead of via CLI.

**Fix:**
1. Remove any custom build scripts in `examples/<name>/`
2. Ensure `scripts/build-site.sh` builds the example via CLI with `--base` flag
3. Rebuild: `./scripts/build-site.sh`
4. Verify: `grep -r "/dbt-stub/" site/` should return nothing

### CSS or styling looks wrong

Check that `site-src/index.html` and `site-src/charts.html` have complete inline CSS. 
The marketing pages do NOT use external stylesheets to keep deployment simple.

### Example builds but charts don't render

1. Check browser console for JavaScript errors
2. Verify `data/` directory exists: `ls site/examples/<name>/data/`
3. Verify CSV files are present and non-empty
4. Check that the generated JS has correct base path: 
   ```bash
   grep "const base = " site/examples/<name>/assets/*.js
   ```

## Design Guidelines

### Marketing Site (index.html, charts.html)

- Near-black background (`#0a0a0a`)
- Minimal, high-contrast design
- Purple accent (`#a855f7`)
- Clean typography with `-apple-system` font stack
- No loud gradients or placeholder art
- Clear CTAs and navigation

### Dashboard Examples

- Clean white background with subtle gray backdrop
- Restrained color palette
- Professional data visualization aesthetic
- Minimal chrome, focus on charts
- Mosaic crossfiltering prominently featured

Avoid:
- Loud purple/blue marketing gradients in dashboards
- "Built with ❤️" style footers
- Abstract placeholder graphics
- Unnecessary decorative elements
>>>>>>> 8432e6c (Fix GitHub Pages data loading and redesign site)
