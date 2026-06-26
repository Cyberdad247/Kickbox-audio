// mcp-query · the "query" tool's answer engine.
// Local-first heuristics (fast, deterministic — fits the route latency budget)
// with an OPTIONAL Ollama backend for real LLM answers.

export interface AnswerOptions {
  ollamaUrl?: string;
  ollamaModel?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
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

/** Answer a query — via Ollama when configured, else the local responder. */
export async function answerQuery(query: string, opts: AnswerOptions = {}): Promise<string> {
  if (opts.ollamaModel) {
    try {
      return await ollamaAnswer(query, opts);
    } catch {
      // Graceful fallback to the fast local responder.
    }
  }
  return localAnswer(query, opts.now);
}
