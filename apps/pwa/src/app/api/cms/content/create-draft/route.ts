import { buildBifrostHttpUrl } from '@/lib/bifrostHttp';
import { getOrMintProxyAuthHeaders } from '@/lib/proxyAuth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const proxyHeaders = await getOrMintProxyAuthHeaders('DRAFT');
    const response = await fetch(buildBifrostHttpUrl('/api/cms/content/create-draft'), {
      method: 'POST',
      headers: {
        'content-type': request.headers.get('content-type') ?? 'application/json',
        ...proxyHeaders,
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
    console.error('[PWA/CMS draft proxy] upstream request failed:', error);
    return NextResponse.json({ error: 'BIFROST_UPLINK_FAILED' }, { status: 502 });
  }
}
