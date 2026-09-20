#!/usr/bin/env bash
#
# Build GitHub Pages site at /dvfc/ base path
# Uses dvfc CLI exclusively for all examples (no Vite special-case)
#

set -e

echo "🌐 Building GitHub Pages Site"
echo "=============================="
echo

BASE_URL="/dvfc"
SITE_DIR="site"
CLI="node packages/cli/dist/cli.js"

# Clean previous build
rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR"

echo "📦 Building Examples..."
echo

# Build each example via CLI with correct base path
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
  
  # Clean .dvfc-build to prevent CSV contamination
  rm -rf .dvfc-build
  
  echo "  Building $example → $out_dir"
  $CLI build "$spec_file" -o "$out_dir" --base "$base_path"
  
  # Verify data directory exists
  if [ ! -d "$out_dir/data" ]; then
    echo "  ❌ ERROR: $out_dir/data not created"
    exit 1
  fi
  
  echo "  ✓ $example built with data/"
done

echo
echo "📄 Creating Site Pages..."
echo

# Copy static assets
cp -r site-src/index.html "$SITE_DIR/"
cp -r site-src/charts.html "$SITE_DIR/"
cp -r site-src/style.css "$SITE_DIR/" 2>/dev/null || echo "  (no style.css)"
cp -r site-src/assets "$SITE_DIR/" 2>/dev/null || echo "  (no assets/)"

# Create .nojekyll to disable Jekyll processing
touch "$SITE_DIR/.nojekyll"

echo
echo "✅ Site built successfully!"
echo "   Output: $SITE_DIR/"
echo "   Base path: $BASE_URL"
echo
echo "Verification:"
grep -r "/dbt-stub/" "$SITE_DIR" && echo "❌ ERROR: Found /dbt-stub/ paths!" && exit 1 || echo "✓ No /dbt-stub/ paths found"
echo "✓ Data directories:"
find "$SITE_DIR" -type d -name "data" | while read dir; do
  csv_count=$(find "$dir" -name "*.csv" | wc -l)
  echo "  $dir ($csv_count CSV files)"
done
echo
