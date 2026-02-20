/**
 * Next.js catch-all proxy route — thin dispatcher.
 *
 * Mode selection (in order of priority):
 *  1. PROXY_TO_LIVE=true  → proxies to app.verticalprop.com (original live backend)
 *  2. Supabase configured → queries Supabase DB + live price APIs
 *  3. Dev mock mode       → returns rich local mock data (original behaviour)
 *
 * All business logic lives in ./handlers/*.ts
 */

import { type NextRequest, NextResponse } from 'next/server'
import { isServerSupabaseConfigured } from '@/lib/supabase/config'
import { handleAuthRead } from '../handlers/auth'
import { handleEngineRead } from '../handlers/engine-read'
import { handleEngineWrite } from '../handlers/engine-write'
import { handleSettings } from '../handlers/settings'
import { handleAdmin, handleAdminWrite } from '../handlers/admin'
import { handleMockPostAsync, handleMockGet } from '../handlers/mock'

const isSupabaseReady = isServerSupabaseConfigured

// ─────────────────────────────────────────────────────────────────────────────

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const apiPath = path.map(s => s.split('?')[0]).join('/')

  const forceProxy = process.env.PROXY_TO_LIVE === 'true'

  // ── 1. Force proxy to live verticalprop.com backend ─────────────────────────
  if (forceProxy) {
    const UPSTREAM = 'https://app.verticalprop.com'
    const { cookies } = await import('next/headers')
    const upstreamUrl = new URL(`/api/${apiPath}`, UPSTREAM)
    req.nextUrl.searchParams.forEach((v, k) => upstreamUrl.searchParams.set(k, v))
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')
    const headers = new Headers({
      'Content-Type': req.headers.get('content-type') ?? 'application/json',
      Cookie: cookieHeader, 'User-Agent': 'Mozilla/5.0',
      Origin: UPSTREAM, Referer: `${UPSTREAM}/`,
    })
    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined
    const upstreamRes = await fetch(upstreamUrl.toString(), { method: req.method, headers, body })
    const responseData = await upstreamRes.text()
    return new NextResponse(responseData, {
      status: upstreamRes.status,
      headers: { 'Content-Type': upstreamRes.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' },
    })
  }

  // ── 2. Supabase mode ────────────────────────────────────────────────────────
  if (isSupabaseReady()) {
    try {
      if (req.method === 'POST') {
        const result =
          (await handleEngineWrite(req, apiPath)) ??
          (await handleSettings(req, apiPath)) ??
          (await handleAdminWrite(req, apiPath))
        if (result) return result
      }

      if (req.method === 'GET') {
        const result =
          (await handleAuthRead(req, apiPath)) ??
          (await handleEngineRead(req, apiPath)) ??
          (await handleAdmin(req, apiPath))
        if (result) return result
        // null = fall through to mock (e.g. candles when external APIs fail)
      }
    } catch (err) {
      console.error('[proxy] Supabase error on', apiPath, err)
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Service temporarily unavailable. Please try again.' },
          { status: 503 }
        )
      }
      // In dev/test: fall through to mock so local development still works
    }
  }

  // ── 3. Mock mode (dev default or fallback) ──────────────────────────────────
  if (req.method === 'POST') {
    const mockResult = await handleMockPostAsync(req, apiPath)
    if (mockResult) return mockResult
  }

  return handleMockGet(req, apiPath)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
