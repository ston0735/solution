#!/usr/bin/env bash
# Vercel build entry point.
#
# vercel.json keeps a short buildCommand because the platform caps it at 256
# characters; the real steps live here so serverless function bundles and the
# client build stay in one place.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[build] bundling CMS serverless module"
pnpm exec esbuild server/cms/routes.ts \
  --bundle \
  --platform=node \
  --packages=external \
  --format=esm \
  --outfile=server/cms/routes.js

echo "[build] bundling wrap preview serverless module"
pnpm exec esbuild server/preview/handler.ts \
  --bundle \
  --platform=node \
  --packages=external \
  --format=esm \
  --tsconfig=tsconfig.json \
  --outfile=server/preview/handler.js

echo "[build] building client bundle"
pnpm exec vite build
