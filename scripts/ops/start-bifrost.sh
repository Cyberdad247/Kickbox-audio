#!/usr/bin/env bash
# scripts/ci/start-bifrost.sh
#
# Boots Bifrost in the background for the KBA Smoke CI workflow, then
# polls /health up to 15 seconds. Exits 1 on healthcheck failure with a
# full log dump so the GH Actions log surfaces the root cause.
#
# Extracted out of the original `run: |` block of kba-smoke.yml — that
# block scalar's strict YAML parsing tripped on a quoted-grep collision
# (`'"status": "PASS"'`) on line 91 of the workflow YAML. Removing the
# multi-line block scalar plus moving all bash to dedicated scripts
# closes the root parser-rejection cause for runs 28297865280 through
# 28299072734.

set -uo pipefail

LOG=/tmp/bifrost.log
PID=/tmp/bifrost.pid
PORT="${PORT:-3017}"
URL="http://localhost:${PORT}/health"

rm -f "$LOG" "$PID"

# nohup + & + disown so the bg process survives runner step boundaries
# (per GHA runner v2.261+ behavior, nohup is belt-and-braces).
nohup npx tsx apps/bifrost/src/server.ts > "$LOG" 2>&1 &
BIFROST_PID=$!
echo "$BIFROST_PID" > "$PID"
disown 2>/dev/null || true

for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -sf "$URL" > /dev/null 2>&1; then
    echo "Bifrost ready after ${i}s (pid ${BIFROST_PID})"
    exit 0
  fi
  sleep 1
done

echo "--- BIFROST LOGS (healthcheck failed after 15s) ---"
cat "$LOG"
exit 1
