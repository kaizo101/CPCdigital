#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

node scripts/check-runtime.mjs

echo "Building CPCdigital..."
npm run build --workspace @cpc/client
npm run build --workspace @cpc/electron

echo ""
echo "Starting CPCdigital..."
npm run start --workspace @cpc/electron
