# Publishing Guide

This document explains how to publish Data Viz Factory (dvfc) packages to npm and PyPI.

## Prerequisites

### npm Publishing
- npm account with access to `@dvfc` scope
- Logged in: `npm login`
- 2FA configured (required for scoped packages)

### PyPI Publishing
- PyPI account
- API token configured: `~/.pypirc` or `UV_PUBLISH_TOKEN` / `TWINE_PASSWORD`
- Prefer **uv**: `uv build` and `uv publish` (or `uv tool install twine` if you still use twine)

### GitHub Repository
- Suggested name: `dvfc/dvfc` or `dvfc/data-viz-factory`
- Repository must be public for npm/PyPI links to work
- **Manual step after initial setup**: Update Origin slug if needed

---

## Pre-Publish Checklist

### ✅ 1. Version Consistency

Ensure all `package.json` and `pyproject.toml` files use the same version:

```bash
# Check current versions
grep -r '"version"' packages/*/package.json python/pyproject.toml

# Update if needed (example: 0.5.0)
find packages -name package.json -exec sed -i 's/"version": ".*"/"version": "0.5.0"/' {} \;
sed -i 's/version = ".*"/version = "0.5.0"/' python/pyproject.toml
```

### ✅ 2. Clean Build

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm run build

# Verify all packages build
ls -la packages/*/dist/

# Test CLI
node packages/cli/dist/cli.js --version
```

### ✅ 3. Run Tests

```bash
# Unit tests
pnpm test

# Dogfood script
pnpm dogfood

# Validate all examples
for ex in examples/*/*.dash.yaml; do
  node packages/cli/dist/cli.js validate "$ex"
done
```

### ✅ 4. Documentation

- [ ] README.md has accurate install instructions
- [ ] CHANGELOG.md updated with release notes
- [ ] LICENSE file exists (Apache-2.0)
- [ ] CONTRIBUTING.md exists
- [ ] Package READMEs up to date

### ✅ 5. Package Metadata

Check each `package.json`:
- [ ] `"private": false` (or field removed)
- [ ] `"files": ["dist"]` includes all necessary files
- [ ] `"bin"` points to correct executable
- [ ] `"repository"` URL is correct
- [ ] `"homepage"` URL is set
- [ ] `"bugs"` URL is set
- [ ] Keywords are relevant

---

## Publishing to npm

### 1. Publish Packages (Order Matters)

Publish in dependency order to avoid resolution issues:

```bash
# 1. Core (no dependencies)
cd packages/core
npm publish --access public

# 2. Adapters (depend on core)
cd ../dbt-adapter
npm publish --access public

cd ../adapter-sqlmesh
npm publish --access public

cd ../adapter-bruin
npm publish --access public

# 3. Charts (depends on core)
cd ../charts
npm publish --access public

# 4. CLI (depends on core, dbt-adapter, charts)
cd ../cli
npm publish --access public

# 5. MCP (depends on all)
cd ../mcp
npm publish --access public
```

### 2. Verify Published Packages

```bash
# Check package pages
open https://www.npmjs.com/package/@dvfc/core
open https://www.npmjs.com/package/@dvfc/cli

# Test installation
mkdir /tmp/dvfc-test
cd /tmp/dvfc-test
npm install -g @dvfc/cli
dvfc --version
```

### 3. Tag Release

```bash
git tag v0.5.0
git push origin v0.5.0
```

---

## Publishing to PyPI

### 1. Build Distribution

```bash
cd python

# Clean previous builds
rm -rf dist/ build/ *.egg-info

# Build wheel and sdist (preferred)
uv build

# Or: python -m build

# Verify contents
ls -la dist/
tar -tzf dist/dvfc-*.tar.gz
unzip -l dist/dvfc-*.whl
```

### 2. Test on TestPyPI (Optional)

```bash
# Upload to test.pypi.org first
python -m twine upload --repository testpypi dist/*

# Test installation
# Install from TestPyPI
uv pip install --index-url https://test.pypi.org/simple/ dvfc
# or: uv add --index https://test.pypi.org/simple/ dvfc

# Verify
python -c "from dvfc import DataVizFactoryClient; print('OK')"
```

### 3. Publish to PyPI

```bash
# Upload to pypi.org
python -m twine upload dist/*

# Verify
open https://pypi.org/project/dvfc/
```

### 4. Test Installation

```bash
uv add dvfc
# or: uv pip install dvfc

python -c "from dvfc import DataVizFactoryClient; print('OK')"
```

---

## GitHub Repository Setup

### Suggested Repository Names

**Option A: Short (recommended)**
- Org: `KobaKhit`
- Repo: `dvfc`
- Full: `github.com/KobaKhit/dvfc`

**Option B: Descriptive**
- Org: `dvfc` or `data-viz-factory`
- Repo: `data-viz-factory`
- Full: `github.com/dvfc/data-viz-factory`

### Update Repository URLs

After creating the GitHub repository, update all `package.json` files:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/KobaKhit/dvfc.git"
  },
  "homepage": "https://github.com/KobaKhit/dvfc#readme",
  "bugs": {
    "url": "https://github.com/KobaKhit/dvfc/issues"
  }
}
```

Update Python `pyproject.toml`:

```toml
[project.urls]
Homepage = "https://github.com/KobaKhit/dvfc"
Documentation = "https://github.com/KobaKhit/dvfc#readme"
Repository = "https://github.com/KobaKhit/dvfc"
Issues = "https://github.com/KobaKhit/dvfc/issues"
```

### Origin Slug Rename (Manual User Step)

If currently using a temporary Origin repository, rename the slug:

1. Go to Origin dashboard: `https://origin.cursor.com/`
2. Navigate to your repository settings
3. Change slug to match GitHub name (e.g., `dvfc`)
4. Update git remote:

```bash
git remote set-url origin https://origin.cursor.com/git/youruser/dvfc.git
git push origin main
```

### Create GitHub Release

```bash
# Create release with changelog
gh release create v0.5.0 \
  --title "v0.5.0 - Analysis Overlays & Chart Discovery" \
  --notes "$(cat CHANGELOG.md | sed -n '/## 0.5.0/,/## 0.4.0/p' | head -n -1)"
```

---

## Post-Publish

### ✅ Update Installation Instructions

Update README.md with actual install commands:

```bash
# npm
npm install -g @dvfc/cli

# Python
uv add dvfc
# or: uv pip install dvfc
```

### ✅ Announcement

- [ ] Tweet/post release announcement
- [ ] Update documentation site (if any)
- [ ] Notify dbt community (if relevant)
- [ ] Post in Mosaic discussions

### ✅ Monitor

- npm download stats: `https://npm-stat.com/charts.html?package=@dvfc/cli`
- PyPI stats: `https://pypistats.org/packages/dvfc`
- GitHub stars/forks
- Issues/PRs

---

## Troubleshooting

### npm publish fails with 403

- Verify you're logged in: `npm whoami`
- Check scope access: `npm access ls-packages @dvfc`
- Ensure 2FA token is valid

### PyPI upload fails

- Check API token: `python -m twine check dist/*`
- Verify package name not taken: search pypi.org
- Ensure version doesn't already exist

### Version conflicts

- Don't republish same version
- Increment version in all packages
- Use `npm version patch/minor/major` for consistency

---

## Continuous Publishing (Future)

### GitHub Actions Workflow

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Packages

on:
  push:
    tags:
      - 'v*'

jobs:
  publish-npm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm run build
      - run: pnpm test
      - run: |
          cd packages/core && npm publish --access public
          cd ../dbt-adapter && npm publish --access public
          # ... etc
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  publish-pypi:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
      - run: cd python && uv build
      - run: cd python && uv publish
        env:
          UV_PUBLISH_TOKEN: ${{ secrets.PYPI_TOKEN }}
```

---

## License

All packages are published under **Apache-2.0** license. See [LICENSE](../LICENSE) file.
