/**
 * SSE Price Stream — pushes live price ticks every 500ms.
 *
 * Two modes:
 *
 * 1. SUPABASE MODE (Supabase configured):
 *    → Connects to Binance WebSocket for real-time crypto prices
 *    → Falls back to Supabase price_cache for forex / unlisted symbols
 *    → Writes Binance prices to price_cache every 5s for persistence
 *    → Runs a lightweight SL/TP matching engine on real prices
 *
 * 2. MOCK MODE (no Supabase):
 *    → Uses the existing mock engine with random-walk prices
 *    → Same behavior as before
 */

import { isServerSupabaseConfigured } from '@/lib/supabase/config'
import { getBinancePrices, FALLBACK_SYMBOLS } from '@/lib/binance-prices'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ─── Supabase price_cache read (for forex fallback) ─────────────────────────

let lastForexFetch = 0
let forexCache: Record<string, number> = {}

async function getForexPrices(): Promise<Record<string, number>> {
  // Refresh forex from Supabase every 30s
  if (Date.now() - lastForexFetch < 30_000 && Object.keys(forexCache).length > 0) {
    return forexCache
  }

  try {
    const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
    const admin = createSupabaseAdminClient()
    const { data } = await admin
      .from('price_cache')
      .select('symbol, current_price')
      .in('symbol', FALLBACK_SYMBOLS)

    if (data) {
      forexCache = {}
      for (const row of data) {
        forexCache[row.symbol] = Number(row.current_price)
      }
      lastForexFetch = Date.now()
    }
  } catch {
    // ignore — use cached values
  }

  return forexCache
}

// ─── Write Binance prices to Supabase price_cache ───────────────────────────

let lastSupabaseWrite = 0

async function writePricesToSupabase() {
  // Write every 5 seconds
  if (Date.now() - lastSupabaseWrite < 5_000) return
  lastSupabaseWrite = Date.now()

  try {
    const manager = getBinancePrices()
    const rows = manager.getDetailed()
    if (rows.length === 0) return

    const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
    const admin = createSupabaseAdminClient()
    await admin.from('price_cache').upsert(
      rows.map(r => ({
        symbol: r.symbol,
        current_price: r.current_price,
        current_bid: r.current_bid,
        current_ask: r.current_ask,
        mark_price: r.mark_price,
        funding_rate: r.funding_rate,
        last_updated: r.last_updated,
      })),
      { onConflict: 'symbol' }
    )
  } catch {
    // ignore write errors — non-critical
  }
}

// ─── SL/TP matching engine (Supabase mode) ──────────────────────────────────

let lastMatchingRun = 0

async function runSupabaseMatchingEngine(prices: Record<string, number>) {
  // Run every 2 seconds (not every tick — too many DB queries)
  if (Date.now() - lastMatchingRun < 2_000) return
  lastMatchingRun = Date.now()

  try {
    const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
    const admin = createSupabaseAdminClient()

    // Fetch open positions with SL/TP orders
    const { data: openPositions } = await admin
      .from('positions')
      .select('id, account_id, symbol, direction, quantity, leverage, entry_price, isolated_margin, trade_fees, status')
      .eq('status', 'open')
      .limit(200)

    if (!openPositions || openPositions.length === 0) return

    // Fetch pending SL/TP orders linked to positions
    const { data: slTpOrders } = await admin
      .from('orders')
      .select('id, position_id, order_type, stop_price, price, direction, quantity, leverage')
      .in('position_id', openPositions.map(p => p.id))
      .in('status', ['pending'])

    if (!slTpOrders || slTpOrders.length === 0) return

    const now = Date.now()

    for (const order of slTpOrders) {
      const pos = openPositions.find(p => p.id === order.position_id)
      if (!pos) continue

      const currentPrice = prices[pos.symbol]
      if (!currentPrice) continue

      let triggered = false
      let closeReason: 'sl' | 'tp' = 'sl'

      if (order.order_type === 'stop' && order.stop_price) {
        // Stop loss: long → triggers when price <= SL, short → price >= SL
        const slPrice = Number(order.stop_price)
        if (pos.direction === 'long' && currentPrice <= slPrice) {
          triggered = true
          closeReason = 'sl'
        } else if (pos.direction === 'short' && currentPrice >= slPrice) {
          triggered = true
          closeReason = 'sl'
        }
      } else if (order.order_type === 'limit' && order.price) {
        // Take profit: long → triggers when price >= TP, short → price <= TP
        const tpPrice = Number(order.price)
        if (pos.direction === 'long' && currentPrice >= tpPrice) {
          triggered = true
          closeReason = 'tp'
        } else if (pos.direction === 'short' && currentPrice <= tpPrice) {
          triggered = true
          closeReason = 'tp'
        }
      }

      if (!triggered) continue

      // Close the position
      const exitPrice = currentPrice
      const priceDiff = pos.direction === 'long'
        ? exitPrice - Number(pos.entry_price)
        : Number(pos.entry_price) - exitPrice
      const realizedPnl = priceDiff * Number(pos.quantity) * Number(pos.leverage)
      const closeFee = exitPrice * Number(pos.quantity) * 0.0007

      // Update position
      await admin.from('positions').update({
        status: 'closed',
        close_reason: closeReason,
        exit_price: exitPrice,
        exit_timestamp: now,
        realized_pnl: realizedPnl,
        total_fees: Number(pos.trade_fees) + closeFee,
        updated_at: new Date().toISOString(),
      }).eq('id', pos.id)

      // Cancel all linked orders
      await admin.from('orders').update({
        status: closeReason === 'sl' ? 'filled' : 'filled',
        updated_at: new Date().toISOString(),
      }).eq('id', order.id)

      // Cancel remaining linked orders
      await admin.from('orders').update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      }).eq('position_id', pos.id).in('status', ['pending']).neq('id', order.id)

      // Release margin + update account
      const { data: acct } = await admin
        .from('accounts')
        .select('available_margin, realized_pnl')
        .eq('id', pos.account_id)
        .single()

      if (acct) {
        await admin.from('accounts').update({
          available_margin: Number(acct.available_margin) + Number(pos.isolated_margin) + realizedPnl - closeFee,
          realized_pnl: Number(acct.realized_pnl) + realizedPnl,
          updated_at: new Date().toISOString(),
        }).eq('id', pos.account_id)
      }

      // Activity record
      const pnlStr = realizedPnl >= 0 ? `+$${realizedPnl.toFixed(2)}` : `-$${Math.abs(realizedPnl).toFixed(2)}`
      await admin.from('activity').insert({
        account_id: pos.account_id,
        type: 'closed',
        title: `${closeReason === 'sl' ? '🛑 SL' : '🎯 TP'} ${pos.direction === 'long' ? 'Long' : 'Short'} ${pos.symbol}`,
        sub: `${Number(pos.quantity)} @ $${exitPrice.toFixed(2)} · ${pnlStr}`,
        ts: now,
        pnl: realizedPnl,
      })

      console.log(`[Matching] ${closeReason.toUpperCase()} triggered: ${pos.symbol} ${pos.direction} → PnL: ${pnlStr}`)
    }
  } catch (err) {
    // Non-critical — log and continue
    console.error('[Matching] Engine error:', err)
  }
}

// ─── SSE Route ──────────────────────────────────────────────────────────────

export async function GET() {
  const encoder = new TextEncoder()
  let closed = false
  const supabaseMode = isServerSupabaseConfigured()

  const stream = new ReadableStream({
    async start(controller) {
      if (supabaseMode) {
        // ── SUPABASE MODE: Real Binance prices ──────────────────────────
        const manager = getBinancePrices()

        // Send initial prices (may be empty if WS just connected)
        try {
          const binancePrices = manager.getAll()
          const forex = await getForexPrices()
          const prices = { ...forex, ...binancePrices }
          const data = `data: ${JSON.stringify({ prices, ts: Date.now(), source: 'binance' })}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch { /* ignore */ }

        const interval = setInterval(async () => {
          if (closed) { clearInterval(interval); return }

          try {
            const binancePrices = manager.getAll()
            const forex = await getForexPrices()
            const prices = { ...forex, ...binancePrices }

            // Push to client
            const data = `data: ${JSON.stringify({ prices, ts: Date.now(), source: 'binance' })}\n\n`
            controller.enqueue(encoder.encode(data))

            // Periodically write to Supabase + run matching engine
            await writePricesToSupabase()
            await runSupabaseMatchingEngine(prices)
          } catch {
            clearInterval(interval)
            try { controller.close() } catch { /* already closed */ }
          }
        }, 500)
      } else {
        // ── MOCK MODE: Same as before ───────────────────────────────────
        const { getAllCurrentPrices, tickEngine } = await import('@/app/api/proxy/handlers/mock')

        try {
          const prices = getAllCurrentPrices()
          const data = `data: ${JSON.stringify({ prices, ts: Date.now(), source: 'mock' })}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch { /* ignore */ }

        const interval = setInterval(() => {
          if (closed) { clearInterval(interval); return }

          try {
            tickEngine()
            const prices = getAllCurrentPrices()
            const data = `data: ${JSON.stringify({ prices, ts: Date.now(), source: 'mock' })}\n\n`
            controller.enqueue(encoder.encode(data))
          } catch {
            clearInterval(interval)
            try { controller.close() } catch { /* already closed */ }
          }
        }, 500)
      }
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
