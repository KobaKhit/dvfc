#!/usr/bin/env bash
# Build MkDocs documentation into site/docs (expects marketing site dir or creates it).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ensure_mkdocs() {
  if command -v mkdocs >/dev/null 2>&1; then
    return 0
  fi
  if [ -x "$ROOT/.venv-docs/bin/mkdocs" ]; then
    # shellcheck disable=SC1091
    source "$ROOT/.venv-docs/bin/activate"
    return 0
  fi

  echo "Installing docs dependencies (mkdocs-material)..."
  if command -v uv >/dev/null 2>&1; then
    uv venv "$ROOT/.venv-docs"
    # shellcheck disable=SC1091
    source "$ROOT/.venv-docs/bin/activate"
    uv pip install -r requirements-docs.txt
  elif python3 -m pip --version >/dev/null 2>&1; then
    python3 -m pip install -q -r requirements-docs.txt
  else
    echo "ERROR: need uv or pip to install mkdocs-material" >&2
    exit 1
  fi
}

ensure_mkdocs
if [ -x "$ROOT/.venv-docs/bin/mkdocs" ] && ! command -v mkdocs >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  source "$ROOT/.venv-docs/bin/activate"
fi

mkdir -p site
echo "Building documentation → site/docs"
mkdocs build --clean
echo "OK Docs at site/docs/index.html"
