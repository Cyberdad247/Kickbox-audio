# Kickbox Audio Genesis Knight Registry

This registry stores planned JSON-LD artifacts for the Core Ten Knights.

## Evidence Boundary

Confirmed Bifrost controls:

- HMAC webhook validation in `apps/bifrost/src/security.ts`.
- Tailscale-only remote MCP guard in `apps/bifrost/src/mcp.ts`.
- Local-first `//REZERO` fallback in `apps/bifrost/src/router.ts`.
- Worker-thread microcube isolation in `apps/bifrost/src/microcubic.ts`.

Planned controls:

- Per-Knight mTLS tunnel bindings.
- Excalibur JSON-LD indexing.
- Tiny LLM Nano-Squire edge runtime.

Do not store secrets, tokens, certificate private keys, or live client data in
these artifacts.
