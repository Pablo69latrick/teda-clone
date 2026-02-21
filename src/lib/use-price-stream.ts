'use client'

/**
 * SSE price stream hook — connects to /api/prices/stream and distributes
 * live prices to the entire app via three channels:
 *
 * 1. price-store  → direct external store (chart, watchlist, any component)
 * 2. SWR instruments cache → keeps instrument objects up-to-date
 * 3. SWR trading-data cache → keeps position PnL calculations fresh
 *
 * The SSE connection is always active (no auth required).
 * Auto-reconnects on disconnect with 2s backoff.
 */

import { useEffect, useRef } from 'react'
import { useSWRConfig } from 'swr'
import { setPrices } from '@/lib/price-store'
import type { TradingData, Instrument } from '@/types'

export function usePriceStream(accountId: string | undefined) {
  const { mutate } = useSWRConfig()
  const esRef = useRef<EventSource | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let closed = false

    function connect() {
      if (closed) return

      const es = new EventSource('/api/prices/stream')
      esRef.current = es

      es.onmessage = (event) => {
        try {
          const { prices } = JSON.parse(event.data) as { prices: Record<string, number> }

          // ── Channel 1: Price store (instant, no dependencies) ──────────
          setPrices(prices)

          // ── Channel 2: SWR instruments cache (watchlist spread, etc.) ──
          mutate(
            '/api/proxy/engine/instruments',
            (instruments: Instrument[] | undefined) => {
              if (!instruments) return instruments
              return instruments.map(inst => {
                const p = prices[inst.symbol]
                if (p === undefined) return inst
                const spread = inst.instrument_type === 'forex'
                  ? 0.00003
                  : p * 0.00015
                return {
                  ...inst,
                  current_price: p,
                  current_bid:   +(p - spread).toFixed(8),
                  current_ask:   +(p + spread).toFixed(8),
                  mark_price:    p,
                  last_updated:  Date.now(),
                }
              })
            },
            { revalidate: false }
          )

          // ── Channel 3: SWR trading-data cache (positions PnL) ─────────
          if (accountId) {
            const key = `/api/proxy/engine/trading-data?account_id=${accountId}`
            mutate(
              key,
              (current: TradingData | undefined) => {
                if (!current) return current
                return { ...current, prices }
              },
              { revalidate: false }
            )
          }
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        if (!closed) {
          reconnectRef.current = setTimeout(connect, 2000)
        }
      }
    }

    connect()

    return () => {
      closed = true
      esRef.current?.close()
      esRef.current = null
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
    }
  }, [accountId, mutate])
}
