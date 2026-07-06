import { buildBifrostHttpUrl } from '@/lib/bifrostHttp';
import { NextResponse } from 'next/server';

const FORWARDED_HEADERS = [
  'content-type',
  'x-webhook-action',
  'x-webhook-signature',
  'x-webhook-timestamp',
  'x-webhook-expires-at',
] as const;

export async function POST(request: Request) {
  try {
    const headers = new Headers();
    for (const headerName of FORWARDED_HEADERS) {
      const value = request.headers.get(headerName);
      if (value) headers.set(headerName, value);
    }

    const response = await fetch(buildBifrostHttpUrl('/api/bifrost/hitl'), {
      method: 'POST',
      headers,
      body: await request.text(),
      cache: 'no-store',
    });

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (error) {
    console.error('[PWA/Bifrost HITL proxy] upstream request failed:', error);
    return NextResponse.json({ error: 'BIFROST_UPLINK_FAILED' }, { status: 502 });
  }
}
