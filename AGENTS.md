# KICKBOX_AUDIO — Project Agent Constitution
## Working directory: `C:\Users\vizio\CAMELOT_OS\audit-kickbox-audio`

This file is the **project-local** constitution for the kickbox-audio worktree.
It does **not** override the parent CAMELOT-OS `AGENTS.md` (repo root) — for
security, secrets, HUMAN_GATE, and provenance rules, defer to the parent.

---

## Identity & Scope

- **Project:** `kickbox-audio` — Lakisha Voice OS / PWA WebRTC audit + Bifrost
  bridge integration
- **Active branch:** `feat/pwa-lakisha-audit-applied`
- **HEAD:** see `git --git-dir=.git rev-parse HEAD` (5 commits ahead of
  `origin/main`, NOT pushed; rebase of upstream #15/#16 complete)
- **Stack:** Next.js 14 App Router · React 18 · TypeScript strict · Tailwind
- **Top-level laws (governance):**
  - `blueprint.md` — system logic (Singularity Lattice + Bifrost Bridge +
    MiniMax-Manus Mix + Hit-Gate governance)
  - `design.md` — Luxury Minimalist Brutalism (color/typography/HUD tokens)
  - `verification.md` — signed-off iron-gate numerics (FCP, RSS, bundle, VAD,
    Playwright)
  - `HELIO_PATCH.json` — runtime perf-conformance audit artifact (re-generated;
    do not hand-edit)
  - `task.md` — PHASE 1–4 execution DAG

---

## Repository Layout (project-local)

_Note: `core/`, `packages/`, `scripts/`, `node_modules/`, `package.json`, and
`turbo.json` below are monorepo scaffolding (Turborepo / pnpm workspace).
See `turbo.json` for the pipeline; lint/format/audit scripts under `scripts/`._

```
audit-kickbox-audio/
├── apps/
│   └── pwa/                     # Next.js 14 App Router PWA — primary surface
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx   # Root: wraps <BifrostProvider>
│       │   │   └── page.tsx     # Home: <KineticCanvas /> + <LakishaHUD />
│       │   ├── components/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── LakishaHUD.tsx        # voice HUD + tap-to-connect autoplay-gate
│       │   │   ├── Sparkline.tsx
│       │   │   ├── 3d/
│       │   │   │   ├── KineticBackground.tsx
│       │   │   │   └── KineticCanvas.tsx
│       │   │   └── hud/
│       │   │       └── LakishaEnclave.tsx    # upstream's voice enclave (currently unmounted)
│       │   ├── context/
│       │   │   └── BifrostContext.tsx     # WebRTC state + audio bridge
│       │   └── ...
│       ├── tailwind.config.ts    # source of truth for design tokens
│       ├── tsconfig.json         # `@/*` alias → `./src/*` enabled
│       └── package.json
├── core/                        # monorepo-shared core (Rust/TS)
├── packages/                    # monorepo-shared packages
├── scripts/                     # build / audit / verification scripts
├── node_modules/                # monorepo deps (pnpm)
├── package.json                 # workspace root
├── turbo.json                   # Turborepo pipeline
├── design.md                    # aesthetic law
├── blueprint.md                 # system logic
├── task.md                      # 72-hour execution DAG
├── verification.md              # signed-off iron gates
├── HELIO_PATCH.json             # auto-generated perf audit artifact
└── AGENTS.md                    # THIS FILE
```

---

## Project Roster

Inherits the CAMELOT-OS canonical Knight Roster (`AGENTS.md` repo root:
SIR_BORIS, SIR_ALEX, SIR_FORGE, SIR_CODEX, SIR_SENTINEL, SIR_DEBUG,
SIR_GHOST, LADY_APIS, MERLIN_OMEGA, SIR_HELIO). Project-local **sub-agents**
appear in the rendered tree, not the runic router.

> _Project-local Knight roles below are inferred from this branch's commit
> activity, not yet manifest-derived in `.camelot/projects/kickbox-audio/agent.md`._

| Agent | Role | Primary model | Surface(s) |
| --- | --- | --- | --- |
| **SIR_CODEX** | Lead kinetic implementer; rebase + autoplay-gate author | GPT-5 (codex) | `apps/pwa/**`, `design.md` |
| **MERLIN_OMEGA** | Architect — rebase-conflict adjudication | Gemini | `page.tsx`, top-level laws |
| **SIR_SENTINEL** | Security — `BifrostContext` mTLS gate review | Gemini | `BifrostContext.tsx` |
| **SIR_BORIS** | Architect — DRO critiques on token drift | Gemini | `tailwind.config.ts` |
| **SIR_FORGE** | Code execution layer (unused at this commit level) | Gemini | (reserved) |

### Project-local sub-agents (mounted in the browser)

| Sub-agent | Mounted via | Render site | Purpose |
| --- | --- | --- | --- |
| **Lakisha (voice HUD)** | `LakishaHUD.tsx` | `app/page.tsx` | Tap-to-connect autoplay-gate → VAD/stt → form → telemetry |
| **Lakisha Enclave** | `LakishaEnclave.tsx` | `apps/pwa/src/components/hud/` (currently unmounted) | Upstream pre-rebase voice enclave; available if re-enabled |
| **KineticCanvas** | `3d/KineticCanvas.tsx` | `app/page.tsx` (`-z-10`) | WebGL particle/weather background |
| **KineticBackground** | `3d/KineticBackground.tsx` | (orphaned; sibling to KineticCanvas) | Wrapper for dual-layer backdrop — see S1 below |
| **Bifrost Provider** | `context/BifrostContext.tsx` | `app/layout.tsx` | WebRTC connection state + audio bridge |
| **Dashboard** | `Dashboard.tsx` | (currently unmounted) | Nav + LakishaHUD mount via routing |

---

## Verified Files

_Deliberately narrow at this commit's HEAD: re-mounting `<Dashboard />` or
`<LakishaEnclave />` in `page.tsx` is a small revert, not a casual deletion._

- `apps/pwa/src/app/layout.tsx` — wraps `<BifrostProvider>`; removing breaks
  `useBifrost()` in every subtree.
- `apps/pwa/src/app/page.tsx` — narrow Home; do not re-add `<Dashboard />` or
  `<LakishaEnclave />` without explicit user instruction.
- `apps/pwa/src/components/LakishaHUD.tsx` — handles the autoplay-gate; the
  early-return `!isUnlocked` block must come AFTER all hooks (rule S4 below).
- `apps/pwa/tailwind.config.ts` — source of truth for `fontFamily.sans/serif`
  and `letterSpacing.executive/display`. New CSS classes MUST resolve here.
- `apps/pwa/tsconfig.json` — `"@/*"` → `./src/*` alias; `KineticCanvas` is
  imported via this alias and breaks if the mapping is removed.

---

## Provenance

Every file write under `audit-kickbox-audio/` is logged to
`C:\Users\vizio\CAMELOT_OS\PROVENANCE_LEDGER.md` via the parent CAMELOT-OS
PostToolUse hook. Do not edit the ledger directly.

---

## Learned Rules (project-local)

Rule 1: [UX] — ALWAYS gate speech I/O behind an explicit user-tap because the
browser autoplay policy blocks `AudioContext.resume()` and `getUserMedia()`
without a gesture.

Rule 2: [TypeScript] — NEVER use `import any` or `as any` to mask
type-narrowing gaps. `'use client'` is REQUIRED above any file that uses
`next/dynamic({ssr: false})` (Next.js 14 App Router).

Rule 3: [Tailwind] — ALWAYS cross-reference new `className` strings against
`apps/pwa/tailwind.config.ts` before commit; arbitrary `[#hex]` escapes are
acceptable but `font-display`, `tracking-minted`, `bg-obsidian`, etc. are NOT
defined unless added to the config first.

Rule 4: [Hook hygiene] — In `LakishaHUD.tsx`, all `useState`/`useEffect`/
`useRef` calls must precede the `if (!isUnlocked) return ...` early-return so
React's hook ordering is unconditional across renders. Verifiable via:
`grep -nE 'useState|useEffect|useRef|if \(!isUnlocked\)' apps/pwa/src/components/LakishaHUD.tsx` —
hooks' line numbers must all be strictly less than the early-return's.

Rule 5: [Governance] — `*.md` blueprints (`blueprint.md`, `design.md`,
`verification.md`, `task.md`, `AGENTS.md`) are governance artifacts; do not
auto-regenerate. `HELIO_PATCH.json` IS auto-generated; do not hand-edit.
