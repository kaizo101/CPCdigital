#!/usr/bin/env bash
# Build a minimal, public-safe CPCdigital web-demo mirror and optionally publish it.
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEMO_DIR="${CPC_DEMO_DIR:-/tmp/cpcdigital-demo}"
DEMO_REPO="${CPC_DEMO_REPO:-https://github.com/kaizo101/cpcdigital-demo.git}"
PUSH_CHANGES=false

if [[ "${1:-}" == "--push" ]]; then
  PUSH_CHANGES=true
elif [[ -n "${1:-}" ]]; then
  echo "Usage: $0 [--push]"
  exit 2
fi

echo "=== Preparing CPCdigital public demo ==="

if [[ -d "$DEMO_DIR/.git" ]]; then
  if [[ -n "$(git -C "$DEMO_DIR" status --porcelain)" ]]; then
    echo "Refusing to overwrite a dirty demo checkout: $DEMO_DIR"
    exit 1
  fi
  git -C "$DEMO_DIR" pull --ff-only
else
  git clone "$DEMO_REPO" "$DEMO_DIR"
fi

STAGING_DIR="$(mktemp -d /tmp/cpcdigital-demo-stage.XXXXXX)"
trap 'rm -rf "$STAGING_DIR"' EXIT

mkdir -p "$STAGING_DIR/.github/workflows" "$STAGING_DIR/packages"

# Explicit allowlist: only files required to build, inspect and license the web demo.
cp "$SOURCE_DIR/LICENSE" "$STAGING_DIR/LICENSE"
cp "$SOURCE_DIR/tsconfig.base.json" "$STAGING_DIR/tsconfig.base.json"
cp "$SOURCE_DIR/package-lock.json" "$STAGING_DIR/package-lock.json"
cp "$SOURCE_DIR/scripts/demo/package.json" "$STAGING_DIR/package.json"
cp "$SOURCE_DIR/scripts/demo/README.md" "$STAGING_DIR/README.md"
cp "$SOURCE_DIR/scripts/demo/NOTICE.md" "$STAGING_DIR/NOTICE.md"
cp "$SOURCE_DIR/scripts/demo/CONTRIBUTING.md" "$STAGING_DIR/CONTRIBUTING.md"
cp "$SOURCE_DIR/scripts/demo/SECURITY.md" "$STAGING_DIR/SECURITY.md"
cp "$SOURCE_DIR/scripts/demo/gitignore" "$STAGING_DIR/.gitignore"
cp "$SOURCE_DIR/scripts/demo/deploy.yml" "$STAGING_DIR/.github/workflows/deploy.yml"

for package_name in client poker-engine shared; do
  rsync -a \
    --exclude='node_modules' \
    --exclude='dist' \
    "$SOURCE_DIR/packages/$package_name/" "$STAGING_DIR/packages/$package_name/"
done

# Make the public repository exactly match the allowlisted staging tree.
rsync -a --delete --exclude='.git' "$STAGING_DIR/" "$DEMO_DIR/"

echo "Reconciling the lockfile for the reduced web-only workspace..."
npm install --package-lock-only --ignore-scripts --workspaces=false --prefix "$DEMO_DIR"

echo "Installing, testing and building the public demo..."
npm ci --ignore-scripts --prefix "$DEMO_DIR"
npm test --prefix "$DEMO_DIR"
npm run build --prefix "$DEMO_DIR"

if [[ -z "$(git -C "$DEMO_DIR" status --porcelain)" ]]; then
  echo "No changes — demo is already up to date."
  exit 0
fi

git -C "$DEMO_DIR" status --short

if [[ "$PUSH_CHANGES" != true ]]; then
  echo "Validation passed. Review $DEMO_DIR; publish from a clean checkout with --push."
  exit 0
fi

git -C "$DEMO_DIR" add -A
git -C "$DEMO_DIR" commit -m "Sync CPCdigital v0.7.6 and add AGPL-3.0-only"
git -C "$DEMO_DIR" push origin master

echo "=== Demo pushed; GitHub Pages deployment has been triggered. ==="
