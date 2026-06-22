import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from target' }, { status: res.status });
    }

    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data);
    } else {
      const text = await res.text();
      return new NextResponse(text, {
        headers: { 'Content-Type': contentType || 'text/plain' }
      });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
