#!/usr/bin/env bash
# Quick deploy script — run on your server
set -e

# 1. Copy .env.example to .env and fill in your values if not exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠  Created .env from .env.example — fill in BITRIX_API_KEY before continuing"
  exit 1
fi

# 2. Build & (re)start
docker compose pull --quiet 2>/dev/null || true
docker compose up --build -d

echo ""
echo "✅  App is running at http://$(hostname -I | awk '{print $1}'):8000"
