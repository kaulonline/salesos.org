import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_URLS = ['https://www.salesos.org/api'];

async function proxyRequest(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const isAllowed = ALLOWED_URLS.some((base) => targetUrl.startsWith(base));
  if (!isAllowed) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  try {
    const headers = new Headers();
    const authHeader = req.headers.get('authorization');
    if (authHeader) headers.set('authorization', authHeader);
    headers.set('content-type', 'application/json');

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'Proxy request failed' }, { status: 502 });
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
