import { buildBifrostHttpUrl } from '@/lib/bifrostHttp';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const response = await fetch(buildBifrostHttpUrl('/api/bifrost/issue'), {
      method: 'POST',
      headers: {
        'content-type': request.headers.get('content-type') ?? 'application/json',
      },
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
    console.error('[PWA/Bifrost issue proxy] upstream request failed:', error);
    return NextResponse.json({ error: 'BIFROST_UPLINK_FAILED' }, { status: 502 });
  }
}
