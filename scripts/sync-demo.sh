#!/usr/bin/env bash
# Sync CPCdigital source → cpcdigital-demo for GitHub Pages deployment.
# The demo repo's CI (.github/workflows/deploy.yml) builds and deploys automatically.
# Run this after each release to update the demo's source code.
set -euo pipefail

DEMO_DIR="/tmp/cpcdigital-demo"
DEMO_REPO="https://github.com/kaizo101/cpcdigital-demo.git"

echo "=== Syncing CPCdigital → cpcdigital-demo ==="

if [ -d "$DEMO_DIR/.git" ]; then
  echo "Pulling demo repo..."
  git -C "$DEMO_DIR" pull --ff-only
else
  echo "Cloning demo repo..."
  git clone "$DEMO_REPO" "$DEMO_DIR"
fi

echo "Syncing source files (excluding .git, .github, secrets, server)..."
rsync -av --delete \
  --exclude='.git' \
  --exclude='.gitignore' \
  --exclude='.github' \
  --exclude='node_modules' \
  --exclude='packages/server' \
  --exclude='secrets' \
  --exclude='avatar-workflow.json' \
  --exclude='ComfyUI' \
  --exclude='.tmp-frames' \
  --exclude='.tmp-ps-frames' \
  --exclude='Cards (large)' \
  --exclude='*.mp4' \
  --exclude='*.webm' \
  --exclude='docker-compose.yml' \
  --exclude='data.db' \
  --exclude='data.db-shm' \
  --exclude='data.db-wal' \
  --exclude='.claude' \
  "$(dirname "$0")/../" "$DEMO_DIR/"

echo "Restoring demo's .github/ (CI workflow)..."
git -C "$DEMO_DIR" checkout HEAD -- .github/ 2>/dev/null || true

echo "Checking for changes..."
cd "$DEMO_DIR"
if git diff --quiet && git diff --cached --quiet; then
  echo "No changes — demo is up to date."
  exit 0
fi

echo "Changes detected. Committing..."
git add -A
git commit -m "Sync from CPCdigital $(date +%Y-%m-%d)" || true
git push

echo "=== Done. CI will deploy to GitHub Pages. ==="
