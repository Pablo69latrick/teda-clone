/**
 * Next.js catch-all proxy route.
 *
 * Mode selection (in order of priority):
 *  1. PROXY_TO_LIVE=true  → proxies to app.verticalprop.com (original live backend)
 *  2. Supabase configured → queries Supabase DB + live price APIs
 *  3. Dev mock mode       → returns rich local mock data (original behaviour)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { isServerSupabaseConfigured } from '@/lib/supabase/config'

// Alias for local readability
const isSupabaseReady = isServerSupabaseConfigured

// ─── Timestamp helper ─────────────────────────────────────────────────────────

function toEpoch(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  const n = new Date(v).getTime()
  return isNaN(n) ? null : n
}
function toEpochMs(v: string | number | null | undefined): number {
  return toEpoch(v) ?? Date.now()
}

// ─── CoinGecko / Twelve Data instrument map ───────────────────────────────────
const COINGECKO_IDS: Record<string, string> = {
  'BTC-USD': 'bitcoin', 'ETH-USD': 'ethereum', 'SOL-USD': 'solana',
  'XRP-USD': 'ripple', 'ADA-USD': 'cardano', 'DOGE-USD': 'dogecoin',
  'LINK-USD': 'chainlink', 'ARB-USD': 'arbitrum', '1INCH-USD': '1inch',
  'AAVE-USD': 'aave', 'ASTER-USD': 'astar',
}
const TWELVE_DATA_MAP: Record<string, string> = {
  'EUR-USD': 'EUR/USD', 'GBP-USD': 'GBP/USD', 'AUD-USD': 'AUD/USD',
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

async function handleSupabase(req: NextRequest, apiPath: string): Promise<NextResponse | null> {
  const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')

  // ── auth/get-session ──────────────────────────────────────────────────────
  if (apiPath === 'auth/get-session') {
    const supabase = await createSupabaseServerClient()
    // C-M05: use getUser() to validate the JWT with the Supabase Auth server
    // (getSession() reads from cookie without revalidating — revoked sessions stay valid)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ session: null, user: null }, { status: 401 })

    // Keep getSession only to get expires_at / created_at metadata (no auth decision here)
    const { data: { session } } = await supabase.auth.getSession()

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()

    if (!profile) return NextResponse.json({ session: null, user: null }, { status: 401 })

    return NextResponse.json({
      session: {
        id: user.id,
        // C-07: never expose the raw access_token in the response body
        // Token management is handled exclusively by Supabase httpOnly cookies
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

  // ── actions/accounts ──────────────────────────────────────────────────────
  if (apiPath === 'actions/accounts') {
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json([], { status: 401 })

    const { data: accounts } = await supabase
      .from('accounts').select('*')
      .eq('user_id', session.user.id).eq('is_active', true)
      .order('created_at', { ascending: true })

    return NextResponse.json((accounts ?? []).map(a => ({
      ...a,
      created_at: toEpochMs(a.created_at),
      updated_at: toEpochMs(a.updated_at),
    })))
  }

  // ── engine/instruments ────────────────────────────────────────────────────
  if (apiPath === 'engine/instruments') {
    const supabase = await createSupabaseServerClient()
    const { data: rows } = await supabase
      .from('instruments').select('*, price_cache(*)').eq('is_active', true).order('symbol')

    const result = (rows ?? []).map(inst => {
      const pc = inst.price_cache as Record<string, number> | null
      return {
        ...inst,
        current_price: pc?.current_price ?? 0,
        current_bid:   pc?.current_bid ?? 0,
        current_ask:   pc?.current_ask ?? 0,
        mark_price:    pc?.mark_price ?? 0,
        funding_rate:  pc?.funding_rate ?? -0.0002,
        next_funding_time: pc?.next_funding_time ?? (Date.now() + 4 * 3600_000),
        last_updated:  pc?.last_updated ?? Date.now(),
        price_cache: undefined,
        created_at: toEpochMs((inst as Record<string, unknown>).created_at as string),
        updated_at: toEpochMs((inst as Record<string, unknown>).updated_at as string),
      }
    })
    return NextResponse.json(result)
  }

  // ── engine/positions ──────────────────────────────────────────────────────
  if (apiPath === 'engine/positions') {
    const accountId = req.nextUrl.searchParams.get('account_id')
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || !accountId) return NextResponse.json([], { status: 401 })

    const { data: positions } = await supabase
      .from('positions').select('*')
      .eq('account_id', accountId).eq('status', 'open')
      .order('created_at', { ascending: false })

    return NextResponse.json((positions ?? []).map(p => ({
      ...p,
      entry_timestamp: typeof p.entry_timestamp === 'number' ? p.entry_timestamp : toEpochMs(p.entry_timestamp as unknown as string),
      exit_timestamp:  p.exit_timestamp ? (typeof p.exit_timestamp === 'number' ? p.exit_timestamp : toEpochMs(p.exit_timestamp as unknown as string)) : null,
      created_at: toEpochMs(p.created_at),
      updated_at: toEpochMs(p.updated_at),
    })))
  }

  // ── engine/orders ─────────────────────────────────────────────────────────
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

  // ── engine/trading-data ───────────────────────────────────────────────────
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

    const instruments = (instrumentsRes.data ?? []).map(inst => {
      const pc = inst.price_cache as Record<string, number> | null
      return {
        ...inst,
        current_price: pc?.current_price ?? 0,
        current_bid:   pc?.current_bid ?? 0,
        current_ask:   pc?.current_ask ?? 0,
        mark_price:    pc?.mark_price ?? 0,
        funding_rate:  pc?.funding_rate ?? -0.0002,
        next_funding_time: pc?.next_funding_time ?? (Date.now() + 4 * 3600_000),
        last_updated:  pc?.last_updated ?? Date.now(),
        price_cache: undefined,
        created_at: toEpochMs((inst as Record<string, unknown>).created_at as string),
        updated_at: toEpochMs((inst as Record<string, unknown>).updated_at as string),
      }
    })

    const prices = Object.fromEntries(instruments.map(i => [i.symbol, i.current_price]))
    const acct = accountRes.data
    return NextResponse.json({
      account: acct ? { ...acct, created_at: toEpochMs(acct.created_at), updated_at: toEpochMs(acct.updated_at) } : null,
      positions: (positionsRes.data ?? []).map(p => ({
        ...p,
        entry_timestamp: typeof p.entry_timestamp === 'number' ? p.entry_timestamp : toEpochMs(p.entry_timestamp as unknown as string),
        exit_timestamp: p.exit_timestamp ? toEpochMs(p.exit_timestamp as unknown as string) : null,
        created_at: toEpochMs(p.created_at),
        updated_at: toEpochMs(p.updated_at),
      })),
      instruments,
      prices,
    })
  }

  // ── engine/challenge-status ───────────────────────────────────────────────
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

    return NextResponse.json({
      account_id: accountId,
      phase: account.current_phase ?? 1,
      status: account.account_status,
      profit_target: rule.profit_target ?? 0.08,
      daily_loss_limit: rule.daily_loss_limit ?? 0.05,
      max_drawdown: rule.max_drawdown ?? 0.10,
      current_profit: currentProfit,
      current_daily_loss: 0,
      current_drawdown: account.starting_balance > 0
        ? Math.max(0, (account.starting_balance - account.net_worth) / account.starting_balance)
        : 0,
      trading_days: tradingDays ?? 0,
      min_trading_days: rule.min_trading_days ?? 5,
      started_at: toEpochMs(account.created_at),
      ends_at: null,
    })
  }

  // ── engine/equity-history ─────────────────────────────────────────────────
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

  // ── engine/activity ───────────────────────────────────────────────────────
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

  // ── leaderboard ───────────────────────────────────────────────────────────
  if (apiPath === 'leaderboard') {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase.from('leaderboard_view').select('*').limit(50)
    return NextResponse.json(data ?? [])
  }

  // ── engine/candles — live prices from CoinGecko / Twelve Data ────────────
  if (apiPath === 'engine/candles') {
    const symbol   = req.nextUrl.searchParams.get('symbol') ?? 'BTC-USD'
    const interval = req.nextUrl.searchParams.get('interval') ?? '1h'
    const limit    = Math.min(500, parseInt(req.nextUrl.searchParams.get('limit') ?? '200'))

    if (COINGECKO_IDS[symbol]) {
      // CoinGecko OHLC: [timestamp_ms, open, high, low, close]
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

    // Fallback: mock candles (when external APIs fail or not configured)
    return null  // signals caller to use mock generator
  }

  // ── Admin endpoints ───────────────────────────────────────────────────────
  if (apiPath.startsWith('admin/')) {
    const supabase = await createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json([], { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json([], { status: 403 })

    const admin = createSupabaseAdminClient()

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

    if (apiPath === 'admin/challenge-templates') {
      const { data: templates } = await admin
        .from('challenge_templates').select('*').order('created_at', { ascending: false })
      // Get account counts per template
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

    if (apiPath === 'admin/risk-metrics') {
      // Compute from real positions
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
          { bucket: '0–2%', count: 0 }, { bucket: '2–4%', count: 0 },
          { bucket: '4–6%', count: 0 }, { bucket: '6–8%', count: 0 },
          { bucket: '8–10%', count: 0 },
        ],
      })
    }
  }

  // Not handled by Supabase — return null to fall through to mock
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE WRITE HANDLERS (POST)
// ─────────────────────────────────────────────────────────────────────────────

async function handleSupabasePost(req: NextRequest, apiPath: string): Promise<NextResponse | null> {
  const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')

  if (apiPath === 'engine/orders') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const supabase = await createSupabaseServerClient()
    // M-05: use getUser() to revalidate JWT server-side
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── C-03/C-04: Strict server-side input validation ─────────────────────
    const VALID_DIRECTIONS  = ['long', 'short'] as const
    const VALID_ORDER_TYPES = ['market', 'limit', 'stop', 'stop_limit'] as const

    if (!body.account_id || typeof body.account_id !== 'string') {
      return NextResponse.json({ error: 'Invalid account' }, { status: 400 })
    }
    if (!body.symbol || typeof body.symbol !== 'string') {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
    }
    if (!VALID_DIRECTIONS.includes(body.direction as typeof VALID_DIRECTIONS[number])) {
      return NextResponse.json({ error: 'direction must be long or short' }, { status: 400 })
    }
    if (!VALID_ORDER_TYPES.includes(body.order_type as typeof VALID_ORDER_TYPES[number])) {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }

    const qty = Number(body.quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive number' }, { status: 400 })
    }

    const rawLev = Number(body.leverage ?? 1)
    if (!Number.isFinite(rawLev) || rawLev < 1) {
      return NextResponse.json({ error: 'leverage must be ≥ 1' }, { status: 400 })
    }
    // ──────────────────────────────────────────────────────────────────────

    const admin = createSupabaseAdminClient()

    // C-01: Validate account ownership — explicit user_id check so the admin
    // client writes below cannot be hijacked even if RLS is misconfigured.
    const { data: account } = await supabase
      .from('accounts')
      .select('id, user_id, is_active, available_margin')
      .eq('id', body.account_id)
      .single()
    if (!account || !account.is_active) {
      return NextResponse.json({ error: 'Account not found or inactive' }, { status: 404 })
    }
    // Explicit app-level ownership guard (belt-and-suspenders on top of RLS)
    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify symbol exists in instruments table
    const { data: instrument } = await admin
      .from('instruments')
      .select('price_decimals, qty_decimals, max_leverage, min_order_size, margin_requirement')
      .eq('symbol', body.symbol)
      .eq('is_active', true)
      .single()
    if (!instrument) {
      return NextResponse.json({ error: 'Unknown or inactive symbol' }, { status: 400 })
    }

    // Clamp leverage to instrument max (lower bound already validated above)
    const lev = Math.max(1, Math.min(rawLev, instrument.max_leverage ?? 100))

    // Validate against instrument min_order_size
    if (qty < (instrument.min_order_size ?? 0)) {
      return NextResponse.json({
        error: `Minimum order size is ${instrument.min_order_size}`
      }, { status: 400 })
    }

    // Get current price from price_cache
    const { data: priceRow } = await admin
      .from('price_cache')
      .select('current_price, current_bid, current_ask, mark_price')
      .eq('symbol', body.symbol)
      .single()

    const execPrice = body.order_type === 'market'
      ? (body.direction === 'long'
          ? (priceRow?.current_ask ?? priceRow?.current_price ?? (body.price as number ?? 0))
          : (priceRow?.current_bid ?? priceRow?.current_price ?? (body.price as number ?? 0)))
      : (body.price as number ?? 0)

    if (!Number.isFinite(execPrice) || execPrice <= 0) {
      return NextResponse.json({ error: 'No price available for this symbol' }, { status: 422 })
    }

    const notional = execPrice * qty
    const margin   = notional / lev
    const fee      = notional * 0.0007  // 0.07% taker fee

    // Overflow guard (belt-and-suspenders after finite checks)
    if (!Number.isFinite(notional) || !Number.isFinite(margin)) {
      return NextResponse.json({ error: 'Order size too large' }, { status: 400 })
    }

    // Margin check — generic message to avoid leaking exact balance (H-05)
    if (margin > Number(account.available_margin)) {
      return NextResponse.json({ error: 'Insufficient margin for this order' }, { status: 422 })
    }

    // Liquidation price (simplified: entry ± (100/lev)%)
    const liqPct = 1 / lev
    const liquidation_price = body.direction === 'long'
      ? execPrice * (1 - liqPct)
      : execPrice * (1 + liqPct)

    if (body.order_type === 'market') {
      // ── C-06: Atomic market order via Postgres RPC ────────────────────────
      // place_market_order() acquires a FOR UPDATE lock on the accounts row,
      // checks margin, inserts the position, deducts margin, and creates
      // SL/TP orders — all in a single transaction.  No race condition.
      const { data: rpcResult, error: rpcErr } = await admin.rpc('place_market_order', {
        p_account_id:        body.account_id,
        p_user_id:           user.id,
        p_symbol:            body.symbol,
        p_direction:         body.direction,
        p_margin_mode:       body.margin_mode ?? 'cross',
        p_quantity:          qty,
        p_leverage:          lev,
        p_exec_price:        execPrice,
        p_margin:            margin,
        p_fee:               fee,
        p_liquidation_price: liquidation_price,
        p_instrument_config: String(body.symbol),
        p_instrument_price:  String(execPrice),
        p_sl_price:          body.sl_price ? Number(body.sl_price) : null,
        p_tp_price:          body.tp_price ? Number(body.tp_price) : null,
      })

      if (rpcErr || !rpcResult) {
        console.error('[orders POST] place_market_order RPC error:', rpcErr)
        // Map known DB exceptions to meaningful HTTP responses
        const hint = rpcErr?.hint ?? rpcErr?.message ?? ''
        if (hint.includes('insufficient_margin')) {
          return NextResponse.json({ error: 'Insufficient margin for this order' }, { status: 422 })
        }
        if (hint.includes('account_not_found')) {
          return NextResponse.json({ error: 'Account not found or inactive' }, { status: 404 })
        }
        return NextResponse.json({ error: 'Failed to open position. Please try again.' }, { status: 500 })
      }

      // RPC returns the position as JSON — pass it through with status 201
      return NextResponse.json({ ...rpcResult, status: 'filled' }, { status: 201 })
    }

    // ── Limit / stop order ─────────────────────────────────────────────────────
    if (!body.price && body.order_type !== 'market') {
      return NextResponse.json({ error: 'Price required for limit/stop orders' }, { status: 422 })
    }

    const { data: order, error: ordErr } = await admin
      .from('orders')
      .insert({
        account_id:      body.account_id,
        symbol:          body.symbol,
        direction:       body.direction,
        order_type:      body.order_type,
        quantity:        qty,
        leverage:        lev,
        price:           body.order_type === 'limit' ? (body.price ?? null) : null,
        stop_price:      body.order_type === 'stop'  ? (body.price ?? null) : null,
        sl_price:        body.sl_price ?? null,
        tp_price:        body.tp_price ?? null,
        margin_mode:     body.margin_mode ?? 'cross',
        status:          'pending',
        filled_quantity: 0,
      })
      .select()
      .single()

    if (ordErr || !order) {
      // H-05: log full error server-side, return generic message to client
      console.error('[orders POST] order insert error:', ordErr)
      return NextResponse.json({ error: 'Failed to place order. Please try again.' }, { status: 500 })
    }

    // Activity
    await admin.from('activity').insert({
      account_id: body.account_id,
      type:  'order',
      title: `${body.order_type === 'limit' ? 'Limit' : 'Stop'} ${body.direction} ${body.symbol}`,
      sub:   `${qty} @ $${Number(body.price).toFixed(instrument?.price_decimals ?? 2)} · ${lev}x`,
      ts:    Date.now(),
      pnl:   null,
    })

    return NextResponse.json({
      id:              order.id,
      account_id:      order.account_id,
      symbol:          order.symbol,
      direction:       order.direction,
      order_type:      order.order_type,
      quantity:        Number(order.quantity),
      leverage:        Number(order.leverage),
      price:           order.price ? Number(order.price) : null,
      stop_price:      order.stop_price ? Number(order.stop_price) : null,
      sl_price:        order.sl_price ? Number(order.sl_price) : null,
      tp_price:        order.tp_price ? Number(order.tp_price) : null,
      status:          order.status,
      margin_mode:     order.margin_mode,
      filled_quantity: 0,
      position_id:     null,
      created_at:      toEpochMs(order.created_at),
      updated_at:      toEpochMs(order.updated_at),
    }, { status: 201 })
  }

  // ── engine/close-position ─────────────────────────────────────────────────
  if (apiPath === 'engine/close-position') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const supabase = await createSupabaseServerClient()
    // M-05: use getUser() to revalidate JWT server-side
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!body.position_id || typeof body.position_id !== 'string') {
      return NextResponse.json({ error: 'Invalid position_id' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    const positionId = body.position_id as string

    // C-02: Verify ownership via RLS (anon client scoped to session user) +
    // then explicit app-level check that the position's account belongs to this user.
    const { data: pos } = await supabase
      .from('positions')
      .select('id, account_id, symbol, direction, quantity, leverage, entry_price, isolated_margin, trade_fees, status')
      .eq('id', positionId)
      .eq('status', 'open')
      .single()

    if (!pos) {
      return NextResponse.json({ error: 'Position not found or already closed' }, { status: 404 })
    }

    // Explicit ownership check: confirm the position's account belongs to this user
    const { data: posAccount } = await supabase
      .from('accounts')
      .select('id, user_id')
      .eq('id', pos.account_id)
      .single()
    if (!posAccount || posAccount.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get exit price from price_cache
    const { data: priceRow } = await admin
      .from('price_cache')
      .select('current_price, current_bid, current_ask')
      .eq('symbol', pos.symbol)
      .single()

    // Close at bid if long (selling), ask if short (buying back)
    const exitPrice = pos.direction === 'long'
      ? (priceRow?.current_bid ?? priceRow?.current_price ?? Number(pos.entry_price))
      : (priceRow?.current_ask ?? priceRow?.current_price ?? Number(pos.entry_price))

    const priceDiff  = pos.direction === 'long'
      ? exitPrice - Number(pos.entry_price)
      : Number(pos.entry_price) - exitPrice
    const realizedPnl = priceDiff * Number(pos.quantity) * Number(pos.leverage)
    const closeFee    = exitPrice * Number(pos.quantity) * 0.0007

    const now = Date.now()

    // Close the position
    const { error: closeErr } = await admin
      .from('positions')
      .update({
        status:       'closed',
        close_reason: 'manual',
        exit_price:   exitPrice,
        exit_timestamp: now,
        realized_pnl: realizedPnl,
        total_fees:   Number(pos.trade_fees) + closeFee,
        updated_at:   new Date().toISOString(),
      })
      .eq('id', positionId)

    if (closeErr) {
      // H-05: log full error server-side, return generic message to client
      console.error('[close-position] update error:', closeErr)
      return NextResponse.json({ error: 'Failed to close position. Please try again.' }, { status: 500 })
    }

    // Cancel any linked SL/TP orders
    await admin
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('position_id', positionId)
      .in('status', ['pending', 'partial'])

    // Release margin back to account
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

    // Equity history snapshot
    if (acct) {
      await admin.from('equity_history').insert({
        account_id: pos.account_id,
        ts:         now,
        equity:     Number(acct.available_margin) + Number(pos.isolated_margin) + realizedPnl - closeFee,
        pnl:        realizedPnl,
      })
    }

    // Activity record
    const { data: instr } = await admin
      .from('instruments').select('price_decimals').eq('symbol', pos.symbol).single()
    const pDec = instr?.price_decimals ?? 2
    const pnlStr = realizedPnl >= 0 ? `+$${realizedPnl.toFixed(2)}` : `-$${Math.abs(realizedPnl).toFixed(2)}`
    await admin.from('activity').insert({
      account_id: pos.account_id,
      type:  'closed',
      title: `${pos.direction === 'long' ? 'Long' : 'Short'} ${pos.symbol} closed`,
      sub:   `${Number(pos.quantity)} @ $${exitPrice.toFixed(pDec)} · ${pnlStr}`,
      ts:    now,
      pnl:   realizedPnl,
    })

    return NextResponse.json({
      success:       true,
      position_id:   positionId,
      exit_price:    exitPrice,
      realized_pnl:  realizedPnl,
      close_fee:     closeFee,
    })
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// ORIGINAL MOCK DATA (unchanged from v1)
// ─────────────────────────────────────────────────────────────────────────────

function mockInstrument(
  symbol: string, price: number, bid: number, ask: number,
  priceDec: number, qtyDec: number, type: string,
) {
  return {
    id: symbol, symbol, instrument_type: type,
    base_currency: symbol.split('-')[0], quote_currency: 'USD',
    margin_requirement: type === 'forex' ? 0.001 : 0.01,
    min_order_size: type === 'forex' ? 1000 : 0.001,
    max_leverage: type === 'forex' ? 100 : 20,
    tick_size: Math.pow(10, -priceDec), lot_size: type === 'forex' ? 1000 : 0.001,
    price_decimals: priceDec, qty_decimals: qtyDec,
    is_tradable: true, is_active: true, orderbook_enabled: false, trades_enabled: false,
    current_price: price, current_bid: bid, current_ask: ask,
    mark_price: price, funding_rate: -0.0002,
    next_funding_time: Date.now() + 4 * 60 * 60 * 1000, last_updated: Date.now(),
  }
}

const BASE_PRICES: Record<string, { price: number; bid: number; ask: number; priceDec: number; qtyDec: number; type: string }> = {
  '1INCH-USD': { price: 0.09283,  bid: 0.09282,  ask: 0.09284,  priceDec: 5, qtyDec: 5, type: 'crypto' },
  'AAVE-USD':  { price: 122.550,  bid: 122.540,  ask: 122.560,  priceDec: 3, qtyDec: 3, type: 'crypto' },
  'ADA-USD':   { price: 0.2738,   bid: 0.2737,   ask: 0.2739,   priceDec: 4, qtyDec: 4, type: 'crypto' },
  'ARB-USD':   { price: 0.10420,  bid: 0.10419,  ask: 0.10421,  priceDec: 5, qtyDec: 5, type: 'crypto' },
  'ASTER-USD': { price: 0.06917,  bid: 0.06916,  ask: 0.06918,  priceDec: 5, qtyDec: 5, type: 'crypto' },
  'AUD-USD':   { price: 0.69584,  bid: 0.69583,  ask: 0.69585,  priceDec: 5, qtyDec: 5, type: 'forex'  },
  'BTC-USD':   { price: 95420.5,  bid: 95419.0,  ask: 95421.0,  priceDec: 1, qtyDec: 3, type: 'crypto' },
  'DOGE-USD':  { price: 0.15320,  bid: 0.15318,  ask: 0.15321,  priceDec: 5, qtyDec: 5, type: 'crypto' },
  'ETH-USD':   { price: 3450.25,  bid: 3449.75,  ask: 3450.75,  priceDec: 2, qtyDec: 2, type: 'crypto' },
  'EUR-USD':   { price: 1.08432,  bid: 1.08431,  ask: 1.08433,  priceDec: 5, qtyDec: 5, type: 'forex'  },
  'GBP-USD':   { price: 1.26750,  bid: 1.26748,  ask: 1.26752,  priceDec: 5, qtyDec: 5, type: 'forex'  },
  'LINK-USD':  { price: 14.8320,  bid: 14.8310,  ask: 14.8330,  priceDec: 4, qtyDec: 4, type: 'crypto' },
  'SOL-USD':   { price: 185.320,  bid: 185.310,  ask: 185.330,  priceDec: 3, qtyDec: 3, type: 'crypto' },
  'XRP-USD':   { price: 2.34560,  bid: 2.34550,  ask: 2.34570,  priceDec: 5, qtyDec: 5, type: 'crypto' },
}

const priceState: Record<string, number> = Object.fromEntries(
  Object.entries(BASE_PRICES).map(([sym, v]) => [sym, v.price])
)
function jitterPrice(symbol: string): number {
  const base = BASE_PRICES[symbol].price
  const volatility = base * 0.0003
  priceState[symbol] = Math.max(
    base * 0.97,
    Math.min(base * 1.03, priceState[symbol] + (Math.random() - 0.5) * 2 * volatility)
  )
  return priceState[symbol]
}
function getInstruments() {
  return Object.entries(BASE_PRICES).map(([symbol, v]) => {
    const price = jitterPrice(symbol)
    const halfSpread = Math.pow(10, -v.priceDec)
    return mockInstrument(symbol, price, price - halfSpread, price + halfSpread, v.priceDec, v.qtyDec, v.type)
  })
}

const ACCOUNT_ID = 'f2538dee-cfb0-422a-bf7b-c6b247145b3a'
const MOCK_ACCOUNT = {
  id: ACCOUNT_ID, user_id: 'mock-user-id', name: 'Phase 1 — Evaluation',
  account_type: 'prop', account_type_config: 'mock-template-id', base_currency: 'USD',
  default_margin_mode: 'cross', available_margin: 200_019.91, reserved_margin: 0,
  total_margin_required: 0, injected_funds: 0, net_worth: 200_019.91,
  total_pnl: 19.91, unrealized_pnl: 0, realized_pnl: 19.91,
  is_active: true, is_closed: false, account_status: 'active',
  challenge_template_id: 'mock-template-id',
  created_at: Date.now() - 30 * 24 * 60 * 60 * 1000, updated_at: Date.now(),
}
const MOCK_POSITIONS = [
  { id: 'pos-001', account_id: ACCOUNT_ID, instrument_config: 'BTC-USD', instrument_price: 'BTC-USD', symbol: 'BTC-USD', direction: 'long', quantity: 0.05, leverage: 10, entry_price: 93_200.0, entry_timestamp: Date.now() - 2 * 3600_000, exit_price: null, exit_timestamp: null, liquidation_price: 84_000.0, status: 'open', close_reason: null, margin_mode: 'cross', isolated_margin: 466.0, isolated_wallet: null, realized_pnl: 0, trade_fees: 4.66, overnight_fees: 0, funding_fees: -0.82, total_fees: 5.48, total_funding: -0.82, linked_orders: null, original_quantity: null, created_at: Date.now() - 2 * 3600_000, updated_at: Date.now() },
  { id: 'pos-002', account_id: ACCOUNT_ID, instrument_config: 'ETH-USD', instrument_price: 'ETH-USD', symbol: 'ETH-USD', direction: 'short', quantity: 0.8, leverage: 5, entry_price: 3_520.0, entry_timestamp: Date.now() - 45 * 60_000, exit_price: null, exit_timestamp: null, liquidation_price: 4_025.0, status: 'open', close_reason: null, margin_mode: 'cross', isolated_margin: 563.2, isolated_wallet: null, realized_pnl: 0, trade_fees: 2.82, overnight_fees: 0, funding_fees: 0.35, total_fees: 3.17, total_funding: 0.35, linked_orders: null, original_quantity: null, created_at: Date.now() - 45 * 60_000, updated_at: Date.now() },
  { id: 'pos-003', account_id: ACCOUNT_ID, instrument_config: 'SOL-USD', instrument_price: 'SOL-USD', symbol: 'SOL-USD', direction: 'long', quantity: 5, leverage: 3, entry_price: 181.5, entry_timestamp: Date.now() - 6 * 3600_000, exit_price: null, exit_timestamp: null, liquidation_price: 120.0, status: 'open', close_reason: null, margin_mode: 'cross', isolated_margin: 302.5, isolated_wallet: null, realized_pnl: 0, trade_fees: 1.36, overnight_fees: 0, funding_fees: -0.14, total_fees: 1.50, total_funding: -0.14, linked_orders: null, original_quantity: null, created_at: Date.now() - 6 * 3600_000, updated_at: Date.now() },
]

function generateEquityHistory() {
  const days = 30; const startBalance = 200_000; let equity = startBalance
  const now = Date.now(); const DAY = 86_400_000
  return Array.from({ length: days }, (_, i) => {
    const change = (Math.random() - 0.42) * equity * 0.008
    equity = Math.max(startBalance * 0.88, equity + change)
    return { ts: now - (days - 1 - i) * DAY, equity: parseFloat(equity.toFixed(2)), pnl: parseFloat((equity - startBalance).toFixed(2)) }
  })
}

const MOCK_ACTIVITY = [
  { id: 'act-1', type: 'position',  title: 'Long BTC-USD opened',   sub: '0.05 BTC @ $93,200 · 10x',      ts: Date.now() - 2 * 3600_000,  pnl: null },
  { id: 'act-2', type: 'position',  title: 'Short ETH-USD opened',  sub: '0.8 ETH @ $3,520 · 5x',         ts: Date.now() - 45 * 60_000,   pnl: null },
  { id: 'act-3', type: 'order',     title: 'Limit order placed',    sub: 'Sell 1,000 XRP @ $2.38',         ts: Date.now() - 30 * 60_000,   pnl: null },
  { id: 'act-4', type: 'position',  title: 'Long SOL-USD opened',   sub: '5 SOL @ $181.50 · 3x',           ts: Date.now() - 6 * 3600_000,  pnl: null },
  { id: 'act-5', type: 'closed',    title: 'Long ETH-USD closed',   sub: '1.2 ETH · held 4h',              ts: Date.now() - 8 * 3600_000,  pnl: 142.50 },
  { id: 'act-6', type: 'closed',    title: 'Short BTC-USD closed',  sub: '0.02 BTC · held 2h',             ts: Date.now() - 14 * 3600_000, pnl: -38.20 },
  { id: 'act-7', type: 'closed',    title: 'Long ADA-USD closed',   sub: '2,000 ADA · held 1 day',         ts: Date.now() - 26 * 3600_000, pnl: 87.00 },
  { id: 'act-8', type: 'challenge', title: 'Day 2 of 5 min. reached','sub': 'Keep going — 3 more days needed', ts: Date.now() - 2 * 86400_000, pnl: null },
]

const CANDLE_BASE: Record<string, number> = {
  'BTC-USD': 95420.5, 'ETH-USD': 3450.25, 'SOL-USD': 185.32, 'DOGE-USD': 0.1532,
  '1INCH-USD': 0.09283, 'AAVE-USD': 122.55, 'ADA-USD': 0.2738, 'ARB-USD': 0.1042,
  'ASTER-USD': 0.06917, 'AUD-USD': 0.69584, 'EUR-USD': 1.08432, 'GBP-USD': 1.2675,
  'LINK-USD': 14.832, 'XRP-USD': 2.3456,
}
function generateCandles(symbol: string, interval: string, limit: number) {
  const basePrice = CANDLE_BASE[symbol] ?? 100
  const ms: Record<string, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000, '1w': 604_800_000 }
  const intervalMs = ms[interval] ?? 3_600_000
  const candles = []; let price = basePrice
  const now = Math.floor(Date.now() / intervalMs) * intervalMs
  for (let i = limit; i >= 0; i--) {
    const time = now - i * intervalMs
    const vol = basePrice * (interval === '1d' ? 0.012 : interval === '1h' ? 0.004 : 0.002)
    const open = price
    const close = Math.max(open * 0.5, open + (Math.random() - 0.48) * vol)
    const high = Math.max(open, close) + Math.random() * vol * 0.5
    const low  = Math.min(open, close) - Math.random() * vol * 0.5
    const volume = basePrice > 1000 ? Math.random() * 500 + 50 : basePrice > 1 ? Math.random() * 50_000 + 5_000 : Math.random() * 5_000_000 + 500_000
    candles.push({ time: Math.floor(time / 1000), open, high, low, close, volume })
    price = close
  }
  return candles
}

function getMockData(path: string, req?: NextRequest): unknown {
  switch (path) {
    case 'auth/get-session':
      return { session: { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), token: 'mock-token', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ipAddress: '127.0.0.1', userAgent: 'VerticalProp-Clone', userId: 'mock-user-id' }, user: { id: 'mock-user-id', email: 'trader@example.com', name: 'Jules Trader', emailVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
    case 'actions/accounts': return [MOCK_ACCOUNT]
    case 'engine/trading-data': { const li = getInstruments(); return { account: MOCK_ACCOUNT, positions: MOCK_POSITIONS, instruments: li, prices: Object.fromEntries(li.map(i => [i.symbol, i.current_price])) } }
    case 'engine/instruments': return getInstruments()
    case 'engine/positions': return MOCK_POSITIONS
    case 'engine/orders': return []
    case 'engine/equity-history': return generateEquityHistory()
    case 'engine/activity': return MOCK_ACTIVITY
    case 'engine/challenge-status': return { account_id: ACCOUNT_ID, phase: 1, status: 'active', profit_target: 0.08, daily_loss_limit: 0.05, max_drawdown: 0.10, current_profit: 0.0001, current_daily_loss: 0, current_drawdown: 0, trading_days: 1, min_trading_days: 5, started_at: Date.now() - 24 * 60 * 60 * 1000, ends_at: null }
    case 'leaderboard': return Array.from({ length: 20 }, (_, i) => ({ rank: i + 1, user_id: `user-${i + 1}`, username: `Trader${String(i + 1).padStart(3, '0')}`, avatar_url: null, account_id: `acc-${i + 1}`, profit_pct: parseFloat((8.5 - i * 0.3).toFixed(2)), profit_amount: parseFloat((17_000 - i * 600).toFixed(2)), trading_days: Math.max(5, 20 - i), challenge_type: ['instant', '1-step', '2-step'][i % 3], is_funded: i < 3 }))
    case 'misc/calendar': return []
    case 'admin/users': return Array.from({ length: 40 }, (_, i) => ({ id: `user-${i + 1}`, name: ['Alex Rivera','Jamie Chen','Sam Patel','Morgan Kim','Taylor Liu','Casey Wang','Riley Zhang','Drew Nguyen','Jordan Lee','Quinn Ma'][i % 10], email: `trader${i + 1}@example.com`, emailVerified: i % 5 !== 0, image: null, role: i === 0 ? 'admin' : 'user', banned: i % 12 === 0, banReason: i % 12 === 0 ? 'ToS violation' : null, banExpires: null, twoFactorEnabled: i % 3 === 0, createdAt: Date.now() - (40 - i) * 3 * 86400_000, updatedAt: Date.now() - i * 86400_000, lastSeen: Date.now() - Math.floor(Math.random() * 7 * 86400_000) }))
    case 'admin/accounts': return Array.from({ length: 55 }, (_, i) => ({ id: `acc-${i + 1}`, userId: `user-${(i % 40) + 1}`, userEmail: `trader${(i % 40) + 1}@example.com`, userName: ['Alex Rivera','Jamie Chen','Sam Patel','Morgan Kim','Taylor Liu'][i % 5], accountType: i % 7 === 0 ? 'demo' : 'prop', name: `Phase ${(i % 3) + 1} — Evaluation`, availableMargin: 200_000 - i * 1_000, reservedMargin: Math.random() * 10_000, totalMarginRequired: Math.random() * 8_000, injectedFunds: 0, baseCurrency: 'USD', defaultMarginMode: 'cross', isActive: i % 8 !== 0, isClosed: i % 8 === 0, accountStatus: ['active','active','active','funded','passed','breached'][i % 6], challengeTemplateId: `tmpl-${(i % 3) + 1}`, createdAt: Date.now() - (55 - i) * 2 * 86400_000, updatedAt: Date.now() - i * 3600_000 }))
    case 'admin/stats': return { total_users: 1_847, active_accounts: 1_243, funded_accounts: 38, breached_accounts: 94, total_deposited: 12_450_000, total_payouts_paid: 284_000, pending_payouts: 3, pending_payout_amount: 42_000, revenue_today: 18_600, revenue_month: 412_800, revenue_all_time: 3_140_000, new_signups_today: 23, new_signups_month: 612, churn_rate: 0.082, avg_account_lifetime_days: 47 }
    case 'admin/challenge-templates': return [ { id: 'tmpl-1', name: '100K Instant Funding', description: 'Single-phase instant funding', starting_balance: 100_000, base_currency: 'USD', entry_fee: 549, is_active: true, status: 'active', category: 'paid', account_count: 412, phase_sequence: [{ phase_number: 1, phase_type: 'evaluation', name: 'Phase 1', profit_target: 0.10, daily_loss_limit: 0.05, max_drawdown: 0.10, min_trading_days: 0, max_trading_days: null, profit_split: 0.80, leverage_limit: 100, news_trading_allowed: false, weekend_holding_allowed: true, martingale_detection_enabled: true }], created_at: Date.now() - 90 * 86400_000, updated_at: Date.now() - 5 * 86400_000 }, { id: 'tmpl-2', name: '50K Standard 2-Step', description: 'Classic two-phase evaluation', starting_balance: 50_000, base_currency: 'USD', entry_fee: 299, is_active: true, status: 'active', category: 'paid', account_count: 688, phase_sequence: [{ phase_number: 1, phase_type: 'evaluation', name: 'Phase 1', profit_target: 0.08, daily_loss_limit: 0.05, max_drawdown: 0.10, min_trading_days: 5, max_trading_days: 30, profit_split: 0, leverage_limit: 50, news_trading_allowed: false, weekend_holding_allowed: false, martingale_detection_enabled: true }, { phase_number: 2, phase_type: 'evaluation', name: 'Phase 2', profit_target: 0.05, daily_loss_limit: 0.05, max_drawdown: 0.10, min_trading_days: 5, max_trading_days: 60, profit_split: 0.80, leverage_limit: 50, news_trading_allowed: false, weekend_holding_allowed: false, martingale_detection_enabled: true }], created_at: Date.now() - 120 * 86400_000, updated_at: Date.now() - 10 * 86400_000 }, { id: 'tmpl-3', name: '200K Elite', description: 'For experienced traders', starting_balance: 200_000, base_currency: 'USD', entry_fee: 1_099, is_active: true, status: 'active', category: 'paid', account_count: 143, phase_sequence: [{ phase_number: 1, phase_type: 'evaluation', name: 'Phase 1', profit_target: 0.08, daily_loss_limit: 0.04, max_drawdown: 0.08, min_trading_days: 10, max_trading_days: 45, profit_split: 0, leverage_limit: 20, news_trading_allowed: false, weekend_holding_allowed: false, martingale_detection_enabled: true }, { phase_number: 2, phase_type: 'funded', name: 'Funded', profit_target: 0, daily_loss_limit: 0.04, max_drawdown: 0.08, min_trading_days: 0, max_trading_days: null, profit_split: 0.85, leverage_limit: 20, news_trading_allowed: false, weekend_holding_allowed: false, martingale_detection_enabled: true }], created_at: Date.now() - 60 * 86400_000, updated_at: Date.now() - 2 * 86400_000 } ]
    case 'admin/risk-metrics': return { total_open_exposure: 4_280_000, total_open_pnl: -38_400, max_single_account_exposure: 420_000, accounts_near_breach: 12, accounts_at_daily_limit: 4, breached_today: 2, largest_open_position: { symbol: 'BTC-USD', notional: 185_000, account_id: 'acc-7', direction: 'long' }, top_symbols_exposure: [{ symbol: 'BTC-USD', long_notional: 1_840_000, short_notional: 620_000, net: 1_220_000 }, { symbol: 'ETH-USD', long_notional: 980_000, short_notional: 440_000, net: 540_000 }, { symbol: 'SOL-USD', long_notional: 320_000, short_notional: 180_000, net: 140_000 }], drawdown_distribution: [{ bucket: '0–2%', count: 820 }, { bucket: '2–4%', count: 284 }, { bucket: '4–6%', count: 97 }, { bucket: '6–8%', count: 32 }, { bucket: '8–10%', count: 10 }] }
    default:
      if (path.startsWith('engine/candles') && req) {
        const symbol = req.nextUrl.searchParams.get('symbol') ?? 'BTC-USD'
        const interval = req.nextUrl.searchParams.get('interval') ?? '1h'
        const limit = Math.min(1000, parseInt(req.nextUrl.searchParams.get('limit') ?? '200'))
        return generateCandles(symbol, interval, limit)
      }
      return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const apiPath = path.map(s => s.split('?')[0]).join('/')

  const forceProxy = process.env.PROXY_TO_LIVE === 'true'

  // ── 1. Force proxy to live verticalprop.com backend ───────────────────────
  if (forceProxy) {
    const UPSTREAM = 'https://app.verticalprop.com'
    const { cookies } = await import('next/headers')
    const upstreamUrl = new URL(`/api/${apiPath}`, UPSTREAM)
    req.nextUrl.searchParams.forEach((v, k) => upstreamUrl.searchParams.set(k, v))
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')
    const headers = new Headers({ 'Content-Type': req.headers.get('content-type') ?? 'application/json', Cookie: cookieHeader, 'User-Agent': 'Mozilla/5.0', Origin: UPSTREAM, Referer: `${UPSTREAM}/` })
    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined
    const upstreamRes = await fetch(upstreamUrl.toString(), { method: req.method, headers, body })
    const responseData = await upstreamRes.text()
    return new NextResponse(responseData, { status: upstreamRes.status, headers: { 'Content-Type': upstreamRes.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' } })
  }

  // ── 2. Supabase mode ──────────────────────────────────────────────────────
  if (isSupabaseReady()) {
    try {
      // POST requests
      if (req.method === 'POST') {
        const supabaseResult = await handleSupabasePost(req, apiPath)
        if (supabaseResult) return supabaseResult
      }

      // GET requests
      if (req.method === 'GET') {
        const supabaseResult = await handleSupabase(req, apiPath)
        if (supabaseResult) return supabaseResult
        // null = fall through to mock (e.g. candles when external APIs fail)
      }
    } catch (err) {
      console.error('[proxy] Supabase error on', apiPath, err)
      // In production, never silently serve mock data after a real DB failure —
      // that would show fabricated positions/balances to authenticated users.
      // Return a 503 so the client can show a proper error state.
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Service temporarily unavailable. Please try again.' },
          { status: 503 }
        )
      }
      // In dev/test: fall through to mock so local development still works
    }
  }

  // ── 3. Mock mode (dev default or fallback) ────────────────────────────────

  // POST auth/sign-in/email
  if (req.method === 'POST' && apiPath === 'auth/sign-in/email') {
    const body = await req.json().catch(() => ({})) as { email?: string; password?: string }
    if (!body.email || !body.password || body.password.length < 6) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }
    const mockUser = { id: 'mock-user-id', name: body.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), email: body.email, emailVerified: true, image: null, role: body.email.includes('admin') ? 'admin' : 'user', banned: false, banReason: null, banExpires: null, twoFactorEnabled: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastSeen: Date.now() }
    const res = NextResponse.json({ token: `mock-token-${Date.now()}`, user: mockUser }, { status: 200 })
    res.cookies.set('vp-session', `mock-session-${Date.now()}`, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
    return res
  }

  if (req.method === 'POST' && apiPath === 'auth/sign-up/email') {
    const body = await req.json().catch(() => ({})) as { name?: string; email?: string; password?: string }
    if (!body.name || !body.email || !body.password || body.password.length < 8) {
      return NextResponse.json({ error: 'Please provide valid name, email, and password (min 8 chars).' }, { status: 400 })
    }
    return NextResponse.json({ user: { id: `user-${Date.now()}`, name: body.name, email: body.email, emailVerified: false, createdAt: new Date().toISOString() } }, { status: 201 })
  }

  if (req.method === 'POST' && apiPath === 'auth/sign-out') {
    const res = NextResponse.json({ success: true }, { status: 200 })
    res.cookies.set('vp-session', '', { maxAge: 0, path: '/' })
    return res
  }

  if (req.method === 'POST' && apiPath === 'engine/orders') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    return NextResponse.json({ id: orderId, account_id: body.account_id, symbol: body.symbol, direction: body.direction, order_type: body.order_type, quantity: body.quantity, leverage: body.leverage, margin_mode: body.margin_mode ?? 'cross', price: body.price ?? null, sl_price: body.sl_price ?? null, tp_price: body.tp_price ?? null, status: body.order_type === 'market' ? 'filled' : 'open', filled_quantity: body.order_type === 'market' ? body.quantity : 0, created_at: Date.now(), updated_at: Date.now() }, { status: 201 })
  }

  if (req.method === 'POST' && apiPath === 'engine/close-position') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    // Mock: simulate a close with a random small P&L
    const mockPnl = (Math.random() - 0.45) * 200
    return NextResponse.json({
      success:      true,
      position_id:  body.position_id,
      exit_price:   body.exit_price ?? 0,
      realized_pnl: mockPnl,
      close_fee:    0.5,
    })
  }

  const data = getMockData(apiPath, req)
  return NextResponse.json(data)
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
