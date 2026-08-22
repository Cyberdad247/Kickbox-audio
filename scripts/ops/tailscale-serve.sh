#!/usr/bin/env bash
# scripts/ops/tailscale-serve.sh
#
# Sovereign-side wrapper for `tailscale serve` to HTTPS-front the local
# mcp-query gateway. Implements **Path B** of the Task 5.6 decision matrix
# (Tailscale `serve` as the mTLS transport-layer gate; cert auto-issued by
# the local Tailscale daemon). Tailscale `serve` is tailnet-private —
# `*.ts.net` only, no public Funnel exposure.
#
#   Sovereign Ruling:    commit 1fa274a8 (docs/task.md Sovereign Ruling subsection)
#   Blueprint evidence:  commit 51b1ef1f (docs/blueprint.md line 8 — Path B)
#   Pattern reference:   scripts/laptop-server/README.md ("Tailscale Funnel"
#                        section, lines 134-135) — same `tailscale ... --bg`
#                        invocation style, applied here to `serve` (private)
#                        instead of `funnel` (public).
#
# Modes:
#   --setup    (default) pre-flight + tailscale up (if needed) + serve --bg + verify
#   --status               tailscale serve status --json (read-only)
#   --reset                tailscale serve reset (tear down)
#   --dry-run              print every command without executing
#   -h | --help            print this header
#
# Required env (sovereign-side ONLY — never committed, never in CLI args):
#   TS_AUTHKEY              tskey-auth-... (only consulted if tailscale is not
#                           already logged in on this host)
#   TS_HOSTNAME             node hostname to claim on the tailnet
#                           (default: $HOSTNAME or "kba-mcp")
#   MCP_QUERY_PORT          local mcp-query port
#                           (default 7800 per scripts/laptop-server/README.md)
#
# Exit codes:
#   0  success
#   1  pre-flight failure (tailscale missing, not logged in, mcp-query down)
#   2  tailscale serve / status command failure
#   3  status JSON parse failure (cert not auto-issued yet)
#
# This script is sovereign-side runnable only. CI integration (the
# `.github/workflows/kba-smoke.yml` runner-binary update for `tailscale`
# on $PATH) is separate work tracked under Task 5.6-C and intentionally
# not bundled into this commit.

set -uo pipefail

LOG="/tmp/tailscale-serve.log"
MODE="${1:-}"
MCP_QUERY_PORT="${MCP_QUERY_PORT:-7800}"
TS_HOSTNAME="${TS_HOSTNAME:-${HOSTNAME:-kba-mcp}}"

mkdir -p "$(dirname "$LOG")"
: > "$LOG"

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

# mask_tskey: replace any tskey-auth-... literal with the masked form so the
# auth key never lands in stdout/stderr/logs if `tailscale up` echoes it.
mask_tskey() {
  sed -E 's/tskey-[A-Za-z0-9_-]+/tskey-***MASKED***/g'
}

log()  { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG"; }
warn() { printf '[WARN] %s\n' "$*" | tee -a "$LOG" >&2; }
fail() { printf '[FAIL] %s\n' "$*" | tee -a "$LOG" >&2; exit "${2:-1}"; }

# -----------------------------------------------------------------------------
# Pre-flight
# -----------------------------------------------------------------------------

preflight() {
  log "preflight: tailscale binary on PATH"
  if ! command -v tailscale >/dev/null 2>&1; then
    fail 1 "tailscale not on PATH. Install per https://tailscale.com/download (scoop install tailscale on Windows; brew install tailscale on macOS; apt install tailscale on Debian/Ubuntu)."
  fi
  log "  tailscale -> $(command -v tailscale)"

  log "preflight: tailscale login state"
  if ! tailscale status >/dev/null 2>&1; then
    if [ -z "${TS_AUTHKEY:-}" ]; then
      fail 1 "tailscale not logged in AND TS_AUTHKEY not set. Export TS_AUTHKEY=tskey-... (one-time, sovereign-side only) and re-run."
    fi
    log "  tailscale up --authkey=tskey-***MASKED*** --hostname=${TS_HOSTNAME}"
    if [ "$MODE" = "--dry-run" ]; then
      log "  DRY-RUN: skipping tailscale up"
    else
      if ! tailscale up --authkey="$TS_AUTHKEY" --hostname="$TS_HOSTNAME" 2>&1 \
        | tee -a "$LOG" | mask_tskey; then
        fail 1 "tailscale up failed (hostname taken? authkey expired?). See $LOG."
      fi
    fi
  else
    SELF_HOSTNAME="$(tailscale status --json 2>/dev/null \
      | grep -oE '"HostName":"[^"]+"' | head -1 | sed 's/.*"//;s/"$//' || true)"
    log "  already logged in as: ${SELF_HOSTNAME:-unknown}"
  fi

  log "preflight: mcp-query on localhost:${MCP_QUERY_PORT}/health"
  if ! curl -sf --max-time 3 "http://localhost:${MCP_QUERY_PORT}/health" >/dev/null 2>&1; then
    fail 1 "mcp-query not reachable on localhost:${MCP_QUERY_PORT}. Start it first:\n  \$env:PORT=${MCP_QUERY_PORT}; node apps/mcp-query/dist/server.js\nThen re-run $0."
  fi
  log "  mcp-query health: OK"

  log "preflight: PASS"
}

# -----------------------------------------------------------------------------
# Modes
# -----------------------------------------------------------------------------

setup_serve() {
  log "setup: tailscale serve --bg --https=443 http://localhost:${MCP_QUERY_PORT}"
  if [ "$MODE" = "--dry-run" ]; then
    log "  DRY-RUN: would run: tailscale serve --bg --https=443 http://localhost:${MCP_QUERY_PORT}"
  else
    # Show current status first (idempotency hint to the operator)
    EXISTING="$(tailscale serve status --json 2>/dev/null || echo "")"
    if [ -n "$EXISTING" ] && echo "$EXISTING" | grep -q "${MCP_QUERY_PORT}"; then
      log "  existing serve config references port ${MCP_QUERY_PORT}; --bg will overwrite in place"
    fi
    if ! tailscale serve --bg --https=443 "http://localhost:${MCP_QUERY_PORT}" 2>&1 \
      | tee -a "$LOG" | mask_tskey; then
      fail 2 "tailscale serve failed. See $LOG."
    fi
  fi

  log "verify: tailscale serve status --json"
  if [ "$MODE" = "--dry-run" ]; then
    log "  DRY-RUN: would run: tailscale serve status --json"
    return 0
  fi
  if ! STATUS_JSON="$(tailscale serve status --json 2>&1)"; then
    fail 2 "tailscale serve status failed. See $LOG."
  fi
  printf '%s\n' "$STATUS_JSON" | mask_tskey | tee -a "$LOG"

  # Pull CertDomain (the *.ts.net host Tailscale auto-issued the cert for).
  # Tailscale serve status --json shape (v1.44+):
  #   { "TCP": {...}, "Web": { "<CERT_DOMAIN>": { "Handlers": {...}, "Cert": [...] } } }
  CERT_DOMAIN="$(printf '%s' "$STATUS_JSON" \
    | grep -oE '"[A-Za-z0-9._-]+\.ts\.net"' \
    | head -1 \
    | sed 's/^"//;s/"$//' || true)"

  if [ -z "$CERT_DOMAIN" ]; then
    fail 3 "CertDomain (*.ts.net host) not found in serve status JSON. Cert may still be issuing — wait 30s and re-run with --status, or check 'tailscale debug'."
  fi

  # Health probe via the gated URL
  log "verify: HTTPS probe https://${CERT_DOMAIN}/tools/list"
  if ! curl -sIL --max-time 5 "https://${CERT_DOMAIN}/tools/list" >/dev/null 2>&1; then
    warn "HTTPS probe failed. The serve config is in place but the cert may not have been picked up yet — try again in 30s."
  else
    log "  HTTPS probe: OK"
  fi

  cat <<EOF

[OK] tailscale serve gate live (Path B).
  CertDomain: ${CERT_DOMAIN}
  Backend:    http://localhost:${MCP_QUERY_PORT}
  Public URL: https://${CERT_DOMAIN}

Verify from a SECOND tailnet device (5.6-C integration test):
  curl -sIL "https://${CERT_DOMAIN}/tools/list" | head -3
  curl -s   "https://${CERT_DOMAIN}/tools/list"

Re-verify status locally:
  $0 --status

Tear down:
  $0 --reset
EOF
}

status_serve() {
  log "status: tailscale serve status --json"
  if ! tailscale serve status --json 2>&1 | mask_tskey; then
    fail 2 "tailscale serve status failed."
  fi
}

reset_serve() {
  log "reset: tailscale serve reset"
  if [ "$MODE" = "--dry-run" ]; then
    log "  DRY-RUN: would run: tailscale serve reset"
    return 0
  fi
  if ! tailscale serve reset 2>&1 | tee -a "$LOG" | mask_tskey; then
    fail 2 "tailscale serve reset failed."
  fi
  log "  tailscale serve reset complete"
}

print_help() {
  sed -n '2,40p' "$0"
}

# -----------------------------------------------------------------------------
# Dispatch
# -----------------------------------------------------------------------------

case "$MODE" in
  ""|--setup)    MODE="--setup";    preflight && setup_serve ;;
  --status)                         status_serve ;;
  --reset)                          reset_serve ;;
  --dry-run)     MODE="--dry-run";  preflight && setup_serve ;;
  -h|--help)                        print_help; exit 0 ;;
  *)
    fail 1 "unknown mode: ${MODE} (use --setup, --status, --reset, --dry-run, or --help)"
    ;;
esac