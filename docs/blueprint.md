# [KOA REALM]: ISOMORPHIC MULTIPLAYER ARCHITECTURE (v2.0)

## 1. The Isomorphic Action Layer

- Framework target: `@agent-native/core`.
- Philosophy: UI buttons and Knight autonomous decisions call the same TypeScript functions.
- Routing: all high-risk actions funnel through the Bifrost Bridge.
- Evidence boundary: current confirmed Bifrost controls are HMAC webhook validation, Tailscale remote MCP guard, local-first `//REZERO`, and worker-thread microcubes. mTLS remains planned until implemented in code.

## 2. Embedded Nano-Squires

- Role: browser-local WebAssembly/TinyLLM workers for immediate UI governance.
- Current confirmed implementation: VAD hooks, browser voice utilities, and local component state.
- Planned implementation: local TinyLLM substrate for low-risk UI animation and triage decisions without waking cloud services.

## 3. The Memory Vault

- Component: `<LearnWithMe />` today, evolving toward `<MemoryCurator />`.
- Current storage: browser-readable `public/memory.md` plus local-only delete behavior.
- Planned storage: SQLite/Graph hybrid with graph triplet conversion and node-level deletion from Lakeisha context.

## 4. Root Spatial Shell

- `app/layout.tsx` mounts `<KoARealmProvider>` at the application root.
- `<KoARealmProvider>` owns `<SpatialBackground />`, children, and `<LakeishaVideoHUD />`.
- Page-level tabs render Property, Streaming, and Coffee glass panels over the persistent 3D substrate.
