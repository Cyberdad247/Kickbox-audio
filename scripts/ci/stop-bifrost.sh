#!/usr/bin/env bash
# scripts/ci/stop-bifrost.sh
#
# Tears down Bifrost cleanly: SIGTERM then SIGKILL on the captured PID,
# then dumps the captured log so future green runs leave an audit trail
# inside GitHub Actions. Always runs from the always()-tier teardown so
# success or failure paths both publish the bifrost log.

PID=/tmp/bifrost.pid
LOG=/tmp/bifrost.log

if [ -f "$PID" ]; then
  TARGET="$(cat "$PID")"
  if [ -n "$TARGET" ]; then
    kill "$TARGET" 2>/dev/null || true
    sleep 1
    kill -9 "$TARGET" 2>/dev/null || true
  fi
fi

if [ -f "$LOG" ]; then
  echo "--- BIFROST LOGS (teardown) ---"
  cat "$LOG"
else
  echo "(no bifrost.log present)"
fi
