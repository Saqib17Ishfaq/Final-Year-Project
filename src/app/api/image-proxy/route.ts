import { NextResponse } from 'next/server'

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/$/, '')

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const target = searchParams.get('url')

    if (!target) {
      return NextResponse.json({ success: false, error: 'Missing url query parameter' }, { status: 400 })
    }

    let targetUrl: URL
    try {
      targetUrl = new URL(target)
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid target URL' }, { status: 400 })
    }

    if (!/^https?:$/.test(targetUrl.protocol)) {
      return NextResponse.json({ success: false, error: 'Only http/https URLs are allowed' }, { status: 400 })
    }

    if (BACKEND_BASE_URL) {
      const backendUrl = new URL(BACKEND_BASE_URL)
      const sameHost = targetUrl.hostname === backendUrl.hostname
      const sameOrigin = targetUrl.origin === backendUrl.origin
      if (!sameOrigin && !sameHost) {
        return NextResponse.json({ success: false, error: 'Target origin is not allowed' }, { status: 403 })
      }
    }

    // HF Spaces sometimes return http URLs in payloads; force https for remote fetch.
    if (targetUrl.hostname.endsWith('.hf.space') && targetUrl.protocol === 'http:') {
      targetUrl.protocol = 'https:'
    }

    const upstream = await fetch(targetUrl.toString(), { cache: 'force-cache' })
    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: `Upstream request failed (${upstream.status})` },
        { status: upstream.status }
      )
    }

    const bytes = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Image proxy failed' },
      { status: 500 }
    )
  }
}
