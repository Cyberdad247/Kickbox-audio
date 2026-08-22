#!/usr/bin/env bash
# scripts/ops/probe-hmac-e2e.sh
#
# End-to-end HMAC probe for the PWA↔Bifrost CMS auth layer.
#
# Boots bifrost + PWA on ephemeral free ports (avoids the 3011/3111
# EADDRINUSE issue from earlier probes) and runs two probes:
#
#   PROBE 1 — POST /api/cms/template/render through PWA with ZERO x-webhook-*
#             headers. PWA mints via /api/bifrost/proxy-sign and forwards
#             transparently. Expected: HTTP 200 + rendered body.
#
#   PROBE 2 — Direct POST /api/cms/content/publish to bifrost with a
#             body-bound HMAC minted via /api/bifrost/proxy-sign(rawBody).
#             Expected: HTTP 200 (auth+dispatch+Prisma all pass), or 500
#             when Prisma is unreachable but the HMAC middleware still
#             validated auth. Either outcome indicates auth passed.
#
# Exit codes:
#   0  both probes PASS
#   1  probe 1 FAIL
#   2  probe 2 FAIL
#   3  both probes FAIL
#   4  setup failure (port allocation, missing dep, etc.)
#
# Env vars (all optional with safe defaults):
#   WEBHOOK_SECRET            shared secret (default: kba-probe-secret-32chars-min-XX)
#   PROBE_LOG_DIR             where to write probe-bifrost.log / probe-pwa.log
#                             (default: /tmp)
#   AALIYAH_MTA_DRY_RUN       pass-through to bifrost — leave UNSET for CI
#                             (safe-by-default). Set to "false" or "0" with
#                             AALIYAH_MTA_HOST/PORT to exercise real SMTP.
#   AALIYAH_MTA_HOST          bifrost MTA host (default: 127.0.0.1)
#   AALIYAH_MTA_PORT          bifrost MTA port (default: 25)
#
# Invoked locally:
#   bash scripts/ops/probe-hmac-e2e.sh
# Invoked from CI:
#   .github/workflows/kba-smoke.yml -> probe-hmac-e2e job.

set -uo pipefail

SECRET="${WEBHOOK_SECRET:-kba-probe-secret-32chars-min-XX}"
LOG_DIR="${PROBE_LOG_DIR:-/tmp}"
BIFROST_LOG="${LOG_DIR}/probe-bifrost.log"
PWA_LOG="${LOG_DIR}/probe-pwa.log"

STARTED=0
BIFROST_PID=""
PWA_PID=""

# USED_SETSID drives whether dev servers are spawned in their own session so
# `kill -- -PID` (process-group kill) takes down the whole dependency tree
# in one shot. Without it the bash subshell dies but the npm/tsx/node children
# get reparented to init and keep writing to the log files — a real local leak
# and a potential race against the CI artifact upload on failure.
USED_SETSID=0
if command -v setsid >/dev/null 2>&1; then
  USED_SETSID=1
fi

# Helper to spawn a dev server. Args: log_path, cwd, command_string.
# When setsid is available we wrap the bash -c in `setsid -w` so the spawned
# process becomes its own session leader; cleanup can then kill the entire
# process group via `kill -- -PID`. Otherwise we fall back to a plain
# subshell and rely on taskkill /T (tree) in cleanup.
spawn_dev() {
  local log_path="$1"
  local cwd_path="$2"
  local cmd="$3"
  if [ "$USED_SETSID" = "1" ]; then
    setsid -w bash -c "cd '$cwd_path' && $cmd" >"$log_path" 2>&1 &
  else
    (cd "$cwd_path" && bash -c "$cmd" >"$log_path" 2>&1) &
  fi
  echo $!
}

# Recursive process kill:
#   1. If we spawned via setsid, kill the entire process group (`-- -PID`).
#      Safe here because the subshell is the session leader and its pgid
#      contains only the dev-server tree.
#   2. Else if `taskkill` is on PATH (Windows), use /T for tree kill.
#   3. Else fall back to killing just the immediate pid (orphan children
#      leak; acceptable because CI runners are recycled after the job).
kill_tree() {
  local pid="$1"
  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  if [ "$USED_SETSID" = "1" ]; then
    kill -KILL -- "-$pid" 2>/dev/null || true
    return 0
  fi
  if command -v taskkill >/dev/null 2>&1; then
    taskkill /F /T /PID "$pid" >/dev/null 2>&1 || true
    return 0
  fi
  kill -KILL "$pid" 2>/dev/null || true
}

cleanup() {
  local rc=$?
  if [ "$STARTED" = "1" ]; then
    for pid in "$BIFROST_PID" "$PWA_PID"; do
      kill_tree "$pid"
    done
    # Brief wait so children die quietly without a noisy hang.
    sleep 0.5
  fi
  exit "$rc"
}
trap cleanup EXIT INT TERM

# Free-port picker — kernel picks an ephemeral port (49252-65535 range).
freeport() {
  node -e "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})"
}

# ── Sanity ────────────────────────────────────────────────────────────────
if [ ! -d "apps/bifrost" ] || [ ! -d "apps/pwa" ]; then
  echo "[probe] FATAL: must run from monorepo root (apps/bifrost and apps/pwa not both present)" >&2
  exit 4
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[probe] FATAL: node not on PATH" >&2
  exit 4
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[probe] FATAL: npm not on PATH" >&2
  exit 4
fi

# ── Port allocation ───────────────────────────────────────────────────────
# Honor caller overrides (for local debugging). Otherwise pick ephemeral.
if [ -n "${BIFROST_PORT:-}" ] && [ -n "${PWA_PORT:-}" ]; then
  echo "[probe] Using caller-provided ports: bifrost=$BIFROST_PORT pwa=$PWA_PORT"
else
  BIFROST_PORT=$(freeport)
  PWA_PORT=$(freeport)
  echo "[probe] Picked ephemeral ports: bifrost=$BIFROST_PORT pwa=$PWA_PORT"
fi

# ── Reset logs ────────────────────────────────────────────────────────────
: > "$BIFROST_LOG"
: > "$PWA_LOG"

# Marker from here on, cleanup is responsible for killing PIDs.
STARTED=1

# ── Start bifrost ─────────────────────────────────────────────────────────
# Note: a single-shot string concatenation passed to spawn_dev so the env-var
# list and the npm invocation can be quoted safely in both POSIX and Windows
# shells. USED_SETSID=1 means the actual npm/tsx/node tree ends up in its own
# process group, which kill_tree then tears down on EXIT/INT/TERM.
BIFROST_CMD="PORT='$BIFROST_PORT' WEBHOOK_SECRET='$SECRET' NODE_ENV=development AALIYAH_MTA_DRY_RUN='${AALIYAH_MTA_DRY_RUN:-}' AALIYAH_MTA_HOST='${AALIYAH_MTA_HOST:-127.0.0.1}' AALIYAH_MTA_PORT='${AALIYAH_MTA_PORT:-25}' npm run dev"
BIFROST_PID=$(spawn_dev "$BIFROST_LOG" "apps/bifrost" "$BIFROST_CMD")
echo "[probe] Started bifrost (pid=$BIFROST_PID, log=$BIFROST_LOG)"

# ── Start PWA ─────────────────────────────────────────────────────────────
PWA_CMD="PORT='$PWA_PORT' NEXT_PUBLIC_BIFROST_URL='http://127.0.0.1:$BIFROST_PORT' BIFROST_HTTP_URL='http://127.0.0.1:$BIFROST_PORT' NODE_ENV=development npm run dev -- -p '$PWA_PORT'"
PWA_PID=$(spawn_dev "$PWA_LOG" "apps/pwa" "$PWA_CMD")
echo "[probe] Started PWA (pid=$PWA_PID, log=$PWA_LOG)"

# ── Fast-fail on early subshell death ─────────────────────────────────────
# If either dev server died within 2 s of spawn (typically a TS compile error
# on import, a bad env var, or a port collision oddly surviving the picker),
# the 60 s ready-poll below would otherwise timeout without surfacing the
# root cause from the stdio file.
sleep 2
if ! kill -0 "$BIFROST_PID" 2>/dev/null; then
  echo "[probe] FAIL: bifrost dev server exited unexpectedly within 2 s of spawn" >&2
  echo "----- bifrost stdio (last 40 lines) -----"
  tail -40 "$BIFROST_LOG"
  exit 4
fi
if ! kill -0 "$PWA_PID" 2>/dev/null; then
  echo "[probe] FAIL: PWA dev server exited unexpectedly within 2 s of spawn" >&2
  echo "----- PWA stdio (last 40 lines) -----"
  tail -40 "$PWA_LOG"
  exit 4
fi

# ── Wait for bifrost /health ──────────────────────────────────────────────
echo "[probe] Waiting for bifrost /health (max 60 s)…"
HEALTH=""
ATTEMPTS=0
for i in $(seq 1 60); do
  HEALTH=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$BIFROST_PORT/health" 2>/dev/null || echo)
  if [ "$HEALTH" = "200" ]; then
    ATTEMPTS=$i
    break
  fi
  sleep 1
done
if [ "$HEALTH" != "200" ]; then
  echo "[probe] FAIL: bifrost /health never returned 200 after ${ATTEMPTS:-60} s" >&2
  echo "----- bifrost stdio (last 40 lines) -----"
  tail -40 "$BIFROST_LOG"
  exit 4
fi
echo "[probe] Bifrost /health OK after ${ATTEMPTS}s"

# ── Wait for PWA / ────────────────────────────────────────────────────────
echo "[probe] Waiting for PWA / (max 90 s — PWA cold compile can be slow)…"
PWA_READY=""
PWA_ATTEMPTS=0
for i in $(seq 1 90); do
  PWA_READY=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PWA_PORT/" 2>/dev/null || echo)
  if [ -n "$PWA_READY" ] && [ "$PWA_READY" != "000" ]; then
    PWA_ATTEMPTS=$i
    break
  fi
  sleep 1
done
if [ -z "$PWA_READY" ] || [ "$PWA_READY" = "000" ]; then
  echo "[probe] FAIL: PWA / never responded after ${PWA_ATTEMPTS:-90} s" >&2
  echo "----- PWA stdio (last 40 lines) -----"
  tail -40 "$PWA_LOG"
  exit 4
fi
echo "[probe] PWA / OK after ${PWA_ATTEMPTS}s (status $PWA_READY)"

# Warm-compile the route we need so PROBE_1 isn't paying for Next's lazy
# JIT-compile latency (~500ms–2s on a cold dev server). Next.js dev mode
# compiles routes lazily on first request, so this prepays that cost. Body
# intentionally minimal — we only need compilation to fire, not validation.
curl -s -o /dev/null -w '' -X POST "http://127.0.0.1:$PWA_PORT/api/cms/template/render" \
  -H 'Content-Type: application/json' \
  -d '{"template_id":"tpl_welcome_01","contact_context":{}}' >/dev/null 2>&1 || true

# ════════════════════════════════════════════════════════════════════════════
# PROBE 1 — PWA → /api/cms/template/render with NO x-webhook-* headers
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "[probe] === PROBE 1: PWA -> /api/cms/template/render (caller sends no x-webhook-*) ==="
PROBE1_REQ='{"template_id":"tpl_welcome_01","contact_context":{"contact_name":"Probe Jane","contact_email":"probe-jane@example.com","intent":"welcome"}}'
PROBE1_BODY_FILE="$(mktemp)"
PROBE1_HTTP=$(curl -s -o "$PROBE1_BODY_FILE" -w '%{http_code}' \
  -X POST "http://127.0.0.1:$PWA_PORT/api/cms/template/render" \
  -H 'Content-Type: application/json' \
  -d "$PROBE1_REQ")
PROBE1_BODY="$(cat "$PROBE1_BODY_FILE")"
rm -f "$PROBE1_BODY_FILE"

PROBE_1_PASS=0
if [ "$PROBE1_HTTP" = "200" ] \
    && echo "$PROBE1_BODY" | grep -q '"html":"' \
    && echo "$PROBE1_BODY" | grep -q '"text":"'; then
  PROBE_1_PASS=1
  echo "[probe] PROBE_1: PASS (HTTP 200 + rendered body)"
  echo "[probe]   subject: $(echo "$PROBE1_BODY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(JSON.parse(s).subject||"")}catch{process.stdout.write("(parse error)")}})')"
else
  echo "[probe] PROBE_1: FAIL (HTTP $PROBE1_HTTP; body excerpt: ${PROBE1_BODY:0:200})"
fi

# ════════════════════════════════════════════════════════════════════════════
# PROBE 2 — Direct POST /api/cms/content/publish with body-bound HMAC
# ════════════════════════════════════════════════════════════════════════════
echo ""
echo "[probe] === PROBE 2: direct POST /api/cms/content/publish (body-bound HMAC) ==="
PUB_UUID=$(node -e 'process.stdout.write(require("crypto").randomUUID())')
ACTION_ID="CMS__PUBLISH__$PUB_UUID"
PUB_BODY='{"draft_id":"probe-draft-001","html":"<p>probe HTML</p>","subject":"probe subject","text":"probe text body","to":{"email":"probe-recipient@example.com"},"approval":{"approved_by":"probe-user","confirmed":true}}'

MINT_JSON=$(node -e "const b=process.argv[1];process.stdout.write(JSON.stringify({actionId:process.argv[2],rawBody:b}))" "$PUB_BODY" "$ACTION_ID")
MINT_OUT=$(curl -s -X POST "http://127.0.0.1:$BIFROST_PORT/api/bifrost/proxy-sign" \
  -H 'Content-Type: application/json' \
  -d "$MINT_JSON")

SIG=$(echo "$MINT_OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);process.stdout.write(o.signature||"")})')
TS=$(echo "$MINT_OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);process.stdout.write(String(o.timestamp||0))})')
EXP=$(echo "$MINT_OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);process.stdout.write(String(o.expiresAt||0))})')
echo "[probe] actionId=$ACTION_ID sig_length=${#SIG}"

PROBE2_BODY_FILE="$(mktemp)"
PROBE2_HTTP=$(curl -s -o "$PROBE2_BODY_FILE" -w '%{http_code}' \
  -X POST "http://127.0.0.1:$BIFROST_PORT/api/cms/content/publish" \
  -H 'Content-Type: application/json' \
  -H "x-webhook-action: $ACTION_ID" \
  -H "x-webhook-signature: $SIG" \
  -H "x-webhook-timestamp: $TS" \
  -H "x-webhook-expires-at: $EXP" \
  -d "$PUB_BODY")
PROBE2_BODY="$(cat "$PROBE2_BODY_FILE")"
rm -f "$PROBE2_BODY_FILE"

# Accept 200 (full success) OR 500 (auth validated but downstream failed —
# e.g. Prisma unreachable in CI). The signal is: if auth had rejected, we'd
# see 401 or 400 BAD_PROXY_AUTH. Anything else is auth-passing.
PROBE_2_PASS=0
case "$PROBE2_HTTP" in
  200)
    PROBE_2_PASS=1
    PROBE2_TRANSPORT=$(echo "$PROBE2_BODY" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const o=JSON.parse(s);process.stdout.write(o.transport||"")}catch{process.stdout.write("(parse error)")}})')
    echo "[probe] PROBE_2: PASS (HTTP 200 — auth validated + downstream finished, transport=$PROBE2_TRANSPORT)"
    ;;
  500)
    PROBE_2_PASS=1
    echo "[probe] PROBE_2: PASS-WITH-DOWNSTREAM-FAILURE (HTTP 500 — auth validated; downstream failed: ${PROBE2_BODY:0:200})"
    ;;
  401|400)
    echo "[probe] PROBE_2: FAIL (HTTP $PROBE2_HTTP — auth rejected: ${PROBE2_BODY:0:200})"
    ;;
  *)
    echo "[probe] PROBE_2: FAIL (HTTP $PROBE2_HTTP; body excerpt: ${PROBE2_BODY:0:200})"
    ;;
esac

# ════════════════════════════════════════════════════════════════════════════
# Verdict
# ════════════════════════════════════════════════════════════════════════════
echo ""
if [ "$PROBE_1_PASS" = "1" ] && [ "$PROBE_2_PASS" = "1" ]; then
  echo "[probe] ============== VERDICT: PASS (probes 1 + 2) =============="
  PROBE_RESULT=0
elif [ "$PROBE_1_PASS" = "0" ] && [ "$PROBE_2_PASS" = "0" ]; then
  echo "[probe] ============== VERDICT: FAIL (both probes failed) =============="
  PROBE_RESULT=3
elif [ "$PROBE_1_PASS" = "0" ]; then
  echo "[probe] ============== VERDICT: FAIL (probe 1 failed) =============="
  PROBE_RESULT=1
else
  echo "[probe] ============== VERDICT: FAIL (probe 2 failed) =============="
  PROBE_RESULT=2
fi

# On failure: dump both stdio tails so the CI log shows the bifrost
# middleware outcomes and any Prisma/SMTP error trace.
if [ "$PROBE_RESULT" != "0" ]; then
  echo ""
  echo "[probe] ---- bifrost stdio (last 60 lines, diagnostics) ----"
  tail -60 "$BIFROST_LOG"
  echo ""
  echo "[probe] ---- PWA stdio (last 30 lines, diagnostics) ----"
  tail -30 "$PWA_LOG"
fi

exit "$PROBE_RESULT"
