import { describe, expect, it } from 'vitest';
import { handleRpc, rpcError, rpcResult } from './server';

describe('handleRpc (MCP JSON-RPC)', () => {
  it('tools/list advertises the query tool', async () => {
    const out = (await handleRpc({ id: 1, method: 'tools/list' })) as {
      result: { tools: Array<{ name: string }> };
    };
    expect(out.result.tools[0].name).toBe('query');
  });

  it('tools/call query returns a text content answer', async () => {
    const out = (await handleRpc({
      id: 2,
      method: 'tools/call',
      params: { name: 'query', arguments: { query: '2 + 2' } },
    })) as { result: { content: Array<{ type: string; text: string }> } };
    expect(out.result.content[0].type).toBe('text');
    expect(out.result.content[0].text).toBe('2 + 2 is 4.');
  });

  it('rejects an unknown tool', async () => {
    const out = (await handleRpc({
      id: 3,
      method: 'tools/call',
      params: { name: 'nope', arguments: { query: 'x' } },
    })) as { error: { code: number } };
    expect(out.error.code).toBe(-32601);
  });

  it('rejects a missing query argument', async () => {
    const out = (await handleRpc({
      id: 4,
      method: 'tools/call',
      params: { name: 'query', arguments: {} },
    })) as { error: { code: number } };
    expect(out.error.code).toBe(-32602);
  });

  it('rejects an unknown method', async () => {
    const out = (await handleRpc({ id: 5, method: 'resources/read' })) as {
      error: { code: number };
    };
    expect(out.error.code).toBe(-32601);
  });
});

describe('rpc envelope helpers', () => {
  it('wraps a result and an error', () => {
    expect(rpcResult(1, 'hi')).toMatchObject({ jsonrpc: '2.0', id: 1 });
    expect(rpcError(2, -1, 'boom')).toMatchObject({ error: { code: -1, message: 'boom' } });
  });
});
