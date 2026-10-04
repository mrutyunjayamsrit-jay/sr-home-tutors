#!/usr/bin/env bash
# Run this ON the Oracle VM (after SSHing in), from inside the repo
# directory — NOT on your local machine. See context/09-DEPLOYMENT-RUNBOOK.md
# for the one-time setup this assumes has already been done (Docker
# installed, repo cloned, deploy/.env.production filled in).
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Pulling latest code..."
git pull

echo "→ Building and restarting containers..."
docker compose -f deploy/docker-compose.prod.yml up -d --build

echo "→ Applying database migrations..."
docker compose -f deploy/docker-compose.prod.yml exec -T api npx prisma migrate deploy

echo "→ Done. Tailing logs (Ctrl+C to stop watching — containers keep running):"
docker compose -f deploy/docker-compose.prod.yml logs -f --tail=50 api
