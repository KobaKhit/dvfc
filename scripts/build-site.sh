#!/usr/bin/env bash
#
# Build GitHub Pages site at /dvfc/ base path
# Uses dvfc CLI for interactive examples + SVG chart thumbnails
#

set -euo pipefail

echo "🌐 Building GitHub Pages Site"
echo "=============================="
echo

BASE_URL="/dvfc"
SITE_DIR="site"
CLI="node packages/cli/dist/cli.js"
PREVIEWS="$SITE_DIR/assets/previews"

# Clean previous build
rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR" "$PREVIEWS"

echo "📦 Building interactive examples..."
echo

examples=(
  "sales-board"
  "web-analytics"
  "dbt-jaffle"
  "revenue-analysis"
)

for example in "${examples[@]}"; do
  spec_file=""
  for f in examples/$example/*.dash.yaml; do
    if [ -f "$f" ]; then spec_file="$f"; break; fi
  done

  if [ -z "$spec_file" ]; then
    echo "⚠️  Skipping $example (no *.dash.yaml)"
    continue
  fi

  out_dir="$SITE_DIR/examples/$example"
  base_path="$BASE_URL/examples/$example/"

  rm -rf .dvfc-build

  echo "  Building $example → $out_dir"
  $CLI build "$spec_file" -o "$out_dir" --base "$base_path"

  if [ ! -d "$out_dir/data" ]; then
    echo "  ❌ ERROR: $out_dir/data not created"
    exit 1
  fi

  echo "  ✓ $example built with data/"
done

echo "  Building compact landing showcase → $SITE_DIR/examples/showcase"
rm -rf .dvfc-build
$CLI build examples/site-gallery/showcase.dash.yaml \
  -o "$SITE_DIR/examples/showcase" \
  --base "$BASE_URL/examples/showcase/" >/dev/null
echo "  ✓ showcase built with data/"

echo
echo "📈 Exporting real chart SVG thumbnails (dvfc → Vega-Lite)..."
echo

# Gallery cards, one representative chart from each live dash
gallery_export() {
  local name="$1" spec="$2" chart="$3"
  local out="$PREVIEWS/gallery-${name}.svg"
  echo "  Gallery $name ← --chart $chart"
  $CLI build "$spec" -f svg --chart "$chart" -o "$out" >/dev/null
}

gallery_export sales-board examples/sales-board/sales.dash.yaml sales_trend
gallery_export web-analytics examples/web-analytics/web-analytics.dash.yaml daily_views
gallery_export dbt-jaffle examples/dbt-jaffle/jaffle.dash.yaml daily_revenue
gallery_export revenue-analysis examples/revenue-analysis/revenue-analysis.dash.yaml revenue_trend

# Chart catalog, all exports share the curated exoplanet dataset
catalog_export() {
  local slug="$1" chart="$2"
  local out="$PREVIEWS/chart-${slug}.svg"
  echo "  Chart page $slug ← --chart $chart"
  $CLI build examples/site-gallery/cosmic-atlas.dash.yaml \
    -f svg --chart "$chart" -o "$out" >/dev/null
}

catalog_export line discovery_timeline
catalog_export bar discovery_methods
catalog_export area habitable_momentum
catalog_export scatter world_scatter
catalog_export pie method_share
catalog_export donut mission_mix
catalog_export histogram temperature_histogram
catalog_export density radius_density
catalog_export heatmap constellation_heatmap
catalog_export boxplot radius_boxplot
catalog_export number world_count

echo
echo "📄 Creating site pages..."
echo

cp site-src/index.html "$SITE_DIR/"
cp site-src/style.css "$SITE_DIR/"
if [ -d site-src/assets ]; then
  cp -r site-src/assets/. "$SITE_DIR/assets/" 2>/dev/null || true
fi

node --experimental-strip-types scripts/build-chart-pages.ts

touch "$SITE_DIR/.nojekyll"

echo
echo "✅ Site built successfully!"
echo "   Output: $SITE_DIR/"
echo "   Base path: $BASE_URL"
echo "   Previews: $(ls "$PREVIEWS"/*.svg 2>/dev/null | wc -l) SVGs"
echo "   Chart pages: $(find "$SITE_DIR/charts" -mindepth 1 -maxdepth 1 -type d | wc -l)"
echo
echo "Verification:"
if grep -r "/dbt-stub/" "$SITE_DIR" --include='*.html' --include='*.js' -l 2>/dev/null | grep -v assets; then
  echo "❌ ERROR: Found /dbt-stub/ paths!"
  exit 1
fi
echo "✓ No /dbt-stub/ paths in HTML/JS"
echo "✓ Data directories:"
find "$SITE_DIR" -type d -name "data" | while read -r dir; do
  csv_count=$(find "$dir" -name "*.csv" | wc -l)
  echo "  $dir ($csv_count CSV files)"
done
echo
