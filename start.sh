#!/bin/bash
echo "Building CPC-Offline..."

# Build client (static files, no server needed)
cd packages/client
npx vite build
cd ../..

# Build electron TypeScript
cd packages/electron
npx tsc
cd ../..

# Start Electron (loads built files directly)
echo ""
echo "Starting CPC-Offline..."
cd packages/electron
npx electron .
