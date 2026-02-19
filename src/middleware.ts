import { type NextRequest, NextResponse } from 'next/server'

/**
 * Route protection middleware.
 *
 * Protected routes: /dashboard/*, /trade
 * Public  routes: /login, /register, /api/*, /
 *
 * Session detection: checks for the `vp-session` cookie set by the mock
 * (or real better-auth) sign-in endpoint.
 */

const PROTECTED = ['/dashboard', '/trade']
const AUTH_ROUTES = ['/login', '/register']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  const isAuthRoute = AUTH_ROUTES.some(p => pathname.startsWith(p))

  const session = req.cookies.get('vp-session')?.value

  // ── Not logged in → trying to access protected page → redirect to /login
  if (isProtected && !session) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Already logged in → trying to access /login or /register → redirect to dashboard
  if (isAuthRoute && session) {
    const dashUrl = req.nextUrl.clone()
    dashUrl.pathname = '/dashboard/overview'
    dashUrl.search = ''
    return NextResponse.redirect(dashUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except static files, images, and api routes
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
