#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Defina DATABASE_URL apenas no ambiente seguro do servidor}"
file="${1:?Informe o arquivo .dump do backup}"
pg_restore "$DATABASE_URL" --clean --if-exists --no-owner --no-privileges "$file"
echo "Restauração concluída"
