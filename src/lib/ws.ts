'use client'

/**
 * WebSocket abstraction layer for VerticalProp.
 *
 * Architecture:
 *   - Uses native WebSocket (compatible with Centrifugo protocol)
 *   - Auto-reconnects with exponential backoff
 *   - Falls back gracefully to SWR polling when WS is unavailable
 *   - Dispatches typed events to subscribers
 *
 * Usage:
 *   const ws = useWebSocket()
 *   ws.subscribe('price.tick', (data) => { ... })
 *   ws.subscribe('position.updated', (data) => { ... })
 *
 * In production: set NEXT_PUBLIC_WS_URL=wss://app.verticalprop.com/connection/websocket
 * In dev: WS is skipped, SWR polling handles all data
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import type { WsEventType, WsEvent } from '@/types'

// ─── Config ───────────────────────────────────────────────────────────────────

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? ''
const MAX_RETRIES = 5
const BASE_DELAY_MS = 1_000

// ─── Types ────────────────────────────────────────────────────────────────────

type EventHandler<T = unknown> = (data: T) => void
type Unsubscribe = () => void

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'unavailable'

interface WsManager {
  status: WsStatus
  subscribe: <T = unknown>(event: WsEventType, handler: EventHandler<T>) => Unsubscribe
  send: (type: string, data: unknown) => void
}

// ─── Centrifugo message encoder/decoder ───────────────────────────────────────
// Centrifugo uses a JSON-based protocol over WebSocket.
// We implement the minimal subset needed: connect + subscribe + handle push.

interface CentrifugoConnectResult {
  client: string
  version: string
}

interface CentrifugoPush {
  channel?: string
  pub?: { data: WsEvent }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebSocket(token?: string): WsManager {
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef<Map<WsEventType, Set<EventHandler>>>(new Map())
  const retriesRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [status, setStatus] = useState<WsStatus>(WS_URL ? 'connecting' : 'unavailable')

  const emit = useCallback((event: WsEventType, data: unknown) => {
    handlersRef.current.get(event)?.forEach(h => h(data))
  }, [])

  const connect = useCallback(() => {
    if (!WS_URL) {
      setStatus('unavailable')
      return
    }

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      setStatus('connecting')

      ws.onopen = () => {
        retriesRef.current = 0
        setStatus('connected')

        // Send Centrifugo connect command
        ws.send(JSON.stringify({
          id: 1,
          connect: {
            token: token ?? '',
            name: 'verticalprop-web',
            version: '1.0.0',
          },
        }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string)

          // Handle connect reply — subscribe to account channel
          if (msg.id === 1 && msg.connect) {
            const result = msg.connect as CentrifugoConnectResult
            // Subscribe to personal channel after connect
            ws.send(JSON.stringify({
              id: 2,
              subscribe: { channel: `personal:${result.client}` },
            }))
          }

          // Handle push messages
          if (msg.push) {
            const push = msg.push as CentrifugoPush
            const wsEvent = push.pub?.data
            if (wsEvent?.type) {
              emit(wsEvent.type as WsEventType, wsEvent.data)
            }
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onerror = () => {
        setStatus('disconnected')
      }

      ws.onclose = () => {
        setStatus('disconnected')
        wsRef.current = null

        if (retriesRef.current < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, retriesRef.current)
          retriesRef.current++
          reconnectTimerRef.current = setTimeout(connect, delay)
        } else {
          setStatus('unavailable')
        }
      }
    } catch {
      setStatus('unavailable')
    }
  }, [token, emit])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const subscribe = useCallback(<T = unknown>(
    event: WsEventType,
    handler: EventHandler<T>
  ): Unsubscribe => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set())
    }
    handlersRef.current.get(event)!.add(handler as EventHandler)
    return () => {
      handlersRef.current.get(event)?.delete(handler as EventHandler)
    }
  }, [])

  const send = useCallback((type: string, data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }))
    }
  }, [])

  return { status, subscribe, send }
}

// ─── WS Status indicator component ───────────────────────────────────────────
// Import in layout: <WsStatusDot status={ws.status} />

export function wsStatusColor(status: WsStatus): string {
  switch (status) {
    case 'connected':    return 'bg-profit'
    case 'connecting':   return 'bg-yellow-500 animate-pulse'
    case 'disconnected': return 'bg-yellow-500'
    case 'unavailable':  return 'bg-muted-foreground/40'
  }
}

export function wsStatusLabel(status: WsStatus): string {
  switch (status) {
    case 'connected':    return 'Live'
    case 'connecting':   return 'Connecting…'
    case 'disconnected': return 'Reconnecting…'
    case 'unavailable':  return 'Polling'
  }
}
