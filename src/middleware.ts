import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Route protection middleware.
 *
 * Protected routes: /dashboard/*, /trade
 * Public  routes:   /login, /register, /api/*, /
 *
 * Session detection: uses Supabase SSR to validate the auth cookie.
 * Falls back to the legacy `vp-session` cookie when Supabase is not yet
 * configured (no NEXT_PUBLIC_SUPABASE_URL set) so the app still works
 * in full-mock mode during development.
 */

const PROTECTED = ['/dashboard', '/trade']
const AUTH_ROUTES = ['/login', '/register']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.some(p => pathname.startsWith(p))

  // ── Supabase session check ────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isSupabaseConfigured =
    supabaseUrl && !supabaseUrl.includes('VOTRE_REF') &&
    supabaseKey && !supabaseKey.includes('VOTRE_ANON')

  let res = NextResponse.next({ request: req })
  let hasSession = false

  if (isSupabaseConfigured) {
    // Real Supabase auth — validate session via cookies
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    })

    try {
      const { data: { user } } = await supabase.auth.getUser()
      hasSession = !!user
    } catch {
      hasSession = false
    }
  } else {
    // Legacy mock mode — check for vp-session cookie
    hasSession = !!req.cookies.get('vp-session')?.value
  }

  // ── Not logged in → redirect to /login ────────────────────────────────────
  if (isProtected && !hasSession) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Already logged in → redirect away from auth pages ─────────────────────
  if (isAuthRoute && hasSession) {
    const dashUrl = req.nextUrl.clone()
    dashUrl.pathname = '/dashboard/overview'
    dashUrl.search = ''
    return NextResponse.redirect(dashUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
