'use client'

/**
 * Lightweight external price store — powers real-time ticking everywhere.
 *
 * Uses React 18's useSyncExternalStore for tear-free reads.
 * Prices flow in from the SSE stream at 500ms intervals.
 * No auth, no account, no SWR dependency — just raw prices.
 *
 * Components:
 *   useLivePrices()        → Record<string, number>  (all symbols)
 *   useLivePrice(symbol)   → number                  (single symbol, minimal re-renders)
 */

import { useSyncExternalStore } from 'react'

// ─── Store state ────────────────────────────────────────────────────────────

let _prices: Record<string, number> = {}
const _listeners = new Set<() => void>()

function _notify() {
  _listeners.forEach(fn => fn())
}

function _subscribe(listener: () => void): () => void {
  _listeners.add(listener)
  return () => _listeners.delete(listener)
}

// ─── Write API (called by usePriceStream) ───────────────────────────────────

export function setPrices(incoming: Record<string, number>) {
  _prices = incoming
  _notify()
}

export function getRawPrices(): Record<string, number> {
  return _prices
}

// ─── React hooks ────────────────────────────────────────────────────────────

/** Subscribe to ALL live prices. Re-renders on every SSE tick (~500ms). */
export function useLivePrices(): Record<string, number> {
  return useSyncExternalStore(_subscribe, () => _prices, () => _prices)
}

/**
 * Subscribe to a SINGLE symbol's price.
 * Only re-renders when that specific symbol's price changes.
 */
export function useLivePrice(symbol: string): number {
  return useSyncExternalStore(
    _subscribe,
    () => _prices[symbol] ?? 0,
    () => 0
  )
}
