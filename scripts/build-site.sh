#!/usr/bin/env bash
#
# build-site.sh - Build dvfc examples for GitHub Pages deployment
# Fixes base path issue: each example gets /dvfc/examples/<name>/ as base
#

set -e

echo "🏗️  Building dvfc site for GitHub Pages"
echo "========================================"
echo

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BASE_PATH="/dvfc"
SITE_DIR="site"
EXAMPLES_DIR="examples"

# Clean previous builds
echo -e "${BLUE}1. Cleaning previous builds${NC}"
rm -rf "$SITE_DIR/examples"
mkdir -p "$SITE_DIR/examples"
echo "   ✓ Cleaned"
echo

# Build each example with correct base path
echo -e "${BLUE}2. Building examples${NC}"

for example_dir in "$EXAMPLES_DIR"/*/; do
  example_name=$(basename "$example_dir")
  
  # Skip if not a directory or if it's just README
  if [ ! -d "$example_dir/src" ] && [ ! -f "$example_dir/board.yaml" ]; then
    echo "   ⊘ Skipping $example_name (not a buildable example)"
    continue
  fi
  
  echo "   Building $example_name..."
  
  # Determine build method
  if [ -f "$example_dir/package.json" ] && [ -f "$example_dir/vite.config.ts" ]; then
    # Example has its own Vite setup (like sales-board)
    echo "     → Using example's Vite config"
    
    # Update vite.config.ts to use correct base
    VITE_CONFIG="$example_dir/vite.config.ts"
    TEMP_CONFIG="${VITE_CONFIG}.backup"
    
    # Backup original
    cp "$VITE_CONFIG" "$TEMP_CONFIG"
    
    # Inject base path into config
    cat > "$VITE_CONFIG" <<EOF
import { defineConfig } from 'vite';

export default defineConfig({
  base: '${BASE_PATH}/examples/${example_name}/',
  root: './src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: './src/index.html'
    }
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm']
  },
  server: {
    port: 5174,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  preview: {
    port: 5174,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
EOF
    
    # Build using pnpm
    (cd "$example_dir" && pnpm install --silent && pnpm build)
    
    # Restore original config
    mv "$TEMP_CONFIG" "$VITE_CONFIG"
    
    # Copy built files
    cp -r "$example_dir/dist" "$SITE_DIR/examples/$example_name"
    
  elif [ -f "$example_dir/board.yaml" ]; then
    # Use dvfc CLI to build
    echo "     → Using dvfc CLI"
    
    # Build with dvfc
    node packages/cli/dist/cli.js build "$example_dir/board.yaml" -o "$SITE_DIR/examples/$example_name"
    
    # Fix asset paths in generated HTML
    HTML_FILE="$SITE_DIR/examples/$example_name/index.html"
    if [ -f "$HTML_FILE" ]; then
      # Update asset paths to include example name
      sed -i.bak "s|/assets/|${BASE_PATH}/examples/${example_name}/assets/|g" "$HTML_FILE"
      sed -i.bak "s|/data/|${BASE_PATH}/examples/${example_name}/data/|g" "$HTML_FILE"
      rm "${HTML_FILE}.bak"
    fi
    
  else
    echo "     ⊘ Skipping (no build method found)"
    continue
  fi
  
  echo "     ✓ Built $example_name"
done

echo
echo -e "${GREEN}✓ All examples built${NC}"
echo

# Verify builds
echo -e "${BLUE}3. Verifying builds${NC}"
for example_dir in "$SITE_DIR/examples"/*/; do
  example_name=$(basename "$example_dir")
  HTML="$example_dir/index.html"
  
  if [ -f "$HTML" ]; then
    # Check for correct asset paths
    if grep -q "${BASE_PATH}/examples/${example_name}/assets/" "$HTML"; then
      echo "   ✓ $example_name: Asset paths correct"
    else
      echo -e "   ${YELLOW}⚠ $example_name: Asset paths may need fixing${NC}"
      echo "     Expected: ${BASE_PATH}/examples/${example_name}/assets/"
      echo "     Found:"
      grep -o '/[^"]*assets/[^"]*' "$HTML" | head -1 || echo "     (no assets found)"
    fi
  else
    echo "   ✗ $example_name: No index.html found"
  fi
done

echo
echo -e "${GREEN}✅ Site build complete!${NC}"
echo
echo "Output structure:"
echo "  ${SITE_DIR}/"
echo "  ├── index.html          (landing page)"
echo "  ├── charts.html         (chart types gallery)"
echo "  ├── assets/styles.css   (site styles)"
echo "  └── examples/"
echo "      ├── sales-board/"
echo "      ├── web-analytics/"
echo "      ├── dbt-jaffle/"
echo "      └── revenue-analysis/"
echo
echo "Deploy to GitHub Pages:"
echo "  - Set Pages source to '/site' directory"
echo "  - Or copy site/* to root of gh-pages branch"
echo
