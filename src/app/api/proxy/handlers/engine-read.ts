/**
 * Engine read handlers — Supabase mode
 * Covers: instruments, positions, closed-positions, orders, trading-data,
 *         challenge-status, equity-history, activity, candles, leaderboard, accounts
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { HandlerResult } from './shared'
import { toEpochMs, COINGECKO_IDS, TWELVE_DATA_MAP } from './shared'

// ─── Shared: map instrument row + price_cache join to API shape ─────────────

function mapInstrumentRow(inst: Record<string, unknown>) {
  const pc = inst.price_cache as Record<string, number> | null
  return {
    ...inst,
    symbol:        inst.symbol as string,
    current_price: pc?.current_price ?? 0,
    current_bid:   pc?.current_bid ?? 0,
    current_ask:   pc?.current_ask ?? 0,
    mark_price:    pc?.mark_price ?? 0,
    funding_rate:  pc?.funding_rate ?? -0.0002,
    next_funding_time: pc?.next_funding_time ?? (Date.now() + 4 * 3600_000),
    last_updated:  pc?.last_updated ?? Date.now(),
    price_cache: undefined,
    created_at: toEpochMs(inst.created_at as string),
    updated_at: toEpochMs(inst.updated_at as string),
  }
}

// ─── Shared: map position timestamps ─────────────────────────────────────────

function mapPosition(p: Record<string, unknown>) {
  return {
    ...p,
    entry_timestamp: typeof p.entry_timestamp === 'number'
      ? p.entry_timestamp
      : toEpochMs(p.entry_timestamp as string),
    exit_timestamp: p.exit_timestamp
      ? (typeof p.exit_timestamp === 'number' ? p.exit_timestamp : toEpochMs(p.exit_timestamp as string))
      : null,
    created_at: toEpochMs(p.created_at as string),
    updated_at: toEpochMs(p.updated_at as string),
  }
}

export async function handleEngineRead(req: NextRequest, apiPath: string): Promise<HandlerResult> {
  const { createSupabaseServerClient } = await import('@/lib/supabase/server')

  // ── actions/accounts ────────────────────────────────────────────────────────
  if (apiPath === 'actions/accounts') {
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json([], { status: 401 })

    let { data: accounts } = await supabase
      .from('accounts').select('*')
      .eq('user_id', session.user.id).eq('is_active', true)
      .order('created_at', { ascending: true })

    // Auto-create a default evaluation account if the user has none
    if (!accounts || accounts.length === 0) {
      const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
      const admin = createSupabaseAdminClient()

      const { data: template } = await admin
        .from('challenge_templates').select('id, starting_balance').order('created_at').limit(1).single()

      const startBal = template?.starting_balance ?? 200_000

      const { data: newAccount } = await admin
        .from('accounts')
        .insert({
          user_id:              session.user.id,
          name:                 'Phase 1 — Evaluation',
          account_type:         'prop',
          base_currency:        'USD',
          default_margin_mode:  'cross',
          starting_balance:     startBal,
          available_margin:     startBal,
          reserved_margin:      0,
          total_margin_required: 0,
          injected_funds:       startBal,
          net_worth:            startBal,
          total_pnl:            0,
          unrealized_pnl:       0,
          realized_pnl:         0,
          is_active:            true,
          is_closed:            false,
          account_status:       'active',
          current_phase:        1,
          challenge_template_id: template?.id ?? null,
        })
        .select()

      accounts = newAccount ?? []
    }

    return NextResponse.json((accounts ?? []).map(a => ({
      ...a,
      created_at: toEpochMs(a.created_at),
      updated_at: toEpochMs(a.updated_at),
    })))
  }

  // ── engine/instruments ──────────────────────────────────────────────────────
  // Uses admin client (service role) because instruments are public data —
  // no RLS needed. This ensures the list always loads regardless of auth state.
  if (apiPath === 'engine/instruments') {
    const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
    const admin = createSupabaseAdminClient()
    const { data: rows, error } = await admin
      .from('instruments').select('*, price_cache(*)').eq('is_active', true).order('symbol')

    if (error) console.error('[engine/instruments] Supabase error:', error.message)
    return NextResponse.json((rows ?? []).map(mapInstrumentRow))
  }

  // ── engine/positions ────────────────────────────────────────────────────────
  if (apiPath === 'engine/positions') {
    const accountId = req.nextUrl.searchParams.get('account_id')
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !accountId) return NextResponse.json([], { status: 401 })

    const { data: positions } = await supabase
      .from('positions').select('*')
      .eq('account_id', accountId).eq('status', 'open')
      .order('created_at', { ascending: false })

    return NextResponse.json((positions ?? []).map(mapPosition))
  }

  // ── engine/closed-positions ─────────────────────────────────────────────────
  if (apiPath === 'engine/closed-positions') {
    const accountId = req.nextUrl.searchParams.get('account_id')
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !accountId) return NextResponse.json([], { status: 401 })

    const { data: positions } = await supabase
      .from('positions').select('*')
      .eq('account_id', accountId).eq('status', 'closed')
      .order('exit_timestamp', { ascending: false })
      .limit(200)

    return NextResponse.json((positions ?? []).map(mapPosition))
  }

  // ── engine/orders ───────────────────────────────────────────────────────────
  if (apiPath === 'engine/orders') {
    const accountId = req.nextUrl.searchParams.get('account_id')
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !accountId) return NextResponse.json([], { status: 401 })

    const { data: orders } = await supabase
      .from('orders').select('*')
      .eq('account_id', accountId)
      .in('status', ['pending', 'partial'])
      .order('created_at', { ascending: false })

    return NextResponse.json((orders ?? []).map(o => ({
      ...o,
      created_at: toEpochMs(o.created_at),
      updated_at: toEpochMs(o.updated_at),
    })))
  }

  // ── engine/trading-data ─────────────────────────────────────────────────────
  if (apiPath === 'engine/trading-data') {
    const accountId = req.nextUrl.searchParams.get('account_id')
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !accountId) return NextResponse.json(null, { status: 401 })

    const [accountRes, positionsRes, instrumentsRes] = await Promise.all([
      supabase.from('accounts').select('*').eq('id', accountId).single(),
      supabase.from('positions').select('*').eq('account_id', accountId).eq('status', 'open'),
      supabase.from('instruments').select('*, price_cache(*)').eq('is_active', true),
    ])

    const instruments = (instrumentsRes.data ?? []).map(mapInstrumentRow)
    const prices = Object.fromEntries(instruments.map(i => [i.symbol, i.current_price]))
    const acct = accountRes.data

    return NextResponse.json({
      account: acct ? { ...acct, created_at: toEpochMs(acct.created_at), updated_at: toEpochMs(acct.updated_at) } : null,
      positions: (positionsRes.data ?? []).map(mapPosition),
      instruments,
      prices,
    })
  }

  // ── engine/challenge-status ─────────────────────────────────────────────────
  if (apiPath === 'engine/challenge-status') {
    const accountId = req.nextUrl.searchParams.get('account_id')
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !accountId) return NextResponse.json(null, { status: 401 })

    const { data: account } = await supabase
      .from('accounts').select('*, challenge_templates(*)').eq('id', accountId).single()
    if (!account) return NextResponse.json(null, { status: 404 })

    const template = account.challenge_templates as Record<string, unknown> | null
    const phaseSequence = (template?.phase_sequence ?? []) as Array<Record<string, number>>
    const phaseIdx = (account.current_phase ?? 1) - 1
    const rule = phaseSequence[phaseIdx] ?? {}

    const currentProfit = account.starting_balance > 0
      ? account.realized_pnl / account.starting_balance
      : 0

    const { count: tradingDays } = await supabase
      .from('equity_history').select('*', { count: 'exact', head: true })
      .eq('account_id', accountId).neq('pnl', 0)

    // Calculate current daily loss
    const startOfDayUtc = new Date()
    startOfDayUtc.setUTCHours(0, 0, 0, 0)

    const [closedTodayRes, openPosRes] = await Promise.all([
      supabase
        .from('positions').select('realized_pnl')
        .eq('account_id', accountId).eq('status', 'closed')
        .gte('exit_timestamp', startOfDayUtc.getTime()),
      supabase
        .from('positions').select('direction, quantity, leverage, entry_price, symbol')
        .eq('account_id', accountId).eq('status', 'open'),
    ])

    const realizedToday = (closedTodayRes.data ?? []).reduce(
      (s, p) => s + Number(p.realized_pnl ?? 0), 0
    )

    const { data: pricesRaw } = await supabase
      .from('price_cache').select('symbol, current_price')
    const priceMap: Record<string, number> = {}
    for (const pr of pricesRaw ?? []) priceMap[pr.symbol] = Number(pr.current_price ?? 0)

    const unrealizedToday = (openPosRes.data ?? []).reduce((s, p) => {
      const mp = priceMap[p.symbol] ?? Number(p.entry_price)
      const diff = p.direction === 'long'
        ? mp - Number(p.entry_price)
        : Number(p.entry_price) - mp
      return s + diff * Number(p.quantity) * Number(p.leverage)
    }, 0)

    const dailyPnl = realizedToday + unrealizedToday
    const currentDailyLoss = account.starting_balance > 0
      ? Math.max(0, -dailyPnl / account.starting_balance)
      : 0

    return NextResponse.json({
      account_id: accountId,
      phase: account.current_phase ?? 1,
      status: account.account_status,
      profit_target: rule.profit_target ?? 0.08,
      daily_loss_limit: rule.daily_loss_limit ?? 0.05,
      max_drawdown: rule.max_drawdown ?? 0.10,
      current_profit: currentProfit,
      current_daily_loss: currentDailyLoss,
      current_drawdown: account.starting_balance > 0
        ? Math.max(0, (account.starting_balance - account.net_worth) / account.starting_balance)
        : 0,
      trading_days: tradingDays ?? 0,
      min_trading_days: rule.min_trading_days ?? 5,
      started_at: toEpochMs(account.created_at),
      ends_at: null,
    })
  }

  // ── engine/equity-history ───────────────────────────────────────────────────
  if (apiPath === 'engine/equity-history') {
    const accountId = req.nextUrl.searchParams.get('account_id')
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !accountId) return NextResponse.json([], { status: 401 })

    const { data } = await supabase
      .from('equity_history').select('ts, equity, pnl')
      .eq('account_id', accountId).order('ts', { ascending: true }).limit(90)
    return NextResponse.json(data ?? [])
  }

  // ── engine/activity ─────────────────────────────────────────────────────────
  if (apiPath === 'engine/activity') {
    const accountId = req.nextUrl.searchParams.get('account_id')
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !accountId) return NextResponse.json([], { status: 401 })

    const { data } = await supabase
      .from('activity').select('*').eq('account_id', accountId)
      .order('ts', { ascending: false }).limit(30)
    return NextResponse.json(data ?? [])
  }

  // ── engine/payouts ───────────────────────────────────────────────────────────
  if (apiPath === 'engine/payouts') {
    const accountId = req.nextUrl.searchParams.get('account_id')
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !accountId) return NextResponse.json([], { status: 401 })

    const { data: payouts } = await supabase
      .from('payouts').select('*')
      .eq('account_id', accountId)
      .order('requested_at', { ascending: false })
      .limit(50)

    return NextResponse.json((payouts ?? []).map(p => ({
      ...p,
      requested_at: toEpochMs(p.requested_at),
      processed_at: p.processed_at ? toEpochMs(p.processed_at) : null,
      created_at: toEpochMs(p.created_at),
      updated_at: toEpochMs(p.updated_at),
    })))
  }

  // ── engine/affiliate — user-facing affiliate dashboard ────────────────────
  if (apiPath === 'engine/affiliate') {
    // Supabase mode would query affiliates + referrals tables
    // For now, return null to fall through to mock
    return null
  }

  // ── engine/competitions — competition list ──────────────────────────────
  if (apiPath === 'engine/competitions') {
    // Supabase mode would query competitions table
    // For now, return null to fall through to mock
    return null
  }

  // ── leaderboard ─────────────────────────────────────────────────────────────
  if (apiPath === 'leaderboard') {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.from('leaderboard_view').select('*').limit(50)
    return NextResponse.json(data ?? [])
  }

  // ── engine/candles — live prices from CoinGecko / Twelve Data ──────────────
  if (apiPath === 'engine/candles') {
    const symbol   = req.nextUrl.searchParams.get('symbol') ?? 'BTC-USD'
    const interval = req.nextUrl.searchParams.get('interval') ?? '1h'
    const limit    = Math.min(500, parseInt(req.nextUrl.searchParams.get('limit') ?? '200'))

    if (COINGECKO_IDS[symbol]) {
      const daysMap: Record<string, string> = {
        '1m': '1', '5m': '1', '15m': '1', '1h': '7', '4h': '14', '1d': '30', '1w': '90'
      }
      const days = daysMap[interval] ?? '7'
      const cgId = COINGECKO_IDS[symbol]
      try {
        const cgRes = await fetch(
          `https://api.coingecko.com/api/v3/coins/${cgId}/ohlc?vs_currency=usd&days=${days}`,
          { next: { revalidate: 30 } }
        )
        if (cgRes.ok) {
          const raw: [number, number, number, number, number][] = await cgRes.json()
          const candles = raw.slice(-limit).map(([time, open, high, low, close]) => ({
            time: Math.floor(time / 1000), open, high, low, close, volume: 0
          }))
          return NextResponse.json(candles)
        }
      } catch { /* fall through to mock */ }
    }

    if (TWELVE_DATA_MAP[symbol]) {
      const tdKey = process.env.TWELVE_DATA_API_KEY
      if (tdKey && !tdKey.includes('VOTRE')) {
        const tdIntervalMap: Record<string, string> = {
          '1m': '1min', '5m': '5min', '15m': '15min', '1h': '1h', '4h': '4h', '1d': '1day'
        }
        const tdInterval = tdIntervalMap[interval] ?? '1h'
        const tdSymbol = TWELVE_DATA_MAP[symbol]
        try {
          const tdRes = await fetch(
            `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=${tdInterval}&outputsize=${limit}&apikey=${tdKey}`,
            { next: { revalidate: 60 } }
          )
          if (tdRes.ok) {
            const raw = await tdRes.json()
            type TwelveBar = { datetime: string; open: string; high: string; low: string; close: string; volume?: string }
            const candles = ((raw.values ?? []) as TwelveBar[]).reverse().map(v => ({
              time: Math.floor(new Date(v.datetime).getTime() / 1000),
              open: parseFloat(v.open), high: parseFloat(v.high),
              low: parseFloat(v.low), close: parseFloat(v.close),
              volume: parseFloat(v.volume ?? '0'),
            }))
            return NextResponse.json(candles)
          }
        } catch { /* fall through to mock */ }
      }
    }

    // Fallback: signals caller to use mock generator
    return null
  }

  return null
}
