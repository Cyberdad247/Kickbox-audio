import { buildBifrostHttpUrl } from '@/lib/bifrostHttp';
import { getOrMintProxyAuthHeaders } from '@/lib/proxyAuth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    // Body-bound HMAC: signature covers this exact body so a swapped payload
    // downstream (or an intercepted-and-replayed signature) cannot dispatch to MTA.
    const proxyHeaders = await getOrMintProxyAuthHeaders('PUBLISH', { rawBody: bodyText });
    const response = await fetch(buildBifrostHttpUrl('/api/cms/content/publish'), {
      method: 'POST',
      headers: {
        'content-type': request.headers.get('content-type') ?? 'application/json',
        ...proxyHeaders,
      },
      body: bodyText,
      cache: 'no-store',
    });

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
      },
    });
  } catch (error) {
    console.error('[PWA/CMS publish proxy] upstream request failed:', error);
    return NextResponse.json({ error: 'BIFROST_UPLINK_FAILED' }, { status: 502 });
  }
}
