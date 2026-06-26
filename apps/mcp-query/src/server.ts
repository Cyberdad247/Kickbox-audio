// mcp-query · a minimal real MCP server (JSON-RPC tools/list + tools/call).
// Bound to 0.0.0.0 so it is reachable on the laptop's Tailscale IP — the
// Bifrost router calls it over the mesh (zero-trust gate permits 100.64/10).

import http from 'node:http';
import { answerQuery } from './query';

const PORT = Number(process.env.PORT) || 7800;
const MULTIVOICE_URL = process.env.MULTIVOICE_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;
const OLLAMA_URL = process.env.OLLAMA_URL;
const QUERY_TIMEOUT_MS = Number(process.env.QUERY_TIMEOUT_MS) || 800;
const MAX_BODY = 64 * 1024;

const QUERY_TOOL = {
  name: 'query',
  description: 'Answer a natural-language query via the Sovereign mesh.',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
};

interface RpcRequest {
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: { query?: unknown } };
}

export function rpcResult(id: RpcRequest['id'], answer: string) {
  return { jsonrpc: '2.0', id: id ?? null, result: { content: [{ type: 'text', text: answer }] } };
}

export function rpcError(id: RpcRequest['id'], code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

/** Dispatch a JSON-RPC request. Exported for testing. */
export async function handleRpc(body: RpcRequest): Promise<object> {
  const id = body?.id ?? null;
  switch (body?.method) {
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: [QUERY_TOOL] } };
    case 'tools/call': {
      if (body.params?.name !== 'query') {
        return rpcError(id, -32601, `Unknown tool: ${body.params?.name}`);
      }
      const query = body.params?.arguments?.query;
      if (typeof query !== 'string' || query.length === 0) {
        return rpcError(id, -32602, 'query argument is required');
      }
      const answer = await answerQuery(query, {
        multivoiceUrl: MULTIVOICE_URL,
        ollamaModel: OLLAMA_MODEL,
        ollamaUrl: OLLAMA_URL,
        timeoutMs: QUERY_TIMEOUT_MS,
      });
      return rpcResult(id, answer);
    }
    default:
      return rpcError(id, -32601, `Unknown method: ${body?.method}`);
  }
}

export const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        multivoice: MULTIVOICE_URL ? 'on' : 'off',
        ollama: OLLAMA_MODEL ?? 'off',
      }),
    );
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end();
    return;
  }

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > MAX_BODY) req.destroy();
  });
  req.on('end', async () => {
    let body: RpcRequest;
    try {
      body = JSON.parse(raw);
    } catch {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify(rpcError(null, -32700, 'Parse error')));
      return;
    }
    try {
      const result = await handleRpc(body);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify(rpcError(body?.id ?? null, -32603, (err as Error).message)));
    }
  });
});

// Bind all interfaces so the Tailscale IP is reachable.
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(
      `mcp-query server on :${PORT} (multivoice=${MULTIVOICE_URL ? 'on' : 'off'}, ollama=${OLLAMA_MODEL ?? 'off'})`,
    );
  });
}
