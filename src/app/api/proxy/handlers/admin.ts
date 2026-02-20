/**
 * Admin handlers — Supabase mode (GET)
 * Covers: admin/users, admin/accounts, admin/challenge-templates, admin/stats, admin/risk-metrics
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { HandlerResult } from './shared'
import { toEpochMs } from './shared'

export async function handleAdmin(req: NextRequest, apiPath: string): Promise<HandlerResult> {
  if (!apiPath.startsWith('admin/')) return null

  const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json([], { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', session.user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json([], { status: 403 })

  const admin = createSupabaseAdminClient()

  // ── admin/users ─────────────────────────────────────────────────────────────
  if (apiPath === 'admin/users') {
    const { data: profiles } = await admin
      .from('profiles').select('*').order('created_at', { ascending: false })
    return NextResponse.json((profiles ?? []).map(p => ({
      id: p.id, name: p.name, email: p.email,
      emailVerified: true, image: p.image_url ?? null, role: p.role,
      banned: p.banned, banReason: p.ban_reason ?? null,
      banExpires: p.ban_expires ? toEpochMs(p.ban_expires) : null,
      twoFactorEnabled: p.two_factor_enabled,
      createdAt: toEpochMs(p.created_at),
      updatedAt: toEpochMs(p.updated_at),
      lastSeen: toEpochMs(p.updated_at),
    })))
  }

  // ── admin/accounts ──────────────────────────────────────────────────────────
  if (apiPath === 'admin/accounts') {
    const { data: accounts } = await admin
      .from('accounts').select('*, profiles(name, email)')
      .order('created_at', { ascending: false })
    return NextResponse.json((accounts ?? []).map(a => {
      const pr = a.profiles as { name?: string; email?: string } | null
      return {
        id: a.id, userId: a.user_id,
        userEmail: pr?.email ?? '', userName: pr?.name ?? '',
        accountType: a.account_type, name: a.name,
        availableMargin: a.available_margin,
        reservedMargin: a.reserved_margin,
        totalMarginRequired: a.total_margin_required,
        injectedFunds: a.injected_funds,
        baseCurrency: a.base_currency,
        defaultMarginMode: a.default_margin_mode,
        isActive: a.is_active, isClosed: a.is_closed,
        accountStatus: a.account_status,
        challengeTemplateId: a.challenge_template_id,
        createdAt: toEpochMs(a.created_at),
        updatedAt: toEpochMs(a.updated_at),
      }
    }))
  }

  // ── admin/challenge-templates ───────────────────────────────────────────────
  if (apiPath === 'admin/challenge-templates') {
    const { data: templates } = await admin
      .from('challenge_templates').select('*').order('created_at', { ascending: false })
    const { data: counts } = await admin
      .from('accounts').select('challenge_template_id')
    const countMap: Record<string, number> = {}
    for (const row of counts ?? []) {
      if (row.challenge_template_id) {
        countMap[row.challenge_template_id] = (countMap[row.challenge_template_id] ?? 0) + 1
      }
    }
    return NextResponse.json((templates ?? []).map(t => ({
      ...t,
      account_count: countMap[t.id] ?? 0,
      created_at: toEpochMs(t.created_at),
      updated_at: toEpochMs(t.updated_at),
    })))
  }

  // ── admin/stats ─────────────────────────────────────────────────────────────
  if (apiPath === 'admin/stats') {
    const [usersRes, accountsRes] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('accounts').select('account_status, is_active'),
    ])
    const accounts = accountsRes.data ?? []
    return NextResponse.json({
      total_users: usersRes.count ?? 0,
      active_accounts: accounts.filter(a => a.is_active).length,
      funded_accounts: accounts.filter(a => a.account_status === 'funded').length,
      breached_accounts: accounts.filter(a => a.account_status === 'breached').length,
      total_deposited: 0, total_payouts_paid: 0,
      pending_payouts: 0, pending_payout_amount: 0,
      revenue_today: 0, revenue_month: 0, revenue_all_time: 0,
      new_signups_today: 0, new_signups_month: 0,
      churn_rate: 0, avg_account_lifetime_days: 0,
    })
  }

  // ── admin/risk-metrics ──────────────────────────────────────────────────────
  if (apiPath === 'admin/risk-metrics') {
    const { data: positions } = await admin
      .from('positions').select('symbol, direction, quantity, entry_price, leverage, account_id')
      .eq('status', 'open')
    const totalExp = (positions ?? []).reduce((s, p) =>
      s + (p.quantity ?? 0) * (p.entry_price ?? 0) * (p.leverage ?? 1), 0
    )
    return NextResponse.json({
      total_open_exposure: totalExp,
      total_open_pnl: 0,
      max_single_account_exposure: 0,
      accounts_near_breach: 0,
      accounts_at_daily_limit: 0,
      breached_today: 0,
      largest_open_position: null,
      top_symbols_exposure: [],
      drawdown_distribution: [
        { bucket: '0-2%', count: 0 }, { bucket: '2-4%', count: 0 },
        { bucket: '4-6%', count: 0 }, { bucket: '6-8%', count: 0 },
        { bucket: '8-10%', count: 0 },
      ],
    })
  }

  return null
}
