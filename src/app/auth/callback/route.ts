/**
 * Auth callback — handles Supabase redirects for:
 *   - OAuth sign-in (Google)
 *   - Email verification after sign-up
 *   - Password recovery (if using PKCE flow)
 *
 * Exchanges the `code` query param for a session, then redirects.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // signup, recovery, magiclink, invite
  const next = searchParams.get('next') ?? '/dashboard/overview'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect based on the type of confirmation
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      if (type === 'signup') {
        return NextResponse.redirect(`${origin}/login?verified=1`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If something went wrong, redirect to login with error hint
  return NextResponse.redirect(`${origin}/login?error=auth_callback`)
}
