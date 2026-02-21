'use client'

/**
 * Zustand price store — replaces the vanilla useSyncExternalStore approach.
 *
 * Uses subscribeWithSelector so each component only re-renders when
 * ITS specific symbol's price changes (not on every tick).
 *
 * Write API: setPrices() — called by usePriceStream on each SSE tick.
 * Read API:  usePrice(symbol) — per-symbol selector, minimal re-renders.
 *            usePrices()       — all prices (re-renders every tick).
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PriceTick {
  price: number
  bid?: number
  ask?: number
  ts: number
}

interface PriceState {
  /** symbol → price (number) for quick lookups */
  prices: Record<string, number>
  /** symbol → full tick for bid/ask */
  ticks: Record<string, PriceTick>
  /** Last SSE timestamp */
  lastUpdate: number

  // Write API
  setPrices: (incoming: Record<string, number>) => void
  setTick: (symbol: string, tick: PriceTick) => void
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const usePriceStore = create<PriceState>()(
  subscribeWithSelector((set) => ({
    prices: {},
    ticks: {},
    lastUpdate: 0,

    setPrices: (incoming) =>
      set({
        prices: incoming,
        lastUpdate: Date.now(),
      }),

    setTick: (symbol, tick) =>
      set((state) => ({
        ticks: { ...state.ticks, [symbol]: tick },
        prices: { ...state.prices, [symbol]: tick.price },
        lastUpdate: Date.now(),
      })),
  }))
)

// ─── Selectors (stable references, per-symbol) ────────────────────────────

/** Subscribe to a SINGLE symbol's price. Only re-renders when that symbol changes. */
export function usePrice(symbol: string): number {
  return usePriceStore((state) => state.prices[symbol] ?? 0)
}

/** Subscribe to ALL prices. Re-renders on every SSE tick. Use sparingly. */
export function usePrices(): Record<string, number> {
  return usePriceStore((state) => state.prices)
}

/** Get raw prices (non-reactive, for imperative code). */
export function getRawPrices(): Record<string, number> {
  return usePriceStore.getState().prices
}

/** Set prices from SSE stream (non-reactive write). */
export function setPricesFromStream(incoming: Record<string, number>) {
  usePriceStore.getState().setPrices(incoming)
}
