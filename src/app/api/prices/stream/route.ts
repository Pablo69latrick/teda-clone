/**
 * SSE Price Stream — pushes live price ticks every 500ms.
 *
 * Replaces the old 3s SWR polling for price data. All 14 instruments
 * are jittered each tick and sent as a single JSON blob. The client
 * hook (usePriceStream) writes these into the SWR cache so every
 * component that reads tradingData.prices gets 2 FPS updates for free.
 *
 * The tick engine also runs here: trailing stop adjustments and
 * SL/TP auto-close checks happen on every tick.
 */

import { getAllCurrentPrices, tickEngine } from '@/app/api/proxy/handlers/mock'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      // Send initial prices immediately
      try {
        const prices = getAllCurrentPrices()
        const data = `data: ${JSON.stringify({ prices, ts: Date.now() })}\n\n`
        controller.enqueue(encoder.encode(data))
      } catch { /* ignore */ }

      const interval = setInterval(() => {
        if (closed) {
          clearInterval(interval)
          return
        }

        try {
          // Run the matching engine (trailing stop updates, SL/TP auto-close)
          tickEngine()

          // Jitter all prices and push to client
          const prices = getAllCurrentPrices()
          const data = `data: ${JSON.stringify({ prices, ts: Date.now() })}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch {
          // Stream may have been closed by the client
          clearInterval(interval)
          try { controller.close() } catch { /* already closed */ }
        }
      }, 500)
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
