/**
 * Settings handlers — Supabase mode (POST)
 * Covers: settings/update-profile, settings/change-password
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { HandlerResult } from './shared'

export async function handleSettings(req: NextRequest, apiPath: string): Promise<HandlerResult> {
  const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')

  // ── settings/update-profile ─────────────────────────────────────────────────
  if (apiPath === 'settings/update-profile') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.name === 'string' && body.name.trim().length > 0) {
      updates.name = body.name.trim().slice(0, 100)
    }
    if (typeof body.email === 'string' && body.email.includes('@')) {
      updates.email = body.email.trim().toLowerCase().slice(0, 200)
    }

    const admin = createSupabaseAdminClient()
    const { error } = await admin.from('profiles').update(updates).eq('id', user.id)
    if (error) {
      console.error('[update-profile] error:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    // If email changed, also update Supabase Auth metadata
    if (updates.email) {
      await admin.auth.admin.updateUserById(user.id, { email: updates.email as string })
    }

    return NextResponse.json({ success: true })
  }

  // ── settings/change-password ────────────────────────────────────────────────
  if (apiPath === 'settings/change-password') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const newPassword = body.new_password
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      console.error('[change-password] error:', error)
      return NextResponse.json({ error: error.message || 'Failed to change password' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  return null
}
