// mcp-query · the "query" tool's answer engine.
// Backends, in priority order: Multivoice-router (Camelot Anya_Ω governed
// compiler) -> Ollama (LLM) -> fast local heuristics. Each falls back to the
// next so the tool always answers within the route latency budget.

export interface AnswerOptions {
  // Multivoice-router (Anya_Ω) compile endpoint — localhost or a Tailscale host.
  multivoiceUrl?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

// Trusted hosts for the Multivoice hop: loopback or the Tailscale mesh.
const TS_CGNAT = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/;
function isTrustedHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    /\.ts\.net$/i.test(host) ||
    TS_CGNAT.test(host)
  );
}

/**
 * Fast deterministic responder. Handles a few intents (arithmetic, time, date,
 * greeting) and otherwise acknowledges. Pure — easy to test, always sub-ms.
 */
export function localAnswer(query: string, now: () => Date = () => new Date()): string {
  const q = query.trim().toLowerCase();

  const math = q.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/x])\s*(-?\d+(?:\.\d+)?)/);
  if (math) {
    const a = Number(math[1]);
    const b = Number(math[3]);
    const op = math[2];
    const result = op === '+' ? a + b : op === '-' ? a - b : op === '/' ? a / b : a * b;
    return `${a} ${op === 'x' ? '×' : op} ${b} is ${result}.`;
  }
  if (/\btime\b/.test(q)) {
    return `It is ${now().toLocaleTimeString('en-US')}.`;
  }
  if (/\b(date|today)\b/.test(q)) {
    return `Today is ${now().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })}.`;
  }
  if (/\b(hello|hi|hey|greetings)\b/.test(q)) {
    return 'Greetings, Sovereign. The mesh is listening.';
  }
  return `Routed through the Sovereign mesh — no local handler for "${query.trim()}".`;
}

async function ollamaAnswer(query: string, opts: AnswerOptions): Promise<string> {
  const url = `${opts.ollamaUrl ?? 'http://localhost:11434'}/api/generate`;
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5000);
  try {
    const res = await doFetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: opts.ollamaModel, prompt: query, stream: false }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`ollama ${res.status}`);
    const data = (await res.json()) as { response?: string };
    const text = (data.response ?? '').trim();
    if (!text) throw new Error('empty ollama response');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// Synthesize a spoken answer from a Multivoice-router (Anya_Ω) response, which
// is either { answer } or a Titan compile { intent, targetNode, confidence }.
export function synthesizeMultivoice(data: unknown): string {
  const d = data as {
    answer?: string;
    interrupt?: string;
    intent?: string;
    targetNode?: string;
    routing?: { targetNode?: string };
    confidence?: number;
    constraints?: { requiresApproval?: boolean };
  };
  if (typeof d?.answer === 'string' && d.answer.trim()) return d.answer.trim();
  if (typeof d?.interrupt === 'string' && d.interrupt.trim()) return d.interrupt.trim();
  if (d?.intent) {
    const target = d.targetNode ?? d.routing?.targetNode ?? 'AETHER';
    const conf =
      typeof d.confidence === 'number' ? ` (confidence ${Math.round(d.confidence * 100)}%)` : '';
    const approval = d.constraints?.requiresApproval ? ', approval required' : '';
    return `Compiled intent "${d.intent}" routed to ${target}${conf}${approval}.`;
  }
  throw new Error('Multivoice response had no answer');
}

/** Route a query through the Multivoice-router governed compiler (Anya_Ω). */
async function multivoiceAnswer(query: string, opts: AnswerOptions): Promise<string> {
  const endpoint = opts.multivoiceUrl as string;
  const host = new URL(endpoint).hostname;
  if (!isTrustedHost(host)) {
    throw new Error(`Untrusted Multivoice host ${host} (loopback or Tailscale only)`);
  }
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 800);
  try {
    const res = await doFetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ utterance: query, query }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`multivoice ${res.status}`);
    return synthesizeMultivoice(await res.json());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Answer a query. Priority: Multivoice-router (Anya_Ω) -> Ollama -> local.
 * Each backend falls through to the next on failure.
 */
export async function answerQuery(query: string, opts: AnswerOptions = {}): Promise<string> {
  if (opts.multivoiceUrl) {
    try {
      return await multivoiceAnswer(query, opts);
    } catch {
      // Fall through to the next backend.
    }
  }
  if (opts.ollamaModel) {
    try {
      return await ollamaAnswer(query, opts);
    } catch {
      // Graceful fallback to the fast local responder.
    }
  }
  return localAnswer(query, opts.now);
}
