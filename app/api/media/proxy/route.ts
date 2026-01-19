import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOST_SUFFIX = '.supabase.co';
const ALLOWED_PATH_PREFIX = '/storage/v1/object/public/';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json(
      { success: false, error: 'Missing url parameter.' },
      { status: 400 },
    );
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid url parameter.' },
      { status: 400 },
    );
  }

  if (
    target.protocol !== 'https:' ||
    !target.hostname.endsWith(ALLOWED_HOST_SUFFIX) ||
    !target.pathname.startsWith(ALLOWED_PATH_PREFIX)
  ) {
    return NextResponse.json(
      { success: false, error: 'URL host or path not allowed.' },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: { accept: 'image/*' },
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch media asset.' },
        { status: upstream.status },
      );
    }

    const body = await upstream.arrayBuffer();
    const headers = new Headers();
    const contentType = upstream.headers.get('content-type');
    const cacheControl = upstream.headers.get('cache-control');
    const etag = upstream.headers.get('etag');

    if (contentType) headers.set('content-type', contentType);
    if (cacheControl) {
      headers.set('cache-control', cacheControl);
    } else {
      headers.set('cache-control', 'public, max-age=86400, s-maxage=86400');
    }
    if (etag) headers.set('etag', etag);

    return new NextResponse(body, { status: 200, headers });
  } catch (error) {
    console.error('[media/proxy] Failed to fetch asset', error);
    return NextResponse.json(
      { success: false, error: 'Unexpected error fetching media asset.' },
      { status: 500 },
    );
  }
}
