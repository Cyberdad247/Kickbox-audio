# [⚡ //EXPANSION]: CAMELOT-OS ENTERPRISE ARCHITECTURE BLUEPRINT v9000.92

**Orchestrator:** MERLIN_Ω · **Fabricator:** SIR_CODEX · **Governor:** SIR_BORRIS · **Crucible:** SIR_WATCHDOG
**Sovereign Authority:** Vizion · **Operational Mode:** BEAVER_MODE (100% DRY)

---

## 1. HARDWARE TOPOLOGY — THERMODYNAMIC INVERSION

The deployment physics invert the traditional hub-heavy model. Cybertronia is the
**lean forge**; the KBA Edge is the **heavy inference node**.

### Cybertronia (The Hub) — 4 GB Scarcity Node
| Attribute | Value |
|-----------|-------|
| **Role** | Lightweight Forge & Orchestrator |
| **Spec** | 4 GB RAM, CPU-only compilation |
| **Compiles** | Go, Rust (WASM `no_std`), React/TypeScript (Next.js) |
| **Runtime** | Node.js (Bifrost gateway), Next.js (PWA) |
| **Sovereign Contact** | Vizion (maintainer) |

**Responsibility:** Pure orchestration surface. Compile, bundle, lint, test.
No heavy inference runs here. The Preflight CI validates all artifacts before
promotion to the Edge.

### KBA Services Drone (The Edge) — 16 GB Heavy Compute Node
| Attribute | Value |
|-----------|-------|
| **Role** | Heavy Inference & Fuzzing Engine |
| **Spec** | 16 GB RAM, GPU-accelerated inference |
| **Models** | PyTorch / ONNX: `LiveTalking` (avatar), `voicebox` (TTS) |
| **Fuzzing** | `Freebuff` eBPF-driven aggressive fuzzing |
| **Runtime** | Linux `systemd` services, `cgroups v2` isolation |

**Memory Allocation (`cgroups v2`, enforced by SIR_BORRIS):**
- 8 GB — Audio/Visual models (LiveTalking + voicebox)
- 4 GB — Freebuffer eBPF fuzzing
- 4 GB — OS + Go Omni-Router

**Responsibility:** Deploy compiled WASM pills, serve inference, run fuzzing
campaigns. No compilation here — only execution.

---

## 2. THE KINETIC DAG — 4-PHASE EXECUTION SEQUENCE

```
PHASE 1 ──► PHASE 2 ──► PHASE 3 ──► PHASE 4
(PWA CMS)    (WASM Pills)  (Go Router)   (Edge Ignition)
```

---

### PHASE 1: THE PWA ECOSYSTEM CARTRIDGE

**Knight Lead:** SIR_CODEX (Bioswarm Fabricator)
**Target:** Vercel / Git (existing `feat/knight-console` branch)

#### Current State (Already Built on `feat/knight-console`)
| Component | Status | Location |
|-----------|--------|----------|
| Next.js 14 App Router | ✅ Exist | `apps/pwa/` |
| Tailwind + Brutalist tokens | ✅ Exist | `apps/pwa/tailwind.config.ts` |
| React Three Fiber background | ✅ Exist | `apps/pwa/src/components/3d/` |
| Bifrost WebSocket context | ✅ Exist | `apps/pwa/src/context/BifrostContext.tsx` |
| CMS template engine (server) | ✅ Exist | `apps/bifrost/src/cms.ts` |
| CMS API routes (render/draft/publish) | ✅ Exist | `apps/bifrost/src/server.ts` |
| AaliyahComposer (PWA UI) | ✅ Exist | `apps/pwa/src/components/dashboard/AaliyahComposer.tsx` |
| SMTP relay module | ✅ Exist | `apps/bifrost/src/smtpRelay.ts` |

#### Remaining Work
| Task | Priority | Notes |
|------|----------|-------|
| `/cms` full dashboard route | H1 | Full Contacts/Campaigns/Templates UI |
| IndexedDB offline sync layer | H1 | Local cache → Prisma (MCP bridge) |
| Contact editor UI | H2 | Inline edit for every contact field |
| `/dev/vocal` route | H2 | Dev-only LiveTalking + voicebox config panel |
| 10s clip recording UI | H3 | Browser-based voice capture for cloning |
| Lip-sync latency test UI | H3 | Measure LiveTalking sync drift |

#### Stack
- **Frontend:** Next.js 14 App Router, React 18, Tailwind CSS, R3F
- **State:** React Context (BifrostContext) → Redux Toolkit (planned)
- **Backend:** Express + WebSocket (Bifrost) + Prisma (PostgreSQL)
- **Auth:** HMAC-signed KBA actions

---

### PHASE 2: UNIVERSAL MCP PILLS (Rust `no_std` WASM)

**Knight Lead:** SIR_CODEX (with MERLIN_Ω architecture guidance)
**Target:** `apps/pills/` (new workspace)

#### Architecture
Each pill is a WASM micro-container exposing MCP tools over ZeroClaw IPC
(`memfd_create` shared-memory transport). Compiled on Cybertronia, executed
on the KBA Edge.

| Pill | File | MCP Tools | Data Layer |
|------|------|-----------|------------|
| **Aaliyah Comms** | `aaliyah_comms.rs` | `create_contact`, `list_campaigns`, `render_template`, `queue_dispatch` | SQLite (via `rusqlite`) |
| **Moonshine STT** | `moonshine_stt.rs` | `transcribe_audio`, `get_models`, `set_language` | Ephemeral buffers |
| **Tiny TTS** | `tiny_tts.rs` | `synthesize`, `get_voices`, `set_voice_params` | Ephemeral buffers |

#### Toolchain Setup Required
1. Install Rust (`rustup`) targeting `wasm32-unknown-unknown`
2. Add `wasm-pack` for build → WASM bundling
3. Create `apps/pills/` workspace with `Cargo.toml`
4. Implement MCP JSON-RPC over ZeroClaw (`memfd_create` on Linux, shared memory on macOS)
5. Cross-compile `no_std` WASM for edge deployment

#### MCP Protocol Schema (JSON-RPC 2.0)
```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "tools/call",
  "params": {
    "name": "create_contact",
    "arguments": {
      "email": "owner@kickbox.audio",
      "name": "Andre"
    }
  }
}
```

---

### PHASE 3: THE GO OMNI-ROUTER — THE CONSOLE

**Knight Lead:** SIR_BORRIS (Min-Max Governor)
**Target:** `apps/router/` (new workspace)

#### Architecture
A Go daemon that bridges the PWA (WebSocket/SSE) to the WASM Pills (ZeroClaw IPC).

```
┌─────────────┐     WebSocket      ┌──────────────────┐     ZeroClaw IPC     ┌──────────────┐
│   PWA PWA    │ ────────────────► │  Go Omni-Router   │ ──────────────────► │  WASM Pills  │
│  (Next.js)   │ ◄──────────────── │  (Go daemon)      │ ◄────────────────── │  (Rust no_std)│
└─────────────┘     SSE/JSON-RPC   └──────────────────┘     memfd_create     └──────────────┘
                                            │
                                            │ WebSocket
                                            ▼
                                     ┌──────────────┐
                                     │  Bifrost GW   │
                                     │  (Express/WS) │
                                     └──────────────┘
```

#### Components
| Module | File | Responsibility |
|--------|------|---------------|
| **Multi-Voice Router** | `multivoice_router.go` | WebSocket/SSE server — PWA ↔ WASM bridge |
| **MCP Gateway** | `mcp_gateway.go` | JSON-RPC 2.0 translation → memory pointer dispatch |
| **Hermes Ingress** | `hermes_ingress.go` | Voice trigger detection (wake words) |
| **Jarvis Bridge** | `jarvis_bridge.go` | Secondary voice pipeline (fallback) |

#### Toolchain Setup Required
1. Install Go (`go install go.dev`)
2. Create `apps/router/` with `go mod init`
3. Implement WebSocket server (gorilla/websocket)
4. Implement ZeroClaw IPC client → WASM pill dispatch
5. Integrate with existing Bifrost heartbeat/telemetry

---

### PHASE 4: //EXPANSION — 16GB KBA NODE IGNITION

**Knight Lead:** SIR_WATCHDOG (Crucible) + SIR_BORRIS (cgroups governor)
**Target:** `scripts/edge/` (deployment scripts)

#### Systemd Services
| Service | File | Description |
|---------|------|-------------|
| LiveTalking | `lakisha-livetalking.service` | PyTorch/ONNX avatar inference |
| Voicebox | `lakisha-voicebox.service` | TTS synthesis pipeline |
| Freebuffer | `lakisha-freebuffer.service` | eBPF fuzzing campaign |
| Omni-Router | `lakisha-omni-router.service` | Go daemon (from Phase 3) |

#### cgroups v2 Memory Limits (SIR_BORRIS Enforced)
```
/lakisha-av.model          memory.max = 8G
/lakisha-freebuffer         memory.max = 4G
/lakisha-os-router          memory.max = 4G
```

#### Deployment Scripts
| Script | Purpose |
|--------|---------|
| `scripts/edge/ignite.sh` | Full node bootstrap — installs deps, starts services |
| `scripts/edge/health.sh` | Health check — probes all 4 services |
| `scripts/edge/update-pills.sh` | Deploy new WASM pills from Cybertronia CI artifact |
| `scripts/edge/cgroups-apply.sh` | Apply memory limits |

---

## 3. KNIGHT ROSTER — //EXPANSION ASSIGNMENTS

| Knight | Role | Phase | Surface |
|--------|------|-------|---------|
| **MERLIN_Ω** | Architecture Oracle | All | DAG adjudication, protocol design |
| **SIR_CODEX** | Bioswarm Fabricator | 1, 2 | PWA CMS + WASM pills codegen |
| **SIR_BORRIS** | Min-Max Governor | 3, 4 | Go router perf, cgroups enforcement |
| **SIR_WATCHDOG** | Crucible | 4 | Edge ignition, systemd, health probes |
| **LADY_APIS** | Intelligence | All | BASHR research loop for model selection |
| **SIR_HELIO** | Voice Pipeline | 2, 4 | LiveTalking/voicebox integration |

---

## 4. EXISTING CODEBASE MAPPING

```
audit-kickbox-audio/
├── apps/
│   ├── pwa/                         ← PHASE 1: existing + expansion
│   ├── bifrost/                     ← PHASE 1: existing (Express/WS gateway)
│   ├── mcp-query/                   ← PHASE 3: existing (Tailscale MCP guard)
│   ├── pills/                       ← PHASE 2: NEW (Rust WASM workspace)
│   └── router/                      ← PHASE 3: NEW (Go workspace)
├── packages/
│   ├── db/                          ← PHASE 1: existing (Prisma)
│   └── benchmark/                   ← PHASE 4: existing (edge perf testing)
├── scripts/
│   ├── ops/                         ← PHASE 4: existing (ops scripts)
│   └── edge/                        ← PHASE 4: NEW (16GB node bootstrap)
├── docs/
│   ├── blueprint.md                 ← existing (KOA Realm v2.0)
│   ├── expansion-blueprint.md       ← THIS FILE
│   ├── design.md                    ← existing (Brutalist tokens)
│   ├── task.md                      ← existing (PHASE 1-4 DAG)
│   └── verification.md              ← existing (Iron Gate protocols)
└── core/knights/                    ← all phases: JSON-LD registry
```

---

## 5. EXECUTION CONSTRAINTS

| Constraint | Detail |
|------------|--------|
| **Rust/Go not installed** | Must install toolchains before Phase 2/3 |
| **Windows host** | Systemd/cgroups target Linux (WSL2 or bare-metal Edge) |
| **4GB Cybertronia limit** | No heavy inference on hub; compile-only |
| **Existing tests pass** | 95/95 vitest tests must remain green |
| **Zero secrets in code** | All API keys via env vars only |
| **HITL gate** | Financial/destructive actions require sovereign approval |
| **Governance** | All `*.md` docs are governance artifacts — update with care |

---

## 6. VERIFICATION GATES

| Gate | Phase | Check |
|------|-------|-------|
| **Typecheck** | All | `npm run typecheck` — zero errors |
| **Unit tests** | 1, 2 | `npm test` — 95+ passing |
| **WASM build** | 2 | `wasm-pack build` — no `no_std` violations |
| **Go build** | 3 | `go build ./...` — zero errors |
| **cgroups dry-run** | 4 | `scripts/edge/cgroups-apply.sh --dry-run` |
| **E2E smoke** | 1 | `npm run test:e2e` — Playwright tab-swap test |
| **Bundle size** | 1 | `scripts/ops/bundle-size.mjs` — < 150 KB per route |
| **Memory footprint** | 3, 4 | < 256 MB RSS under 100 concurrent clients |
