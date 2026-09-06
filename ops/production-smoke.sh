#!/usr/bin/env bash
set -euo pipefail
API="${API_URL:-https://multigym-api.onrender.com}"
WEB="${WEB_URL:-https://multigym.com.br}"
check(){ local label="$1" url="$2" expected="$3"; local got; got="$(curl -sS -o /dev/null -w '%{http_code}' "$url")"; if [ "$got" != "$expected" ]; then echo "FAIL $label: expected $expected, got $got"; exit 1; fi; echo "OK $label: $got"; }
check "API health" "$API/health" 200
check "API readiness" "$API/health/ready" 200
check "gestão pública" "$WEB/" 200
check "portal do aluno" "$WEB/aluno" 200
check "dashboard protegido" "$API/api/dashboard" 401
check "financeiro protegido" "$API/api/finance/ledger" 401
echo "Production smoke test passed"
