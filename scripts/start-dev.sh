#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Replace placeholder secrets before external integrations."
fi

if [[ ! -d node_modules ]]; then npm install; fi

docker compose up -d postgres
echo "PostgreSQL started."
echo "Run: npm run check"
echo "Run: npm run dev"
echo "For web: cd apps/web && npm install && npm run dev"
