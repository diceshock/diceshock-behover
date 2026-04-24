#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$SCRIPT_DIR/.env" ]; then
  echo "ERROR: .env file not found. Copy .env.example to .env and fill in CF_API_TOKEN."
  echo "  cp .env.example .env"
  exit 1
fi

source "$SCRIPT_DIR/.env"
if [ "$CF_API_TOKEN" = "your-cloudflare-api-token-here" ] || [ -z "$CF_API_TOKEN" ]; then
  echo "ERROR: CF_API_TOKEN not set. Edit .env with your Cloudflare API token."
  exit 1
fi

echo "Building Caddy image (with cloudflare DNS plugin)..."
docker compose build

echo "Starting Caddy..."
docker compose up -d

echo "Waiting for certificate provisioning..."
sleep 10
docker compose logs caddy 2>&1 | tail -30

echo ""
echo "Caddy is running. Check logs with:"
echo "  docker compose logs -f caddy"
echo ""
echo "Test with:"
echo "  curl -v https://diceshock.com --resolve diceshock.com:443:\$(curl -s ifconfig.me)"
