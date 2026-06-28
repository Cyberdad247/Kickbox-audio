#!/usr/bin/env bash
# scripts/ci/apply-branch-protection.sh
#
# Apply the production-grade branch protection payload in
# scripts/ci/protect-branch.json to a target branch on the current repo.
#
# Implementation note (Windows + Linux compatible):
#   We use `curl --data-binary @file` directly because earlier gh api -f
#   experiments turned nested JSON arrays into angle-bracket-escaped
#   strings and got HTTP 422 back. The curl path is fully predictable.
#   We also use `node -e` for the AFTER-block pretty-printer (instead of
#   `python -c`) because node ships on every CI runner, while `python` is
#   not guaranteed on Windows hosts.
#
# Behaviour:
#   * Pre-flight: checks the most recent run of the required context
#     (default: hitl-handshake). If it never concluded success, prints
#     a WARN with impact analysis (strict protection will block merges
#     indefinitely until the workflow goes green). Does NOT refuse —
#     the operator can still proceed if they understand the risk.
#   * Idempotent: re-PUT of identical payload returns HTTP 200.
#   * Exits 0 on HTTP 200/201, 1 on non-2xx (with diagnostic dump).
#
# Usage:
#   scripts/ci/apply-branch-protection.sh <branch> [payload.json] [required-context]
#
# Per AGENTS.md Rule 6 (Runic Authority Defense), this is governance
# tooling and never bypasses CODEOWNERS approval — it only ENFORCES it.

set -euo pipefail

BRANCH="${1:?branch arg required (e.g. feat/kba-cartridge-v1000)}"
PAYLOAD="${2:-scripts/ci/protect-branch.json}"
CONTEXT="${3:-hitl-handshake}"

if [[ ! -f "${PAYLOAD}" ]]; then
  echo "[apply-branch-protection] payload file not found: ${PAYLOAD}" >&2
  exit 66
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "[apply-branch-protection] gh CLI missing" >&2
  exit 64
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "[apply-branch-protection] gh not authed" >&2
  exit 65
fi

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner' 2>/dev/null) || {
  echo "[apply-branch-protection] not inside a gh-aware repo" >&2
  exit 67
}

echo "[apply-branch-protection] REPO=${REPO}"
echo "[apply-branch-protection] BRANCH=${BRANCH}"
echo "[apply-branch-protection] PAYLOAD=${PAYLOAD}"
echo "[apply-branch-protection] CONTEXT=${CONTEXT}"

echo
echo "--- BEFORE ---"
gh api "repos/${REPO}/branches/${BRANCH}" \
  -q '"protected=\(.protected)"' 2>/dev/null || echo "(branch protected-state query failed)"

echo
echo "--- PRE-FLIGHT ---"
echo "Checking for recent SUCCESS on required context '${CONTEXT}'..."
HEAD_SHA=$(gh api "repos/${REPO}/commits?per_page=1&sha=${BRANCH}" -q '.[0].sha' 2>/dev/null || echo "")
if [[ -z "${HEAD_SHA}" || "${HEAD_SHA}" == "null" ]]; then
  echo "[apply-branch-protection] WARN: cannot read HEAD SHA — pre-flight SKIPPED"
else
  echo "[apply-branch-protection] HEAD = ${HEAD_SHA}"
  CONCLUSION=$(gh api "repos/${REPO}/commits/${HEAD_SHA}/check-runs" \
    -q ".check_runs[] | select(.name == \"${CONTEXT}\") | .conclusion" 2>/dev/null | head -1 || echo "")
  if [[ "${CONCLUSION}" == "success" ]]; then
    echo "[apply-branch-protection] OK recent ${CONTEXT}=success"
  elif [[ -z "${CONCLUSION}" ]]; then
    echo "[apply-branch-protection] WARN: ${CONTEXT} has NO check runs on HEAD."
    echo "  Likely inverse: check-runs query failed (workflow not yet executed"
    echo "  on this SHA) OR the workflow lacks permissions. Tight branch"
    echo "  protection will HALT every merge attempt until KBA Smoke"
    echo "  visits this SHA with conclusion=success."
  else
    echo "[apply-branch-protection] WARN: ${CONTEXT} did NOT conclude 'success' on HEAD."
    echo "  Observed conclusion: ${CONCLUSION}"
    echo "  Tight branch protection will HALT every merge attempt"
    echo "  until the KBA Smoke workflow goes green."
  fi
  echo "  Continuing (operator choice) — surface as followup if unexpected."
fi

echo
echo "--- PUT ---"
HTTP_FILE=$(mktemp 2>/dev/null || echo "/tmp/protec-http.$$.txt")
HTTP=$(curl -sS -o "${HTTP_FILE}" -w '%{http_code}' \
  -X PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Authorization: Bearer $(gh auth token)" \
  "https://api.github.com/repos/${REPO}/branches/${BRANCH}/protection" \
  -H "Content-Type: application/json" \
  --data-binary "@${PAYLOAD}") || HTTP="curl-failed"

echo "HTTP ${HTTP}"
echo "--- RESPONSE (first 600 bytes) ---"
head -c 600 "${HTTP_FILE}" 2>/dev/null || true
echo

echo
echo "--- AFTER ---"
PROTECT=$(gh api "repos/${REPO}/branches/${BRANCH}/protection" 2>/dev/null || echo "{}")
echo "${PROTECT}" | node -e '
let s = "";
process.stdin.on("data", c => s += c);
process.stdin.on("end", () => {
  try {
    const d = JSON.parse(s);
    const rs = d.required_status_checks || {};
    const rr = d.required_pull_request_reviews || {};
    const fp = typeof d.allow_force_pushes === "object" ? d.allow_force_pushes.enabled : d.allow_force_pushes;
    const dl = typeof d.allow_deletions === "object" ? d.allow_deletions.enabled : d.allow_deletions;
    console.log("  protected=true");
    console.log("  required_approving=" + (rr.required_approving_review_count ?? 0));
    console.log("  require_code_owner=" + (rr.require_code_owner_reviews ?? false));
    console.log("  dismiss_stale=" + (rr.dismiss_stale_reviews ?? false));
    console.log("  strict=" + (rs.strict ?? false));
    console.log("  contexts=" + JSON.stringify(rs.contexts || []));
    console.log("  linear=" + (d.required_linear_history ?? false));
    console.log("  force=" + (fp ?? false));
    console.log("  delete=" + (dl ?? false));
  } catch (e) {
    console.log("(JSON parse fallback: " + e.message + ")");
  }
});
'

if [[ "${HTTP}" != "200" && "${HTTP}" != "201" ]]; then
  echo
  echo "[apply-branch-protection] PUT failed with HTTP ${HTTP}" >&2
  echo "Likely causes:" >&2
  echo "  - admin scope missing on the gh token" >&2
  echo "  - branch name typo" >&2
  echo "  - payload structure rejected by the API" >&2
  rm -f "${HTTP_FILE}"
  exit 1
fi

rm -f "${HTTP_FILE}"
echo
echo "[apply-branch-protection] OK protection applied"
