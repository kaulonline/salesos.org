#!/usr/bin/env bash
set -euo pipefail

echo "=== SalesOS Docs Rebuild ==="

# Step 1: Build NestJS backend and generate OpenAPI spec
echo "[1/4] Building backend and generating OpenAPI spec..."
cd /opt/salesos.org/api
npm run build
npm run generate:openapi

# Step 2: Generate API reference MDX pages from spec
echo "[2/4] Generating API reference pages..."
cd /opt/salesos.org/docs
npm run generate:api

# Step 3: Build the docs site
echo "[3/4] Building docs site..."
npm run build

# Copy static assets and create logs dir for PM2
cp -r .next/static .next/standalone/.next/static
mkdir -p .next/standalone/logs

# Step 4: Restart PM2 process
echo "[4/4] Restarting docs server..."
pm2 restart salesos-docs

echo "=== Done! Docs site rebuilt and restarted ==="
echo "Visit https://docs.salesos.org"
