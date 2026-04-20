#!/usr/bin/env bash
# Free common Next.js dev ports (macOS / Linux: lsof + kill).
set -euo pipefail

for port in 3000 3010; do
  pids=$(lsof -ti ":${port}" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "${pids}" ]]; then
    echo "[kill-dev-ports] freeing :${port} (pid ${pids//$'\n'/, })"
    kill ${pids} 2>/dev/null || true
    sleep 0.2
  fi
done
