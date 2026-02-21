/**
 * Engine write handlers — Supabase mode (POST)
 * Covers: engine/orders, engine/close-position, engine/partial-close, engine/cancel-order, engine/modify-sltp, engine/request-payout
 *
 * Security:
 *   - Zod validation on ALL inputs
 *   - Decimal.js for ALL financial math (no native float arithmetic on money)
 *   - Pre-trade risk checks (drawdown + daily loss) before execution
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { HandlerResult } from './shared'
import { toEpochMs } from './shared'
import Decimal from 'decimal.js'
import {
  PlaceOrderSchema,
  ClosePositionSchema,
  PartialCloseSchema,
  CancelOrderSchema,
  ModifySLTPSchema,
  RequestPayoutSchema,
  formatZodErrors,
} from '@/lib/validation'

// ─── Constants ─────────────────────────────────────────────────────────────

const FEE_RATE = new Decimal('0.0007')        // 0.07 % per side
const PROFIT_SPLIT = new Decimal('0.80')       // 80 % profit split for payouts
const MAX_POSITIONS = 15                       // max open positions per account
const MAX_PER_INSTRUMENT = 4                   // max positions per symbol
const DAILY_DRAWDOWN_PCT = new Decimal('0.05') // 5 % daily loss limit
const PRICE_STALE_MS = 30_000                  // 30 s — reject if price older
const RATE_LIMIT_MAX = 10                      // max orders per window
const RATE_LIMIT_WINDOW = 60_000               // 60 s window

// ─── Rate limiter (in-memory, per-user) ─────────────────────────────────────

const orderRateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = orderRateLimits.get(userId)
  if (!entry || now > entry.resetAt) {
    orderRateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

// ─── Decimal helpers ───────────────────────────────────────────────────────

/** Convert any DB value (string | number | null) to Decimal safely. */
function D(v: unknown): Decimal {
  if (v === null || v === undefined) return new Decimal(0)
  return new Decimal(String(v))
}

export async function handleEngineWrite(req: NextRequest, apiPath: string): Promise<HandlerResult> {
  const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')

  // ── engine/orders (POST) ────────────────────────────────────────────────────
  if (apiPath === 'engine/orders') {
    const t0 = Date.now()
    const body = await req.json().catch(() => ({}))

    // ── ZOD VALIDATION ─────────────────────────────────────────────────────
    const parsed = PlaceOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 }
      )
    }
    const input = parsed.data

    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── RATE LIMIT (10 orders / 60s) ─────────────────────────────────────
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({
        error: `Rate limit exceeded — maximum ${RATE_LIMIT_MAX} orders per minute. Please wait.`
      }, { status: 429 })
    }

    const admin = createSupabaseAdminClient()

    // Today midnight UTC — for daily drawdown calculation
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayStartMs = todayStart.getTime()
    const todayDateStr = todayStart.toISOString().slice(0, 10) // '2026-02-21'

    // ── Parallel DB queries (6 queries in one round-trip) ───────────────────
    // Query 6 (dayStartRes) fetches day_start_* columns — fails gracefully
    // if the migration hasn't been run yet. All 6 resolve (Supabase never rejects).
    const [accountRes, instrumentRes, priceRes, openPosRes, todayClosedRes, dayStartRes] = await Promise.all([
      admin.from('accounts').select('id, user_id, is_active, available_margin, starting_balance, net_worth, realized_pnl, account_status, total_margin_required')
        .eq('id', input.account_id).single(),
      admin.from('instruments').select('price_decimals, qty_decimals, max_leverage, min_order_size, margin_requirement')
        .eq('symbol', input.symbol).eq('is_active', true).single(),
      admin.from('price_cache').select('current_price, current_bid, current_ask, mark_price, last_updated')
        .eq('symbol', input.symbol).single(),
      admin.from('positions').select('id, symbol, entry_price, quantity, leverage, direction')
        .eq('account_id', input.account_id).eq('status', 'open'),
      admin.from('positions').select('realized_pnl, total_fees')
        .eq('account_id', input.account_id).eq('status', 'closed')
        .gte('exit_timestamp', todayStartMs),
      // Graceful: returns { data: null, error } if columns don't exist
      admin.from('accounts').select('day_start_balance, day_start_equity, day_start_date')
        .eq('id', input.account_id).single(),
    ])

    const account    = accountRes.data
    const instrument = instrumentRes.data
    const priceRow   = priceRes.data
    const openPositions = openPosRes.data ?? []
    const todayClosed   = todayClosedRes.data ?? []
    const dayStart      = dayStartRes.error ? null : dayStartRes.data  // null if migration not run

    // Validate account ownership
    if (!account || !account.is_active) {
      return NextResponse.json({ error: 'Account not found or inactive' }, { status: 404 })
    }
    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate instrument
    if (!instrument) {
      return NextResponse.json({ error: 'Unknown or inactive symbol' }, { status: 400 })
    }

    const qty = new Decimal(input.quantity)
    const rawLev = input.leverage
    const lev = Math.max(1, Math.min(rawLev, instrument.max_leverage ?? 100))

    if (qty.lt(instrument.min_order_size ?? 0)) {
      return NextResponse.json({
        error: `Minimum order size is ${instrument.min_order_size}`
      }, { status: 400 })
    }

    const execPrice = input.order_type === 'market'
      ? D(input.direction === 'long'
          ? (priceRow?.current_ask ?? priceRow?.current_price ?? input.price ?? 0)
          : (priceRow?.current_bid ?? priceRow?.current_price ?? input.price ?? 0))
      : D(input.price ?? 0)

    if (execPrice.lte(0)) {
      return NextResponse.json({ error: 'No price available for this symbol' }, { status: 422 })
    }

    // ── PRICE STALENESS CHECK (>30s = market may be closed) ──────────────
    if (priceRow?.last_updated) {
      const lastUpdate = typeof priceRow.last_updated === 'number'
        ? priceRow.last_updated
        : new Date(priceRow.last_updated).getTime()
      const ageMs = Date.now() - lastUpdate
      if (ageMs > PRICE_STALE_MS) {
        return NextResponse.json({
          error: `Price data is stale (${(ageMs / 1000).toFixed(0)}s old). Market may be closed.`
        }, { status: 422 })
      }
    }

    // ── POSITION LIMITS ─────────────────────────────────────────────────
    if (openPositions.length >= MAX_POSITIONS) {
      return NextResponse.json({
        error: `Maximum ${MAX_POSITIONS} open positions reached (current: ${openPositions.length}).`
      }, { status: 422 })
    }
    const sameSymbolCount = openPositions.filter(p => p.symbol === input.symbol).length
    if (sameSymbolCount >= MAX_PER_INSTRUMENT) {
      return NextResponse.json({
        error: `Maximum ${MAX_PER_INSTRUMENT} positions per instrument reached for ${input.symbol} (current: ${sameSymbolCount}).`
      }, { status: 422 })
    }

    // ── DECIMAL.JS FINANCIAL MATH ──────────────────────────────────────────
    const notional = execPrice.times(qty)
    const margin   = notional.div(lev)
    const fee      = notional.times(FEE_RATE)

    const availableMargin = D(account.available_margin)
    if (margin.gt(availableMargin)) {
      return NextResponse.json({
        error: `Insufficient margin — required: $${margin.toFixed(2)}, available: $${availableMargin.toFixed(2)}`
      }, { status: 422 })
    }

    // ── COMMISSION BALANCE CHECK ─────────────────────────────────────────
    const remainingAfterMargin = availableMargin.minus(margin)
    if (fee.gt(remainingAfterMargin)) {
      return NextResponse.json({
        error: `Insufficient balance to cover commission ($${fee.toFixed(2)}). Available after margin: $${remainingAfterMargin.toFixed(2)}`
      }, { status: 422 })
    }

    // ── PRE-TRADE RISK CHECK (max drawdown + daily drawdown) ────────────────
    if (account.account_status !== 'breached') {
      const startingBalance = D(account.starting_balance ?? account.net_worth)
      const netWorth = D(account.net_worth)

      // ─── Compute unrealized PnL from all open positions ───────────────
      // Fetch prices for all open-position symbols in one batch
      const uniqueSymbols = [...new Set(openPositions.map(p => p.symbol))]
      const priceMap = new Map<string, { bid: Decimal; ask: Decimal }>()
      // Current symbol already in priceRow
      if (priceRow) {
        priceMap.set(input.symbol, {
          bid: D(priceRow.current_bid ?? priceRow.current_price),
          ask: D(priceRow.current_ask ?? priceRow.current_price),
        })
      }
      // Fetch any additional symbols we don't have yet
      const missingSymbols = uniqueSymbols.filter(s => !priceMap.has(s))
      if (missingSymbols.length > 0) {
        const { data: extraPrices } = await admin.from('price_cache')
          .select('symbol, current_price, current_bid, current_ask')
          .in('symbol', missingSymbols)
        for (const p of extraPrices ?? []) {
          priceMap.set(p.symbol, {
            bid: D(p.current_bid ?? p.current_price),
            ask: D(p.current_ask ?? p.current_price),
          })
        }
      }

      let totalUnrealizedPnl = new Decimal(0)
      for (const pos of openPositions) {
        const prices = priceMap.get(pos.symbol)
        if (!prices) continue
        const entry = D(pos.entry_price)
        const exit  = pos.direction === 'long' ? prices.bid : prices.ask
        const diff  = pos.direction === 'long' ? exit.minus(entry) : entry.minus(exit)
        totalUnrealizedPnl = totalUnrealizedPnl.plus(diff.times(D(pos.quantity)).times(D(pos.leverage)))
      }

      const currentEquity = netWorth.plus(totalUnrealizedPnl)

      // ─── Max drawdown check (10% of starting balance) ─────────────────
      if (startingBalance.gt(0)) {
        const drawdownPct = startingBalance.minus(currentEquity).div(startingBalance)
        if (drawdownPct.gte(0.10)) {
          return NextResponse.json({
            error: `Max drawdown reached (${drawdownPct.times(100).toFixed(2)}%). Trading suspended.`
          }, { status: 422 })
        }
      }

      // ─── Daily drawdown check (5%) — equity-based with auto daily reset ─
      if (dayStart) {
        // ── Migration applied → use day_start columns ──────────────────
        const needsReset = dayStart.day_start_date !== todayDateStr

        if (needsReset) {
          // First request of the new trading day → snapshot current values
          // Fire-and-forget: don't block the order on this write
          admin.from('accounts').update({
            day_start_balance: netWorth.toNumber(),
            day_start_equity:  currentEquity.toNumber(),
            day_start_date:    todayDateStr,
          }).eq('id', input.account_id).then(() => {
            console.log(`[orders] daily reset for account ${input.account_id} → date=${todayDateStr}`)
          })
          // After reset, today's drawdown is 0 → skip check
        } else {
          // Same day — enforce daily drawdown
          const dayStartBal = D(dayStart.day_start_balance)
          const dayStartEq  = D(dayStart.day_start_equity)
          const dailyBase   = Decimal.max(dayStartBal, dayStartEq)

          if (dailyBase.gt(0)) {
            const dailyFloor    = dailyBase.times(new Decimal(1).minus(DAILY_DRAWDOWN_PCT))
            if (currentEquity.lte(dailyFloor)) {
              const dailyLossPct = dailyBase.minus(currentEquity).div(dailyBase).times(100)
              return NextResponse.json({
                error: `Daily drawdown limit reached (${dailyLossPct.toFixed(2)}% loss today, max ${DAILY_DRAWDOWN_PCT.times(100)}%). Equity: $${currentEquity.toFixed(2)}, Floor: $${dailyFloor.toFixed(2)}.`
              }, { status: 422 })
            }
          }
        }
      } else {
        // ── Fallback: migration not applied → sum today's closed PnL ───
        const todayRealizedLoss = todayClosed.reduce(
          (sum, p) => sum.plus(D(p.realized_pnl)),
          new Decimal(0)
        )
        const dailyLossLimit = startingBalance.times(DAILY_DRAWDOWN_PCT)
        if (todayRealizedLoss.isNeg() && todayRealizedLoss.abs().gte(dailyLossLimit)) {
          const dailyLossPct = todayRealizedLoss.abs().div(startingBalance).times(100)
          return NextResponse.json({
            error: `Daily drawdown limit reached (${dailyLossPct.toFixed(2)}% loss today, max ${DAILY_DRAWDOWN_PCT.times(100)}%). Trading suspended until tomorrow.`
          }, { status: 422 })
        }
      }
    }

    const liqPct = new Decimal(1).div(lev)
    const liquidation_price = input.direction === 'long'
      ? execPrice.times(new Decimal(1).minus(liqPct))
      : execPrice.times(new Decimal(1).plus(liqPct))

    if (input.order_type === 'market') {
      // Atomic market order via Postgres RPC
      const { data: rpcResult, error: rpcErr } = await admin.rpc('place_market_order', {
        p_account_id:        input.account_id,
        p_user_id:           user.id,
        p_symbol:            input.symbol,
        p_direction:         input.direction,
        p_margin_mode:       input.margin_mode,
        p_quantity:          qty.toNumber(),
        p_leverage:          lev,
        p_exec_price:        execPrice.toNumber(),
        p_margin:            margin.toNumber(),
        p_fee:               fee.toNumber(),
        p_liquidation_price: liquidation_price.toNumber(),
        p_instrument_config: String(input.symbol),
        p_instrument_price:  String(execPrice.toNumber()),
        p_sl_price:          input.sl_price ? Number(input.sl_price) : null,
        p_tp_price:          input.tp_price ? Number(input.tp_price) : null,
      })

      if (rpcErr || !rpcResult) {
        console.error('[orders POST] place_market_order RPC error:', rpcErr)
        const hint = rpcErr?.hint ?? rpcErr?.message ?? ''
        if (hint.includes('insufficient_margin')) {
          return NextResponse.json({ error: 'Insufficient margin for this order' }, { status: 422 })
        }
        if (hint.includes('account_not_found')) {
          return NextResponse.json({ error: 'Account not found or inactive' }, { status: 404 })
        }
        return NextResponse.json({ error: 'Failed to open position. Please try again.' }, { status: 500 })
      }

      console.log(`[orders POST] market fill: ${Date.now() - t0}ms`)
      return NextResponse.json({ ...rpcResult, status: 'filled' }, { status: 201 })
    }

    // ── Limit / stop order ────────────────────────────────────────────────────
    const { data: order, error: ordErr } = await admin
      .from('orders')
      .insert({
        account_id:      input.account_id,
        symbol:          input.symbol,
        direction:       input.direction,
        order_type:      input.order_type,
        quantity:        qty.toNumber(),
        leverage:        lev,
        price:           input.order_type === 'limit' ? (input.price ?? null) : null,
        stop_price:      input.order_type === 'stop'  ? (input.price ?? null) : null,
        sl_price:        input.sl_price ?? null,
        tp_price:        input.tp_price ?? null,
        margin_mode:     input.margin_mode,
        status:          'pending',
        filled_quantity: 0,
      })
      .select()
      .single()

    if (ordErr || !order) {
      console.error('[orders POST] order insert error:', ordErr)
      return NextResponse.json({ error: 'Failed to place order. Please try again.' }, { status: 500 })
    }

    await admin.from('activity').insert({
      account_id: input.account_id,
      type:  'order',
      title: `${input.order_type === 'limit' ? 'Limit' : 'Stop'} ${input.direction} ${input.symbol}`,
      sub:   `${qty.toNumber()} @ $${D(input.price).toFixed(instrument?.price_decimals ?? 2)} · ${lev}x`,
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

  // ── engine/close-position ───────────────────────────────────────────────────
  if (apiPath === 'engine/close-position') {
    const t0 = Date.now()
    const body = await req.json().catch(() => ({}))

    // ── ZOD VALIDATION ────────────────────────────────────────────────────
    const parsed = ClosePositionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
    }
    const { position_id: positionId } = parsed.data

    const admin = createSupabaseAdminClient()

    // ── PARALLEL: auth + position lookup at the same time ──
    const [authResult, posResult] = await Promise.all([
      createSupabaseServerClient().then(sb => sb.auth.getUser()),
      admin.from('positions')
        .select('id, account_id, symbol, direction, quantity, leverage, entry_price, isolated_margin, trade_fees, status')
        .eq('id', positionId).eq('status', 'open').single(),
    ])

    const user = authResult.data?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const pos = posResult.data
    if (!pos) {
      return NextResponse.json({ error: 'Position not found or already closed' }, { status: 404 })
    }

    // ── PARALLEL: verify ownership + fetch price ──
    const [ownerRes, priceRes] = await Promise.all([
      admin.from('accounts').select('id, user_id').eq('id', pos.account_id).single(),
      admin.from('price_cache').select('current_price, current_bid, current_ask')
        .eq('symbol', pos.symbol).single(),
    ])

    if (!ownerRes.data || ownerRes.data.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const priceRow = priceRes.data
    console.log(`[close-position] lookup: ${Date.now() - t0}ms`)

    // ── DECIMAL.JS PnL CALCULATION ────────────────────────────────────────
    const entryPrice = D(pos.entry_price)
    const exitPrice = pos.direction === 'long'
      ? D(priceRow?.current_bid ?? priceRow?.current_price ?? pos.entry_price)
      : D(priceRow?.current_ask ?? priceRow?.current_price ?? pos.entry_price)
    const quantity = D(pos.quantity)
    const leverage = D(pos.leverage)

    const priceDiff = pos.direction === 'long'
      ? exitPrice.minus(entryPrice)
      : entryPrice.minus(exitPrice)
    const realizedPnl = priceDiff.times(quantity).times(leverage)
    const closeFee    = exitPrice.times(quantity).times(FEE_RATE)

    const now = Date.now()

    const { error: closeErr } = await admin
      .from('positions')
      .update({
        status:       'closed',
        close_reason: 'manual',
        exit_price:   exitPrice.toNumber(),
        exit_timestamp: now,
        realized_pnl: realizedPnl.toNumber(),
        total_fees:   D(pos.trade_fees).plus(closeFee).toNumber(),
        updated_at:   new Date().toISOString(),
      })
      .eq('id', positionId)

    if (closeErr) {
      console.error('[close-position] update error:', closeErr)
      return NextResponse.json({ error: 'Failed to close position. Please try again.' }, { status: 500 })
    }

    // ── PARALLEL: cancel SL/TP + fetch account + fetch instrument (all at once) ──
    const [, acctRes, instrRes] = await Promise.all([
      admin.from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('position_id', positionId)
        .in('status', ['pending', 'partial']),
      admin.from('accounts')
        .select('available_margin, realized_pnl, total_margin_required, net_worth, total_pnl')
        .eq('id', pos.account_id).single(),
      admin.from('instruments').select('price_decimals').eq('symbol', pos.symbol).single(),
    ])

    const acct = acctRes.data
    const pDec = instrRes.data?.price_decimals ?? 2

    // Update account + equity history + activity in parallel
    const pnlStr = realizedPnl.gte(0) ? `+$${realizedPnl.toFixed(2)}` : `-$${realizedPnl.abs().toFixed(2)}`
    const postCloseOps: PromiseLike<unknown>[] = []

    if (acct) {
      const isolatedMargin = D(pos.isolated_margin)
      const newAvailableMargin = D(acct.available_margin).plus(isolatedMargin).plus(realizedPnl).minus(closeFee)
      const newTotalMarginReq  = Decimal.max(0, D(acct.total_margin_required).minus(isolatedMargin))
      const newRealizedPnl     = D(acct.realized_pnl).plus(realizedPnl)
      const newTotalPnl        = D(acct.total_pnl).plus(realizedPnl)
      const newNetWorth        = D(acct.net_worth).plus(realizedPnl).minus(closeFee)

      postCloseOps.push(
        admin.from('accounts').update({
          available_margin: newAvailableMargin.toNumber(), total_margin_required: newTotalMarginReq.toNumber(),
          realized_pnl: newRealizedPnl.toNumber(), total_pnl: newTotalPnl.toNumber(), net_worth: newNetWorth.toNumber(),
          updated_at: new Date().toISOString(),
        }).eq('id', pos.account_id).then(),
        admin.from('equity_history').insert({
          account_id: pos.account_id, ts: now,
          equity: newAvailableMargin.toNumber(), pnl: realizedPnl.toNumber(),
        }).then(),
      )
    }

    postCloseOps.push(
      admin.from('activity').insert({
        account_id: pos.account_id, type: 'closed',
        title: `${pos.direction === 'long' ? 'Long' : 'Short'} ${pos.symbol} closed`,
        sub: `${quantity.toNumber()} @ $${exitPrice.toFixed(pDec)} · ${pnlStr}`,
        ts: now, pnl: realizedPnl.toNumber(),
      }).then()
    )

    await Promise.all(postCloseOps)

    console.log(`[close-position] total: ${Date.now() - t0}ms`)
    return NextResponse.json({
      success:       true,
      position_id:   positionId,
      exit_price:    exitPrice.toNumber(),
      realized_pnl:  realizedPnl.toNumber(),
      close_fee:     closeFee.toNumber(),
    })
  }

  // ── engine/partial-close ────────────────────────────────────────────────────
  if (apiPath === 'engine/partial-close') {
    const body = await req.json().catch(() => ({}))

    // ── ZOD VALIDATION ────────────────────────────────────────────────────
    const parsed = PartialCloseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
    }
    const { position_id: positionId, quantity: closeQtyRaw } = parsed.data
    const closeQty = new Decimal(closeQtyRaw)

    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createSupabaseAdminClient()

    const { data: pos } = await admin
      .from('positions')
      .select('id, account_id, symbol, direction, quantity, leverage, entry_price, isolated_margin, trade_fees, status')
      .eq('id', positionId)
      .eq('status', 'open')
      .single()

    if (!pos) {
      return NextResponse.json({ error: 'Position not found or already closed' }, { status: 404 })
    }

    const [posAccountRes, priceRes2] = await Promise.all([
      admin.from('accounts').select('id, user_id, available_margin, realized_pnl')
        .eq('id', pos.account_id).single(),
      admin.from('price_cache').select('current_price, current_bid, current_ask')
        .eq('symbol', pos.symbol).single(),
    ])

    const posAccount = posAccountRes.data
    if (!posAccount || posAccount.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const totalQty = D(pos.quantity)
    if (closeQty.gte(totalQty)) {
      return NextResponse.json({ error: 'Use close-position to close all. quantity must be less than full position size.' }, { status: 400 })
    }

    const priceRow = priceRes2.data

    // ── DECIMAL.JS FINANCIAL MATH ─────────────────────────────────────────
    const entryPrice = D(pos.entry_price)
    const exitPrice = pos.direction === 'long'
      ? D(priceRow?.current_bid ?? priceRow?.current_price ?? pos.entry_price)
      : D(priceRow?.current_ask ?? priceRow?.current_price ?? pos.entry_price)
    const leverage = D(pos.leverage)

    const priceDiff     = pos.direction === 'long' ? exitPrice.minus(entryPrice) : entryPrice.minus(exitPrice)
    const partialPnl    = priceDiff.times(closeQty).times(leverage)
    const closeFee      = exitPrice.times(closeQty).times(FEE_RATE)
    const marginFraction = closeQty.div(totalQty)
    const isolatedMargin = D(pos.isolated_margin)
    const releasedMargin = isolatedMargin.times(marginFraction)
    const remainingQty   = totalQty.minus(closeQty)

    const now = Date.now()

    const { error: updateErr } = await admin
      .from('positions')
      .update({
        quantity:        remainingQty.toNumber(),
        isolated_margin: isolatedMargin.minus(releasedMargin).toNumber(),
        realized_pnl:    partialPnl.toNumber(),
        total_fees:      D(pos.trade_fees).plus(closeFee).toNumber(),
        updated_at:      new Date().toISOString(),
      })
      .eq('id', positionId)

    if (updateErr) {
      console.error('[partial-close] update error:', updateErr)
      return NextResponse.json({ error: 'Failed to partially close position. Please try again.' }, { status: 500 })
    }

    const { data: acctPartial } = await admin
      .from('accounts')
      .select('available_margin, realized_pnl, total_margin_required, net_worth, total_pnl')
      .eq('id', pos.account_id)
      .single()

    if (acctPartial) {
      const newAvailableMargin = D(acctPartial.available_margin).plus(releasedMargin).plus(partialPnl).minus(closeFee)
      const newTotalMarginReq  = Decimal.max(0, D(acctPartial.total_margin_required).minus(releasedMargin))
      const newRealizedPnl     = D(acctPartial.realized_pnl).plus(partialPnl)
      const newTotalPnl        = D(acctPartial.total_pnl).plus(partialPnl)
      const newNetWorth        = D(acctPartial.net_worth).plus(partialPnl).minus(closeFee)

      await admin
        .from('accounts')
        .update({
          available_margin:      newAvailableMargin.toNumber(),
          total_margin_required: newTotalMarginReq.toNumber(),
          realized_pnl:          newRealizedPnl.toNumber(),
          total_pnl:             newTotalPnl.toNumber(),
          net_worth:             newNetWorth.toNumber(),
          updated_at:            new Date().toISOString(),
        })
        .eq('id', pos.account_id)
    }

    const baseMargin = acctPartial
      ? D(acctPartial.available_margin).plus(releasedMargin).plus(partialPnl).minus(closeFee)
      : D(posAccount.available_margin).plus(releasedMargin).plus(partialPnl).minus(closeFee)
    await admin.from('equity_history').insert({
      account_id: pos.account_id,
      ts:         now,
      equity:     baseMargin.toNumber(),
      pnl:        partialPnl.toNumber(),
    })

    const { data: instr } = await admin
      .from('instruments').select('price_decimals').eq('symbol', pos.symbol).single()
    const pDec   = instr?.price_decimals ?? 2
    const pnlStr = partialPnl.gte(0) ? `+$${partialPnl.toFixed(2)}` : `-$${partialPnl.abs().toFixed(2)}`
    await admin.from('activity').insert({
      account_id: pos.account_id,
      type:       'closed',
      title:      `${pos.direction === 'long' ? 'Long' : 'Short'} ${pos.symbol} partial close`,
      sub:        `${closeQty.toNumber()} lots @ $${exitPrice.toFixed(pDec)} · ${pnlStr}`,
      ts:         now,
      pnl:        partialPnl.toNumber(),
    })

    return NextResponse.json({
      success:        true,
      position_id:    positionId,
      closed_quantity: closeQty.toNumber(),
      remaining_qty:  remainingQty.toNumber(),
      exit_price:     exitPrice.toNumber(),
      realized_pnl:   partialPnl.toNumber(),
      close_fee:      closeFee.toNumber(),
    })
  }

  // ── engine/cancel-order ─────────────────────────────────────────────────────
  if (apiPath === 'engine/cancel-order') {
    const body = await req.json().catch(() => ({}))

    // ── ZOD VALIDATION ────────────────────────────────────────────────────
    const parsed = CancelOrderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
    }
    const { order_id: orderId } = parsed.data

    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createSupabaseAdminClient()

    const { data: order } = await admin
      .from('orders')
      .select('id, account_id, status')
      .eq('id', orderId)
      .in('status', ['pending', 'partial'])
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found or already cancelled/filled' }, { status: 404 })
    }

    const { data: orderAccount } = await admin
      .from('accounts').select('id, user_id').eq('id', order.account_id).single()
    if (!orderAccount || orderAccount.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: cancelErr } = await admin
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (cancelErr) {
      console.error('[cancel-order] update error:', cancelErr)
      return NextResponse.json({ error: 'Failed to cancel order. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, order_id: orderId })
  }

  // ── engine/modify-sltp (POST) ─────────────────────────────────────────────
  if (apiPath === 'engine/modify-sltp') {
    const body = await req.json().catch(() => ({}))

    // ── ZOD VALIDATION ──────────────────────────────────────────────────────
    const parsed = ModifySLTPSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
    }
    const input = parsed.data

    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createSupabaseAdminClient()

    // ── Fetch position + verify ownership ───────────────────────────────────
    const { data: pos } = await admin.from('positions')
      .select('id, account_id, symbol, direction, entry_price, status')
      .eq('id', input.position_id)
      .single()

    if (!pos) return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    if (pos.status !== 'open') return NextResponse.json({ error: 'Position is not open' }, { status: 400 })

    // Verify user owns this account
    const { data: acct } = await admin.from('accounts')
      .select('user_id')
      .eq('id', pos.account_id)
      .single()
    if (!acct || acct.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Get current price for validation ────────────────────────────────────
    const { data: priceRow } = await admin.from('price_cache')
      .select('current_price')
      .eq('symbol', pos.symbol)
      .single()
    const currentPrice = priceRow ? Number(priceRow.current_price) : Number(pos.entry_price)

    // ── Validate SL/TP direction ────────────────────────────────────────────
    if (input.sl_price !== undefined && input.sl_price !== null) {
      if (pos.direction === 'long' && input.sl_price >= currentPrice) {
        return NextResponse.json({ error: `SL for long must be below current price ($${currentPrice.toFixed(2)})` }, { status: 400 })
      }
      if (pos.direction === 'short' && input.sl_price <= currentPrice) {
        return NextResponse.json({ error: `SL for short must be above current price ($${currentPrice.toFixed(2)})` }, { status: 400 })
      }
    }
    if (input.tp_price !== undefined && input.tp_price !== null) {
      if (pos.direction === 'long' && input.tp_price <= currentPrice) {
        return NextResponse.json({ error: `TP for long must be above current price ($${currentPrice.toFixed(2)})` }, { status: 400 })
      }
      if (pos.direction === 'short' && input.tp_price >= currentPrice) {
        return NextResponse.json({ error: `TP for short must be below current price ($${currentPrice.toFixed(2)})` }, { status: 400 })
      }
    }

    const now = new Date().toISOString()

    // ── Handle SL modification ──────────────────────────────────────────────
    if (input.sl_price !== undefined) {
      // Find existing SL order (stop type linked to this position)
      const { data: existingSL } = await admin.from('orders')
        .select('id')
        .eq('position_id', input.position_id)
        .eq('order_type', 'stop')
        .eq('status', 'pending')
        .limit(1)
        .single()

      if (input.sl_price === null) {
        // Remove SL
        if (existingSL) {
          await admin.from('orders').update({ status: 'cancelled', updated_at: now }).eq('id', existingSL.id)
        }
      } else if (existingSL) {
        // Update existing SL
        await admin.from('orders').update({ stop_price: input.sl_price, updated_at: now }).eq('id', existingSL.id)
      } else {
        // Create new SL order
        const closeDir = pos.direction === 'long' ? 'short' : 'long'
        const { data: posDetail } = await admin.from('positions')
          .select('quantity, leverage')
          .eq('id', input.position_id)
          .single()

        await admin.from('orders').insert({
          account_id: pos.account_id,
          position_id: input.position_id,
          symbol: pos.symbol,
          direction: closeDir,
          order_type: 'stop',
          stop_price: input.sl_price,
          quantity: posDetail?.quantity ?? 0,
          leverage: posDetail?.leverage ?? 1,
          status: 'pending',
        })
      }
    }

    // ── Handle TP modification ──────────────────────────────────────────────
    if (input.tp_price !== undefined) {
      // Find existing TP order (limit type linked to this position)
      const { data: existingTP } = await admin.from('orders')
        .select('id')
        .eq('position_id', input.position_id)
        .eq('order_type', 'limit')
        .eq('status', 'pending')
        .limit(1)
        .single()

      if (input.tp_price === null) {
        // Remove TP
        if (existingTP) {
          await admin.from('orders').update({ status: 'cancelled', updated_at: now }).eq('id', existingTP.id)
        }
      } else if (existingTP) {
        // Update existing TP
        await admin.from('orders').update({ price: input.tp_price, updated_at: now }).eq('id', existingTP.id)
      } else {
        // Create new TP order
        const closeDir = pos.direction === 'long' ? 'short' : 'long'
        const { data: posDetail } = await admin.from('positions')
          .select('quantity, leverage')
          .eq('id', input.position_id)
          .single()

        await admin.from('orders').insert({
          account_id: pos.account_id,
          position_id: input.position_id,
          symbol: pos.symbol,
          direction: closeDir,
          order_type: 'limit',
          price: input.tp_price,
          quantity: posDetail?.quantity ?? 0,
          leverage: posDetail?.leverage ?? 1,
          status: 'pending',
        })
      }
    }

    return NextResponse.json({ success: true })
  }

  // ── engine/request-payout ───────────────────────────────────────────────────
  if (apiPath === 'engine/request-payout') {
    const body = await req.json().catch(() => ({}))

    // ── ZOD VALIDATION ────────────────────────────────────────────────────
    const parsed = RequestPayoutSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 })
    }
    const input = parsed.data

    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify account ownership (admin bypasses RLS)
    const admin = createSupabaseAdminClient()
    const { data: account } = await admin
      .from('accounts')
      .select('id, user_id, realized_pnl, starting_balance, account_status')
      .eq('id', input.account_id)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (account.account_status !== 'funded') {
      return NextResponse.json({ error: 'Payouts are only available for funded accounts' }, { status: 422 })
    }

    // ── DECIMAL.JS: profit split calculation ──────────────────────────────
    const amount = new Decimal(input.amount)
    const availableProfit = Decimal.max(0, D(account.realized_pnl).times(PROFIT_SPLIT))
    if (amount.gt(availableProfit)) {
      return NextResponse.json({
        error: `Amount exceeds available payout balance ($${availableProfit.toFixed(2)})`
      }, { status: 422 })
    }

    const now = Date.now()

    const { data: payout, error: insertErr } = await admin
      .from('payouts')
      .insert({
        account_id:      input.account_id,
        user_id:         user.id,
        amount:          amount.toNumber(),
        status:          'pending',
        method:          input.method,
        wallet_address:  input.wallet_address ?? null,
        tx_hash:         null,
        admin_note:      null,
        requested_at:    now,
        processed_at:    null,
      })
      .select()
      .single()

    if (insertErr || !payout) {
      console.error('[request-payout] insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to submit payout request' }, { status: 500 })
    }

    await admin.from('activity').insert({
      account_id: input.account_id,
      type:  'payout',
      title: 'Payout requested',
      sub:   `$${amount.toFixed(2)} via ${input.method}`,
      ts:    now,
      pnl:   null,
    })

    return NextResponse.json({
      ...payout,
      requested_at: now,
      processed_at: null,
      created_at: toEpochMs(payout.created_at),
      updated_at: toEpochMs(payout.updated_at),
    }, { status: 201 })
  }

  return null
}
