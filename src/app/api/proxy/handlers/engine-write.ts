/**
 * Engine write handlers — Supabase mode (POST)
 * Covers: engine/orders, engine/close-position, engine/partial-close, engine/cancel-order
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { HandlerResult } from './shared'
import { toEpochMs } from './shared'

export async function handleEngineWrite(req: NextRequest, apiPath: string): Promise<HandlerResult> {
  const { createSupabaseServerClient, createSupabaseAdminClient } = await import('@/lib/supabase/server')

  // ── engine/orders (POST) ────────────────────────────────────────────────────
  if (apiPath === 'engine/orders') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Strict server-side input validation ─────────────────────────────────
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
      return NextResponse.json({ error: 'leverage must be >= 1' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()

    // Validate account ownership
    const { data: account } = await supabase
      .from('accounts')
      .select('id, user_id, is_active, available_margin')
      .eq('id', body.account_id)
      .single()
    if (!account || !account.is_active) {
      return NextResponse.json({ error: 'Account not found or inactive' }, { status: 404 })
    }
    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify symbol exists
    const { data: instrument } = await admin
      .from('instruments')
      .select('price_decimals, qty_decimals, max_leverage, min_order_size, margin_requirement')
      .eq('symbol', body.symbol)
      .eq('is_active', true)
      .single()
    if (!instrument) {
      return NextResponse.json({ error: 'Unknown or inactive symbol' }, { status: 400 })
    }

    const lev = Math.max(1, Math.min(rawLev, instrument.max_leverage ?? 100))

    if (qty < (instrument.min_order_size ?? 0)) {
      return NextResponse.json({
        error: `Minimum order size is ${instrument.min_order_size}`
      }, { status: 400 })
    }

    // Get current price
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
    const fee      = notional * 0.0007

    if (!Number.isFinite(notional) || !Number.isFinite(margin)) {
      return NextResponse.json({ error: 'Order size too large' }, { status: 400 })
    }

    if (margin > Number(account.available_margin)) {
      return NextResponse.json({ error: 'Insufficient margin for this order' }, { status: 422 })
    }

    const liqPct = 1 / lev
    const liquidation_price = body.direction === 'long'
      ? execPrice * (1 - liqPct)
      : execPrice * (1 + liqPct)

    if (body.order_type === 'market') {
      // Atomic market order via Postgres RPC
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
        const hint = rpcErr?.hint ?? rpcErr?.message ?? ''
        if (hint.includes('insufficient_margin')) {
          return NextResponse.json({ error: 'Insufficient margin for this order' }, { status: 422 })
        }
        if (hint.includes('account_not_found')) {
          return NextResponse.json({ error: 'Account not found or inactive' }, { status: 404 })
        }
        return NextResponse.json({ error: 'Failed to open position. Please try again.' }, { status: 500 })
      }

      return NextResponse.json({ ...rpcResult, status: 'filled' }, { status: 201 })
    }

    // ── Limit / stop order ────────────────────────────────────────────────────
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
      console.error('[orders POST] order insert error:', ordErr)
      return NextResponse.json({ error: 'Failed to place order. Please try again.' }, { status: 500 })
    }

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

  // ── engine/close-position ───────────────────────────────────────────────────
  if (apiPath === 'engine/close-position') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!body.position_id || typeof body.position_id !== 'string') {
      return NextResponse.json({ error: 'Invalid position_id' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    const positionId = body.position_id as string

    const { data: pos } = await supabase
      .from('positions')
      .select('id, account_id, symbol, direction, quantity, leverage, entry_price, isolated_margin, trade_fees, status')
      .eq('id', positionId)
      .eq('status', 'open')
      .single()

    if (!pos) {
      return NextResponse.json({ error: 'Position not found or already closed' }, { status: 404 })
    }

    const { data: posAccount } = await supabase
      .from('accounts').select('id, user_id').eq('id', pos.account_id).single()
    if (!posAccount || posAccount.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: priceRow } = await admin
      .from('price_cache')
      .select('current_price, current_bid, current_ask')
      .eq('symbol', pos.symbol)
      .single()

    const exitPrice = pos.direction === 'long'
      ? (priceRow?.current_bid ?? priceRow?.current_price ?? Number(pos.entry_price))
      : (priceRow?.current_ask ?? priceRow?.current_price ?? Number(pos.entry_price))

    const priceDiff  = pos.direction === 'long'
      ? exitPrice - Number(pos.entry_price)
      : Number(pos.entry_price) - exitPrice
    const realizedPnl = priceDiff * Number(pos.quantity) * Number(pos.leverage)
    const closeFee    = exitPrice * Number(pos.quantity) * 0.0007

    const now = Date.now()

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
      console.error('[close-position] update error:', closeErr)
      return NextResponse.json({ error: 'Failed to close position. Please try again.' }, { status: 500 })
    }

    // Cancel linked SL/TP orders
    await admin
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('position_id', positionId)
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

  // ── engine/partial-close ────────────────────────────────────────────────────
  if (apiPath === 'engine/partial-close') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!body.position_id || typeof body.position_id !== 'string') {
      return NextResponse.json({ error: 'Invalid position_id' }, { status: 400 })
    }

    const closeQty = Number(body.quantity)
    if (!Number.isFinite(closeQty) || closeQty <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive number' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    const positionId = body.position_id as string

    const { data: pos } = await supabase
      .from('positions')
      .select('id, account_id, symbol, direction, quantity, leverage, entry_price, isolated_margin, trade_fees, status')
      .eq('id', positionId)
      .eq('status', 'open')
      .single()

    if (!pos) {
      return NextResponse.json({ error: 'Position not found or already closed' }, { status: 404 })
    }

    const { data: posAccount } = await supabase
      .from('accounts')
      .select('id, user_id, available_margin, realized_pnl')
      .eq('id', pos.account_id)
      .single()
    if (!posAccount || posAccount.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const totalQty = Number(pos.quantity)
    if (closeQty >= totalQty) {
      return NextResponse.json({ error: 'Use close-position to close all. quantity must be less than full position size.' }, { status: 400 })
    }

    const { data: priceRow } = await admin
      .from('price_cache')
      .select('current_price, current_bid, current_ask')
      .eq('symbol', pos.symbol)
      .single()

    const exitPrice = pos.direction === 'long'
      ? (priceRow?.current_bid ?? priceRow?.current_price ?? Number(pos.entry_price))
      : (priceRow?.current_ask ?? priceRow?.current_price ?? Number(pos.entry_price))

    const priceDiff    = pos.direction === 'long'
      ? exitPrice - Number(pos.entry_price)
      : Number(pos.entry_price) - exitPrice
    const partialPnl   = priceDiff * closeQty * Number(pos.leverage)
    const closeFee     = exitPrice * closeQty * 0.0007

    const marginFraction = closeQty / totalQty
    const releasedMargin = Number(pos.isolated_margin) * marginFraction
    const remainingQty   = totalQty - closeQty

    const now = Date.now()

    const { error: updateErr } = await admin
      .from('positions')
      .update({
        quantity:        remainingQty,
        isolated_margin: Number(pos.isolated_margin) - releasedMargin,
        realized_pnl:    partialPnl,
        total_fees:      Number(pos.trade_fees) + closeFee,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', positionId)

    if (updateErr) {
      console.error('[partial-close] update error:', updateErr)
      return NextResponse.json({ error: 'Failed to partially close position. Please try again.' }, { status: 500 })
    }

    const { data: acctPartial } = await admin
      .from('accounts')
      .select('available_margin, realized_pnl, total_margin_required')
      .eq('id', pos.account_id)
      .single()

    if (acctPartial) {
      await admin
        .from('accounts')
        .update({
          available_margin:      Number(acctPartial.available_margin) + releasedMargin + partialPnl - closeFee,
          total_margin_required: Math.max(0, Number(acctPartial.total_margin_required) - releasedMargin),
          realized_pnl:          Number(acctPartial.realized_pnl) + partialPnl,
          updated_at:            new Date().toISOString(),
        })
        .eq('id', pos.account_id)
    }

    const baseMargin = acctPartial
      ? Number(acctPartial.available_margin) + releasedMargin + partialPnl - closeFee
      : Number(posAccount.available_margin) + releasedMargin + partialPnl - closeFee
    await admin.from('equity_history').insert({
      account_id: pos.account_id,
      ts:         now,
      equity:     baseMargin,
      pnl:        partialPnl,
    })

    const { data: instr } = await admin
      .from('instruments').select('price_decimals').eq('symbol', pos.symbol).single()
    const pDec   = instr?.price_decimals ?? 2
    const pnlStr = partialPnl >= 0 ? `+$${partialPnl.toFixed(2)}` : `-$${Math.abs(partialPnl).toFixed(2)}`
    await admin.from('activity').insert({
      account_id: pos.account_id,
      type:       'closed',
      title:      `${pos.direction === 'long' ? 'Long' : 'Short'} ${pos.symbol} partial close`,
      sub:        `${closeQty} lots @ $${exitPrice.toFixed(pDec)} · ${pnlStr}`,
      ts:         now,
      pnl:        partialPnl,
    })

    return NextResponse.json({
      success:        true,
      position_id:    positionId,
      closed_quantity: closeQty,
      remaining_qty:  remainingQty,
      exit_price:     exitPrice,
      realized_pnl:   partialPnl,
      close_fee:      closeFee,
    })
  }

  // ── engine/cancel-order ─────────────────────────────────────────────────────
  if (apiPath === 'engine/cancel-order') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!body.order_id || typeof body.order_id !== 'string') {
      return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 })
    }

    const admin = createSupabaseAdminClient()
    const orderId = body.order_id as string

    const { data: order } = await supabase
      .from('orders')
      .select('id, account_id, status')
      .eq('id', orderId)
      .in('status', ['pending', 'partial'])
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found or already cancelled/filled' }, { status: 404 })
    }

    const { data: orderAccount } = await supabase
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

  return null
}
