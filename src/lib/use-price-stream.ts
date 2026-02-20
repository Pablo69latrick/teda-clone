'use client'

/**
 * SSE price stream hook — connects to /api/prices/stream and writes
 * fresh prices into the SWR trading-data cache every 500ms.
 *
 * This replaces the 3s polling for price data. Positions, orders, and
 * account data still poll via SWR but at a longer 30s interval since
 * optimistic updates handle the immediate feedback for user actions.
 *
 * Features:
 * - Auto-reconnect on disconnect (2s backoff)
 * - Single connection per accountId (hook deduplicates via ref)
 * - Zero prop changes for consumers — SWR cache mutation is transparent
 */

import { useEffect, useRef } from 'react'
import { useSWRConfig } from 'swr'
import type { TradingData } from '@/types'

export function usePriceStream(accountId: string | undefined) {
  const { mutate } = useSWRConfig()
  const esRef = useRef<EventSource | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!accountId) return

    let closed = false

    function connect() {
      if (closed) return

      const es = new EventSource('/api/prices/stream')
      esRef.current = es

      es.onmessage = (event) => {
        try {
          const { prices } = JSON.parse(event.data) as { prices: Record<string, number> }

          // Mutate the SWR cache — all components reading this key
          // get fresh prices without an HTTP round-trip
          const key = `/api/proxy/engine/trading-data?account_id=${accountId}`
          mutate(
            key,
            (current: TradingData | undefined) => {
              if (!current) return current
              return { ...current, prices }
            },
            { revalidate: false }
          )
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        // Reconnect after 2s
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
