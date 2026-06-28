#!/usr/bin/env bash
# scripts/ci/check-helio-dry.sh
#
# Runs scripts/regen-helio-patch.mjs in dry-run mode and verifies the
# emitted JSON has a top-level "status":"PASS" key. Extracted out of
# the original `run:` scalar of kba-smoke.yml — that scalar contained
# `'…'` (single-quoted bash jq filter) which is forbidden inside a YAML
# unquoted scalar under YAML 1.1 strict mode, and was the cause of the
# sequence of GHA workflow parse rejections observed in this session.

set -uo pipefail

HELIO_DRY_RUN=1 node scripts/regen-helio-patch.mjs > /tmp/helio-dry.json
jq -e '.status == "PASS"' /tmp/helio-dry.json
echo "regen dry-run satisfied"
