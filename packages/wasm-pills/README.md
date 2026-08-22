# 🧪 aaliyah_comms — WASM MCP Pill

The **Aaliyah CMS Agency Pill**. A Rust WASM micro-container that exposes
Model Context Protocol (MCP) tools for sovereign email campaign management.

## Architecture

```
PWA / Go Omni-Router
    │  JSON-RPC 2.0 (tools/list + tools/call)
    ▼
┌─────────────────────────────┐
│  aaliyah_comms WASM Pill    │
│  ┌───────────────────────┐  │
│  │  MCP Protocol Handler │  │
│  │  ↓ dispatch           │  │
│  │  Template Registry    │  │
│  │  CMS Data Validation  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
    │  memory (host-managed)
    ▼
Bifrost CMS Ledger / SQLite
```

## Build

```bash
# Native tests (verify logic)
cargo test

# WASM release build (~104 KB)
wasm-bindgen target/wasm32-unknown-unknown/release/aaliyah_comms.wasm \
    --target nodejs --out-dir pkg
```

## Usage

```js
const { process_request } = require('./pkg/aaliyah_comms');

// List available tools
const tools = process_request('{"id":1,"method":"tools/list"}');

// Render a template
const rendered = process_request(JSON.stringify({
    id: 2,
    method: "tools/call",
    params: {
        name: "render_template",
        arguments: {
            template_id: "tpl_welcome_01",
            contact_context: {
                contact_name: "Sovereign",
                intent: "Launch campaign"
            }
        }
    }
}));
// → { html, subject, text, metadata }
```

## Exposed MCP Tools

| Tool | Description |
|------|-------------|
| `render_template` | Render a CMS email template with contact context |
| `list_templates` | List available templates (followup, welcome) |
| `list_contacts` | List contacts (host-managed storage) |
| `create_contact` | Register a new CMS contact |
| `list_campaigns` | List email campaigns (host-managed) |

## Request Envelope

The host may inject an optional `now` field (ISO-8601) in the RPC envelope
for timestamp-dependent rendering:

```json
{
    "id": 1,
    "method": "tools/list",
    "now": "2026-07-03T12:00:00.000Z"
}
```

## Size Target

- Current binary: **~104 KB** (target: <5 MB)
- Compiled with `opt-level = "z"`, LTO, `panic = "abort"`, stripped
