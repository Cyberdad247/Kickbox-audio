# 🏰 Bifrost Laptop Server

Run the Bifrost gateway as a **stable, self-healing server on your own laptop** —
no paid hosting. A free [cloudflared](https://github.com/cloudflare/cloudflared)
quick tunnel exposes it publicly over `wss://` so the Vercel-hosted PWA
(`kickbox-audio.vercel.app`) can connect to it.

## Quick start

```powershell
# from repo root
powershell -ExecutionPolicy Bypass -File scripts\laptop-server\start-bifrost.ps1
```

This will:
1. Download `cloudflared` (portable, no account) if needed → `scripts/laptop-server/bin/`.
2. Build Bifrost to JS (`node dist`) if not already built.
3. Start Bifrost on port 3001.
4. Open a cloudflared tunnel → a public `https://<rand>.trycloudflare.com` URL.
5. If that URL differs from what Vercel currently points at, **rewire
   `NEXT_PUBLIC_BIFROST_URL` and redeploy production** automatically.
6. Supervise both processes, restarting either if it dies (and re-rewiring
   Vercel if the tunnel URL changes).

Stop with `Ctrl+C` (children are terminated cleanly).

### Flags
| Flag | Effect |
|---|---|
| `-Port 3001` | Local Bifrost port (default 3001). |
| `-SkipVercel` | Don't touch Vercel env / redeploy when the URL changes. |
| `-Rebuild` | Force a clean rebuild even if `dist/` exists. |

## Auto-start at logon (no admin)

```powershell
powershell -ExecutionPolicy Bypass -File scripts\laptop-server\install-autostart.ps1
# remove:
powershell -ExecutionPolicy Bypass -File scripts\laptop-server\install-autostart.ps1 -Uninstall
```

Drops a hidden launcher in your Startup folder; Bifrost + tunnel come up at every
logon and stay alive.

## Prerequisites
- **Node 20+**, repo dependencies installed (`npm ci` at repo root).
- **Vercel CLI** logged in (`vercel whoami`) — only needed for auto-rewire.

## Persistence (optional)
By default Bifrost runs **without a database** — in-memory state works (the HUD
connects and valuation updates live), but transactions don't survive a restart.
For durable persistence, set `DATABASE_URL` to a local Postgres before launching:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASS@localhost:5432/sovereign"
npm run db:migrate        # apply schema
```

## Remote MCP fallback (vMAX `//ROUTE` + `//REZERO`)
Known commands run on the local fast path. Unknown / complex utterances bypass to
a remote MCP server — but **only over the Tailscale mesh**. Configure it via env:

```powershell
$env:REMOTE_MCP_URL = "https://<machine>.<tailnet>.ts.net/mcp"  # MUST be Tailscale
$env:ROUTE_BUDGET_MS = "900"   # latency budget; breach -> //REZERO to local
```

Any non-Tailscale endpoint (`100.64.0.0/10` or `*.ts.net` only) throws a
`CompilationError` and the router falls back to local tools. If unset, unknown
utterances simply `//REZERO` to a local response.

### Bundled MCP server (`apps/mcp-query`)
A real JSON-RPC MCP server lives in the monorepo. Run it bound to all interfaces
so the laptop's Tailscale IP is reachable, then point Bifrost at that IP:

```powershell
# 1) start the MCP server (fast local responder; set OLLAMA_MODEL for LLM answers)
$env:PORT = "7800"; node apps/mcp-query/dist/server.js
# 2) point Bifrost at the laptop's Tailscale IP (passes the zero-trust gate)
$env:REMOTE_MCP_URL = "http://$(tailscale ip -4):7800"
```

It exposes a `query` tool (`tools/list` + `tools/call`). Backends run in priority
order: **Multivoice-router → Ollama → local responder**, each falling through to
the next so a query always answers within budget.

- **Local responder** (default): arithmetic / time / greetings in <1ms.
- **Ollama**: set `OLLAMA_MODEL` (+ optional `OLLAMA_URL`) for LLM answers.

### Multivoice-router (Anya_Ω governed compiler)
[Cyberdad247/Multivoice-router](https://github.com/Cyberdad247/Multivoice-router)
is the Camelot voice/persona/intent compiler. Its `runAnyaCompiler` (pure — QFT +
AgentArmor + policy + AETHER routing, no network) can be exposed over HTTP with a
tiny shim, then wired into mcp-query via `MULTIVOICE_URL`:

```ts
// anya-serve.ts (in a Multivoice-router checkout) — run with: tsx anya-serve.ts
import http from 'node:http';
import { runAnyaCompiler } from './src/anya/anya-compiler';
http
  .createServer((req, res) => {
    if (req.method !== 'POST') return res.writeHead(405).end();
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      const { utterance, query } = JSON.parse(raw || '{}');
      const r: any = await runAnyaCompiler(utterance || query || '', { source: 'mcp' });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(r.interrupt ? { interrupt: r.interrupt } : r));
    });
  })
  .listen(8790, '0.0.0.0');
```

```powershell
# point mcp-query at the Anya compile shim (loopback or a Tailscale host only)
$env:MULTIVOICE_URL = "http://localhost:8790"; $env:PORT = "7800"; node apps/mcp-query/dist/server.js
```

mcp-query POSTs `{ utterance }` and speaks the governed result — e.g.
*"Compiled intent `android_action` routed to phoneclaw (confidence 88%), approval
required."* The Multivoice host must be loopback or Tailscale (`100.64/10` /
`*.ts.net`); otherwise it's rejected and the next backend is used.

## Upgrading to a STABLE public URL
TryCloudflare URLs are **ephemeral** — they change on every tunnel restart (the
supervisor compensates by auto-redeploying, but each change costs a Vercel
build). For a permanent URL, pick one:

- **Named Cloudflare tunnel** (free Cloudflare account + a domain on Cloudflare):
  `cloudflared tunnel login`, `cloudflared tunnel create bifrost`, map a hostname,
  then point the supervisor at the named tunnel (set a fixed `NEXT_PUBLIC_BIFROST_URL`
  once and drop `-SkipVercel` is unnecessary).
- **Tailscale Funnel** (free, stable `*.ts.net` URL): enable Funnel in the
  Tailscale admin console, then `tailscale funnel --bg 3001`. With a fixed URL
  you set `NEXT_PUBLIC_BIFROST_URL=wss://<machine>.<tailnet>.ts.net` once.

With a stable URL the Vercel env never changes, so no rebuilds are triggered.
