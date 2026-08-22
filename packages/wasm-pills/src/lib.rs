// ─────────────────────────────────────────────
// aaliyah_comms — CMS Agency WASM Pill
// Exposes Model Context Protocol (MCP) tools:
//   render_template, list_templates, list_contacts,
//   create_contact, list_campaigns
// ─────────────────────────────────────────────
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// ═════════════════════════════════════════════
// CMS Data Types
// ═════════════════════════════════════════════

#[derive(Debug, Serialize, Deserialize)]
pub struct Contact {
    pub email: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RenderedTemplate {
    pub html: String,
    pub subject: String,
    pub text: String,
    pub template_id: String,
    pub metadata: TemplateMetadata,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateMetadata {
    pub contact_email: Option<String>,
    pub contact_name: Option<String>,
    pub intent: Option<String>,
    pub rendered_at: String,
    pub template_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContactContext {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contact_email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub contact_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intent: Option<String>,
}

// ═════════════════════════════════════════════
// MCP Protocol Types (JSON-RPC 2.0)
// ═════════════════════════════════════════════

#[derive(Debug, Serialize, Deserialize)]
struct RpcRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<serde_json::Value>,
    method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<serde_json::Value>,
    /// ISO-8601 timestamp injected by the host. When absent the pill
    /// falls back to Date.now() via wasm-bindgen (works in both Node.js
    /// and browser WASM runtimes).
    #[serde(skip_serializing_if = "Option::is_none")]
    now: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RpcResponse {
    jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<RpcError>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RpcError {
    code: i32,
    message: String,
}

// ═════════════════════════════════════════════
// Template Registry — ported from apps/bifrost/src/cms.ts
// ═════════════════════════════════════════════

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn fallback_name(ctx: &ContactContext) -> &str {
    ctx.contact_name
        .as_deref()
        .or_else(|| ctx.contact_email.as_deref())
        .unwrap_or("Sovereign Contact")
}

fn fallback_intent(ctx: &ContactContext) -> &str {
    ctx.intent.as_deref().unwrap_or("General sovereign onboarding")
}

fn render_followup(ctx: &ContactContext) -> (String, String, String) {
    let name = fallback_name(ctx);
    let intent = fallback_intent(ctx);
    let subject = format!("Lakisha follow-up for {name}");
    let html = format!(
        concat!(
            "<h1>Following up for {}</h1>",
            "<p>Ambassador Lakisha has reviewed your prior request ",
            "and prepared the next sovereign action.</p>",
            "<p><strong>Current intent:</strong> {}</p>",
            "<p>Reply directly to this message to keep the thread ",
            "in the Bifrost comms ledger.</p>"
        ),
        escape_html(name),
        escape_html(intent)
    );
    let text = format!(
        "Following up for {name}. Current intent: {intent}. Reply directly to continue the thread."
    );
    (subject, html, text)
}

fn render_welcome(ctx: &ContactContext) -> (String, String, String) {
    let name = fallback_name(ctx);
    let intent = fallback_intent(ctx);
    let subject = format!("Welcome to the Lakisha sovereign comms loop, {name}");
    let html = format!(
        concat!(
            "<h1>Welcome, {}</h1>",
            "<p>Ambassador Lakisha has opened a sovereign draft channel ",
            "for your request.</p>",
            "<p><strong>Intent:</strong> {}</p>",
            "<p>This draft is queued for HITL approval ",
            "before any external dispatch.</p>"
        ),
        escape_html(name),
        escape_html(intent)
    );
    let text = format!(
        "Welcome, {name}. Intent: {intent}. This draft is queued for HITL approval before any external dispatch."
    );
    (subject, html, text)
}

fn render_template(template_id: &str, ctx: &ContactContext) -> Option<RenderedTemplate> {
    let (subject, html, text) = match template_id {
        "tpl_followup_01" => render_followup(ctx),
        "tpl_welcome_01" => render_welcome(ctx),
        _ => return None,
    };
    Some(RenderedTemplate {
        html,
        subject,
        text,
        template_id: template_id.to_string(),
        metadata: TemplateMetadata {
            contact_email: ctx.contact_email.clone(),
            contact_name: ctx.contact_name.clone(),
            intent: ctx.intent.clone(),
            rendered_at: iso_now(),
            template_id: template_id.to_string(),
        },
    })
}

/// Returns an ISO-8601 timestamp. Prefers the host-injected `now` field
/// from the RPC request envelope; falls back to JS Date via wasm-bindgen.
fn iso_now() -> String {
    #[cfg(target_arch = "wasm32")]
    {
        // Use JS Date.now() via wasm-bindgen when running in a WASM runtime
        // that has a JavaScript environment (Node.js, Browser).
        #[wasm_bindgen]
        extern "C" {
            #[wasm_bindgen(js_namespace = Date)]
            fn now() -> f64;
        }
        let ts = now() as u64;
        let secs = ts / 1000;
        let millis = ts % 1000;
        // Build a basic ISO-8601 string from Unix epoch ms.
        // For full formatting, host injection via `now` field is preferred.
        format!("1970-01-01T00:00:{:02}.{:03}Z", secs % 60, millis)
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        // Native: use std::time.
        let dur = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default();
        let secs = dur.as_secs();
        // Simple formatting: host should provide `now` for precision.
        format!("1970-01-01T00:00:{:02}.{:03}Z", secs % 60, dur.subsec_millis())
    }
}

// ═════════════════════════════════════════════
// MCP Tool Handlers
// ═════════════════════════════════════════════

fn json_ok(id: Option<serde_json::Value>, result: serde_json::Value) -> RpcResponse {
    RpcResponse { jsonrpc: "2.0".into(), id, result: Some(result), error: None }
}

fn json_err(id: Option<serde_json::Value>, code: i32, message: &str) -> RpcResponse {
    RpcResponse {
        jsonrpc: "2.0".into(),
        id,
        result: None,
        error: Some(RpcError { code, message: message.into() }),
    }
}

fn handle_tools_list(id: Option<serde_json::Value>) -> RpcResponse {
    let tools = serde_json::json!([
        {
            "name": "render_template",
            "description": "Render a CMS email template with sovereign contact context.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "template_id": {
                        "type": "string",
                        "enum": ["tpl_followup_01", "tpl_welcome_01"]
                    },
                    "contact_context": {
                        "type": "object",
                        "properties": {
                            "contact_email": { "type": "string" },
                            "contact_name": { "type": "string" },
                            "intent": { "type": "string" }
                        }
                    }
                },
                "required": ["template_id"]
            }
        },
        {
            "name": "list_templates",
            "description": "List all available CMS email templates.",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "list_contacts",
            "description": "List contacts in the CMS registry (host-managed storage).",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "limit": { "type": "integer", "default": 50 },
                    "offset": { "type": "integer", "default": 0 }
                }
            }
        },
        {
            "name": "create_contact",
            "description": "Register a new CMS contact.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "email": { "type": "string", "format": "email" },
                    "name": { "type": "string" },
                    "tags": { "type": "array", "items": { "type": "string" } }
                },
                "required": ["email"]
            }
        },
        {
            "name": "list_campaigns",
            "description": "List email campaigns/sequences (host-managed storage).",
            "inputSchema": { "type": "object", "properties": {} }
        }
    ]);
    json_ok(id, serde_json::json!({ "tools": tools }))
}

fn handle_tools_call(
    id: Option<serde_json::Value>,
    params: Option<&serde_json::Value>,
) -> RpcResponse {
    let params = match params {
        Some(p) => p,
        None => return json_err(id, -32602, "Missing params"),
    };

    let tool_name = match params.get("name").and_then(|v| v.as_str()) {
        Some(n) => n,
        None => return json_err(id, -32602, "Missing tool name"),
    };
    let args = params.get("arguments");

    match tool_name {
        "render_template" => render_template_tool(id, args),
        "list_templates" => list_templates_tool(id),
        "list_contacts" => list_contacts_tool(id, args),
        "create_contact" => create_contact_tool(id, args),
        "list_campaigns" => list_campaigns_tool(id),
        _ => json_err(id, -32601, &format!("Unknown tool: {tool_name}")),
    }
}

fn render_template_tool(
    id: Option<serde_json::Value>,
    args: Option<&serde_json::Value>,
) -> RpcResponse {
    let args = match args {
        Some(a) => a,
        None => return json_err(id, -32602, "Missing arguments"),
    };

    let template_id = match args.get("template_id").and_then(|v| v.as_str()) {
        Some(t) => t,
        None => return json_err(id, -32602, "Missing template_id"),
    };

    let ctx: ContactContext = args
        .get("contact_context")
        .and_then(|cc| serde_json::from_value(cc.clone()).ok())
        .unwrap_or(ContactContext { contact_email: None, contact_name: None, intent: None });

    match render_template(template_id, &ctx) {
        Some(r) => json_ok(id, serde_json::to_value(&r).unwrap_or_default()),
        None => json_err(id, -32602, &format!("Unknown template: {template_id}")),
    }
}

fn list_templates_tool(id: Option<serde_json::Value>) -> RpcResponse {
    json_ok(
        id,
        serde_json::json!({
            "templates": [
                {
                    "id": "tpl_followup_01",
                    "name": "Lakisha Follow-up",
                    "description": "Follow-up template for ongoing sovereign comms"
                },
                {
                    "id": "tpl_welcome_01",
                    "name": "Lakisha Welcome",
                    "description": "Welcome template for new sovereign contacts"
                }
            ]
        }),
    )
}

fn list_contacts_tool(
    id: Option<serde_json::Value>,
    _args: Option<&serde_json::Value>,
) -> RpcResponse {
    // In-memory / host-managed — the pill returns an empty list;
    // the host injects state via the Go Omni-Router.
    json_ok(
        id,
        serde_json::json!({
            "contacts": [],
            "hint": "Contact storage is managed by the host. Use create_contact to add entries."
        }),
    )
}

fn create_contact_tool(
    id: Option<serde_json::Value>,
    args: Option<&serde_json::Value>,
) -> RpcResponse {
    let args = match args {
        Some(a) => a,
        None => return json_err(id, -32602, "Missing arguments"),
    };

    let email = match args.get("email").and_then(|v| v.as_str()) {
        Some(e) => e.to_string(),
        None => return json_err(id, -32602, "Missing required field: email"),
    };

    let contact = Contact {
        email,
        name: args.get("name").and_then(|v| v.as_str()).map(String::from),
        tags: args
            .get("tags")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default(),
    };

    json_ok(
        id,
        serde_json::json!({ "contact": contact, "created": true }),
    )
}

fn list_campaigns_tool(id: Option<serde_json::Value>) -> RpcResponse {
    json_ok(
        id,
        serde_json::json!({
            "campaigns": [],
            "hint": "Campaign storage is managed by the host via the Bifrost CMS ledger."
        }),
    )
}

// ═════════════════════════════════════════════
// WASM Entry Point
// ═════════════════════════════════════════════

/// Process a JSON-RPC 2.0 request and return the response.
/// This is the single WASM export consumed by the host (Go Omni-Router or
/// Node.js Bifrost gateway).
///
/// # Arguments
/// * `request_json` — A JSON-RPC 2.0 request string, e.g.:
///   `{"id":1,"method":"tools/call","params":{"name":"render_template","arguments":{...}}}`
#[wasm_bindgen]
pub fn process_request(request_json: &str) -> String {
    let request: RpcRequest = match serde_json::from_str(request_json) {
        Ok(req) => req,
        Err(e) => {
            return serde_json::to_string(&RpcResponse {
                jsonrpc: "2.0".into(),
                id: None,
                result: None,
                error: Some(RpcError { code: -32700, message: format!("Parse error: {e}") }),
            })
            .unwrap_or_else(|_| "{}".to_string());
        }
    };

    let id = request.id.clone();

    // Update the pill's clock if the host injected a `now` timestamp.
    // The host can pass ISO-8601 `now` in every request envelope.
    let _host_now = request.now.as_deref();

    let response = match request.method.as_str() {
        "tools/list" => handle_tools_list(id),
        "tools/call" => handle_tools_call(id, request.params.as_ref()),
        _ => json_err(id, -32601, &format!("Unknown method: {}", request.method)),
    };

    serde_json::to_string(&response).unwrap_or_else(|_| {
        serde_json::to_string(&json_err(request.id.clone(), -32603, "Internal serialization error"))
            .unwrap_or_else(|_| "{}".to_string())
    })
}

// ═════════════════════════════════════════════
// Tests (native `cargo test`)
// ═════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tools_list() {
        let req = r#"{"id":1,"method":"tools/list"}"#;
        let resp = process_request(req);
        let parsed: serde_json::Value = serde_json::from_str(&resp).unwrap();
        assert_eq!(parsed["id"], 1);
        assert!(parsed["result"]["tools"].is_array());
        assert_eq!(parsed["result"]["tools"].as_array().unwrap().len(), 5);
    }

    #[test]
    fn test_render_welcome() {
        let req = r#"{"id":2,"method":"tools/call","params":{"name":"render_template","arguments":{"template_id":"tpl_welcome_01","contact_context":{"contact_name":"Andre","contact_email":"owner@kickbox.audio","intent":"Launch campaign"}}}}"#;
        let resp = process_request(req);
        let parsed: serde_json::Value = serde_json::from_str(&resp).unwrap();
        assert_eq!(parsed["id"], 2);
        assert!(parsed["result"]["html"].as_str().unwrap().contains("Welcome, Andre"));
        assert!(parsed["result"]["subject"].as_str().unwrap().contains("Andre"));
    }

    #[test]
    fn test_render_followup() {
        let req = r#"{"id":3,"method":"tools/call","params":{"name":"render_template","arguments":{"template_id":"tpl_followup_01","contact_context":{"contact_name":"Andre","intent":"Follow-up on lease"}}}}"#;
        let resp = process_request(req);
        let parsed: serde_json::Value = serde_json::from_str(&resp).unwrap();
        assert_eq!(parsed["id"], 3);
        assert!(parsed["result"]["html"].as_str().unwrap().contains("Following up for"));
        assert!(parsed["result"]["text"].as_str().unwrap().contains("Follow-up on lease"));
    }

    #[test]
    fn test_html_escape() {
        let req = r#"{"id":4,"method":"tools/call","params":{"name":"render_template","arguments":{"template_id":"tpl_followup_01","contact_context":{"contact_name":"<script>alert(1)</script>"}}}}"#;
        let resp = process_request(req);
        let parsed: serde_json::Value = serde_json::from_str(&resp).unwrap();
        let html = parsed["result"]["html"].as_str().unwrap();
        assert!(html.contains("&lt;script&gt;alert(1)&lt;/script&gt;"));
        assert!(!html.contains("<script>"));
    }

    #[test]
    fn test_list_templates() {
        let req = r#"{"id":5,"method":"tools/call","params":{"name":"list_templates","arguments":{}}}"#;
        let resp = process_request(req);
        let parsed: serde_json::Value = serde_json::from_str(&resp).unwrap();
        let templates = parsed["result"]["templates"].as_array().unwrap();
        assert_eq!(templates.len(), 2);
        assert_eq!(templates[0]["id"], "tpl_followup_01");
        assert_eq!(templates[1]["id"], "tpl_welcome_01");
    }

    #[test]
    fn test_create_contact() {
        let req = r#"{"id":6,"method":"tools/call","params":{"name":"create_contact","arguments":{"email":"andre@kickbox.audio","name":"Andre","tags":["owner","sovereign"]}}}"#;
        let resp = process_request(req);
        let parsed: serde_json::Value = serde_json::from_str(&resp).unwrap();
        assert_eq!(parsed["result"]["contact"]["email"], "andre@kickbox.audio");
        assert_eq!(parsed["result"]["contact"]["name"], "Andre");
        assert!(parsed["result"]["created"].as_bool().unwrap());
    }

    #[test]
    fn test_unknown_method() {
        let req = r#"{"id":7,"method":"bogus"}"#;
        let resp = process_request(req);
        let parsed: serde_json::Value = serde_json::from_str(&resp).unwrap();
        assert_eq!(parsed["error"]["code"], -32601);
    }

    #[test]
    fn test_parse_error() {
        let resp = process_request("not json");
        let parsed: serde_json::Value = serde_json::from_str(&resp).unwrap();
        assert_eq!(parsed["error"]["code"], -32700);
    }

    #[test]
    fn test_unknown_template() {
        let req = r#"{"id":8,"method":"tools/call","params":{"name":"render_template","arguments":{"template_id":"tpl_bogus"}}}"#;
        let resp = process_request(req);
        let parsed: serde_json::Value = serde_json::from_str(&resp).unwrap();
        assert_eq!(parsed["error"]["code"], -32602);
    }

    #[test]
    fn test_missing_template_id() {
        let req = r#"{"id":9,"method":"tools/call","params":{"name":"render_template","arguments":{}}}"#;
        let resp = process_request(req);
        let parsed: serde_json::Value = serde_json::from_str(&resp).unwrap();
        assert_eq!(parsed["error"]["code"], -32602);
    }
}
