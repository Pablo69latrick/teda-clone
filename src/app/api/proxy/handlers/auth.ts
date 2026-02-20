/**
 * Auth handlers — Supabase mode: auth/get-session
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { HandlerResult } from './shared'
import { toEpochMs } from './shared'

export async function handleAuthRead(req: NextRequest, apiPath: string): Promise<HandlerResult> {
  if (apiPath !== 'auth/get-session') return null

  const { createSupabaseServerClient } = await import('@/lib/supabase/server')
  const supabase = await createSupabaseServerClient()

  // M-05: use getUser() to validate the JWT with the Supabase Auth server
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ session: null, user: null }, { status: 401 })

  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  if (!profile) return NextResponse.json({ session: null, user: null }, { status: 401 })

  return NextResponse.json({
    session: {
      id: user.id,
      token: undefined,
      expiresAt: session?.expires_at,
      createdAt: user.created_at,
      updatedAt: profile.updated_at,
      ipAddress: '',
      userAgent: '',
      userId: user.id,
      impersonatedBy: null,
    },
    user: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      emailVerified: !!user.email_confirmed_at,
      image: profile.image_url ?? null,
      role: profile.role,
      banned: profile.banned,
      banReason: profile.ban_reason ?? null,
      banExpires: profile.ban_expires ? toEpochMs(profile.ban_expires) : null,
      twoFactorEnabled: profile.two_factor_enabled,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    },
  })
}
