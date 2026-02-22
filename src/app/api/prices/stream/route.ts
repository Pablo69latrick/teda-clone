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
// Risk engine removed from SSE — Railway Execution Engine handles SL/TP,
// margin checks, drawdowns, and breach detection 24/7 independently.
// This eliminates the dual-engine conflict and ensures atomic operations.

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

            // Periodically write to Supabase (prices only — risk engine runs on Railway)
            await writePricesToSupabase()
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
