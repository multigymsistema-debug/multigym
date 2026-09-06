#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Defina DATABASE_URL apenas no ambiente seguro do servidor}"
out="${1:-multigym-backup-$(date +%Y%m%d-%H%M%S).dump}"
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges --file "$out"
chmod 600 "$out"
echo "Backup criado em $out"
