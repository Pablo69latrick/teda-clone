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

  // ── admin/payouts (GET) ─────────────────────────────────────────────────────
  if (apiPath === 'admin/payouts') {
    const { data: payouts } = await admin
      .from('payouts').select('*, profiles(name, email)')
      .order('requested_at', { ascending: false })
      .limit(100)

    return NextResponse.json((payouts ?? []).map(p => {
      const pr = p.profiles as { name?: string; email?: string } | null
      return {
        ...p,
        profiles: undefined,
        user_name: pr?.name ?? '',
        user_email: pr?.email ?? '',
        requested_at: toEpochMs(p.requested_at),
        processed_at: p.processed_at ? toEpochMs(p.processed_at) : null,
        created_at: toEpochMs(p.created_at),
        updated_at: toEpochMs(p.updated_at),
      }
    }))
  }

  return null
}

// ─── Admin POST handlers ──────────────────────────────────────────────────────

export async function handleAdminWrite(req: NextRequest, apiPath: string): Promise<HandlerResult> {
  if (!apiPath.startsWith('admin/')) return null

  const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createSupabaseAdminClient()

  // ── admin/approve-payout ──────────────────────────────────────────────────
  if (apiPath === 'admin/approve-payout') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    if (!body.payout_id || typeof body.payout_id !== 'string') {
      return NextResponse.json({ error: 'Invalid payout_id' }, { status: 400 })
    }

    const action = body.action as string
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
    }

    const { data: payout } = await admin
      .from('payouts')
      .select('id, status, account_id, amount')
      .eq('id', body.payout_id)
      .single()

    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    if (payout.status !== 'pending') {
      return NextResponse.json({ error: 'Payout already processed' }, { status: 422 })
    }

    const now = Date.now()
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const adminNote = typeof body.admin_note === 'string' ? body.admin_note.slice(0, 500) : null

    const { error: updateErr } = await admin
      .from('payouts')
      .update({
        status:       newStatus,
        admin_note:   adminNote,
        processed_at: now,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', body.payout_id)

    if (updateErr) {
      console.error('[approve-payout] error:', updateErr)
      return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 })
    }

    // Activity record
    await admin.from('activity').insert({
      account_id: payout.account_id,
      type:  'payout',
      title: action === 'approve' ? 'Payout approved' : 'Payout rejected',
      sub:   `$${Number(payout.amount).toFixed(2)}${adminNote ? ` — ${adminNote}` : ''}`,
      ts:    now,
      pnl:   null,
    })

    return NextResponse.json({
      success: true,
      payout_id: body.payout_id,
      status: newStatus,
    })
  }

  // ── admin/ban-user ────────────────────────────────────────────────────────
  if (apiPath === 'admin/ban-user') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    if (!body.user_id || typeof body.user_id !== 'string') {
      return NextResponse.json({ error: 'Invalid user_id' }, { status: 400 })
    }

    const ban = body.ban !== false // default true
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null

    const { error } = await admin
      .from('profiles')
      .update({
        banned: ban,
        ban_reason: ban ? reason : null,
        ban_expires: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.user_id)

    if (error) {
      console.error('[ban-user] error:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ success: true, user_id: body.user_id, banned: ban })
  }

  // ── admin/force-close-position ────────────────────────────────────────────
  if (apiPath === 'admin/force-close-position') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    if (!body.position_id || typeof body.position_id !== 'string') {
      return NextResponse.json({ error: 'Invalid position_id' }, { status: 400 })
    }

    const { data: pos } = await admin
      .from('positions')
      .select('id, account_id, symbol, direction, quantity, leverage, entry_price, isolated_margin, trade_fees')
      .eq('id', body.position_id)
      .eq('status', 'open')
      .single()

    if (!pos) {
      return NextResponse.json({ error: 'Position not found or already closed' }, { status: 404 })
    }

    // Get exit price
    const { data: priceRow } = await admin
      .from('price_cache')
      .select('current_price, current_bid, current_ask')
      .eq('symbol', pos.symbol)
      .single()

    const exitPrice = pos.direction === 'long'
      ? (priceRow?.current_bid ?? priceRow?.current_price ?? Number(pos.entry_price))
      : (priceRow?.current_ask ?? priceRow?.current_price ?? Number(pos.entry_price))

    const priceDiff = pos.direction === 'long'
      ? exitPrice - Number(pos.entry_price)
      : Number(pos.entry_price) - exitPrice
    const realizedPnl = priceDiff * Number(pos.quantity) * Number(pos.leverage)
    const closeFee = exitPrice * Number(pos.quantity) * 0.0007
    const now = Date.now()

    await admin
      .from('positions')
      .update({
        status:         'closed',
        close_reason:   'admin_force',
        exit_price:     exitPrice,
        exit_timestamp: now,
        realized_pnl:   realizedPnl,
        total_fees:     Number(pos.trade_fees) + closeFee,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', body.position_id)

    // Cancel linked orders
    await admin
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('position_id', body.position_id)
      .in('status', ['pending', 'partial'])

    // Release margin
    const { data: acct } = await admin
      .from('accounts')
      .select('available_margin, realized_pnl')
      .eq('id', pos.account_id)
      .single()

    if (acct) {
      await admin
        .from('accounts')
        .update({
          available_margin: Number(acct.available_margin) + Number(pos.isolated_margin) + realizedPnl - closeFee,
          realized_pnl:     Number(acct.realized_pnl) + realizedPnl,
          updated_at:       new Date().toISOString(),
        })
        .eq('id', pos.account_id)
    }

    // Activity
    await admin.from('activity').insert({
      account_id: pos.account_id,
      type:  'closed',
      title: `[Admin] ${pos.direction === 'long' ? 'Long' : 'Short'} ${pos.symbol} force-closed`,
      sub:   `${Number(pos.quantity)} @ $${exitPrice.toFixed(2)}`,
      ts:    now,
      pnl:   realizedPnl,
    })

    return NextResponse.json({
      success:      true,
      position_id:  body.position_id,
      exit_price:   exitPrice,
      realized_pnl: realizedPnl,
    })
  }

  // ── admin/update-template ─────────────────────────────────────────────────
  if (apiPath === 'admin/update-template') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>

    if (!body.template_id || typeof body.template_id !== 'string') {
      return NextResponse.json({ error: 'Invalid template_id' }, { status: 400 })
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.name === 'string') updates.name = body.name.slice(0, 200)
    if (typeof body.description === 'string') updates.description = body.description.slice(0, 1000)
    if (typeof body.entry_fee === 'number') updates.entry_fee = body.entry_fee
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active
    if (Array.isArray(body.phase_sequence)) updates.phase_sequence = body.phase_sequence

    const { error } = await admin
      .from('challenge_templates')
      .update(updates)
      .eq('id', body.template_id)

    if (error) {
      console.error('[update-template] error:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ success: true, template_id: body.template_id })
  }

  return null
}
