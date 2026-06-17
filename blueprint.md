# 🏗️ ARCHITECTURAL BLUEPRINT: SOVEREIGN SYSTEM
**Document Identifier:** SB-100-OMEGA
**Design Philosophy:** Luxury Minimalist Brutalism / Cyber-Medievalism

## 1. MONOREPO STRUCTURE
This system is organized as a unified TypeScript monorepo using npm workspaces to maintain tight boundary limits:

```text
/
├── apps/
│   ├── pwa/             # Next.js 14 App Router (Hosted on Vercel)
│   └── bifrost/         # Node.js WebSocket & Express Gateway (Railway)
├── packages/
│   ├── db/              # Prisma ORM Schema & PostgreSQL Client
│   └── benchmark/       # Green Computing & Latency Test suite
├── vercel.json          # Production frontend deploy rules
└── package.json         # Workspace orchestrator
```

## 2. METALLIC DESIGN SYSTEM (Sovereign Aura Style Guide)
As configured in the Tailwind core, the design uses high-contrast dark environments to emphasize metric density:

### A. Color Tokens
- **Base Layer:** Infinite Obsidian `#050507` (pure matte black)
- **Surfaces:** Smoked Glass `#0D0D11` and `#16161E` (4px backdrop-blur, 80% opacity)
- **Metallic Borders:** Burnished Gold `#D4AF37` / `#e9c349` (applied at 20% opacity for 1px frames)
- **Active Accents:** Radiant Electric Violet `#9D4EDD` / `#e0b6ff` (applied as 12px external glow shadows on active elements)

### B. Typography Pairings
- **Display Sizing:** `Libre Caslon Text` or `Source Serif 4`. Applied with negative letter-spacing (`-0.02em`) on financial values to mimic high-end editorial layouts.
- **Body Text:** `Inter` (sans-serif). Increased tracking on small variants to preserve contrast against dark backdrops.

---

## 3. CORE SYSTEM PIPELINES
The system operates on an event-driven loop triggered by either browser interactions or Lakisha voice actions:

```text
[PWA UI Workspace] ──(WS: Text / Audio Command)──> [Bifrost Gateway]
                                                         │
                                               (NLP & Agent Routing)
                                                         │
                                                         ▼
[PWA State Update] <──(Broadcast Updated State)─── [Vault_Ω / Echo_Ω]
```

---

## 4. DATABASE ENTITY MODELS (Prisma Schema)
The database structure manages data isolation across your four core portals:

- **Vault_Ω (Accounting):** A double-entry accounting ledger system. Debits and credits are stored as individual transactions. A Prisma database check blocks writes unless the sum of Debits and Credits of a transaction ledger is zero.
- **Raven_Ω (Email campaigns):** Maintains contacts, tags, and email sequences, integrating directly with AWS SES.
- **Echo_Ω (Comms gateway):** Stores stateful message threads and routes SMS hooks to appropriate Knights.
