'use client'

/**
 * Zustand order store — tracks open positions, pending orders, execution state.
 *
 * Fed by SWR trading-data hook. PnL updates happen via price store subscription.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OpenPosition {
  id: string
  symbol: string
  direction: 'long' | 'short'
  quantity: number
  leverage: number
  entryPrice: number
  currentPrice: number
  unrealizedPnl: number
  isolatedMargin: number
  stopLoss: number | null
  takeProfit: number | null
  openTime: number
  tradeFees: number
}

export interface PendingOrder {
  id: string
  symbol: string
  direction: 'long' | 'short'
  orderType: string
  quantity: number
  leverage: number
  price: number | null
  stopPrice: number | null
  status: string
  createdAt: number
}

interface OrderState {
  positions: OpenPosition[]
  pendingOrders: PendingOrder[]
  isExecuting: boolean

  // Actions
  setPositions: (positions: OpenPosition[]) => void
  addPosition: (position: OpenPosition) => void
  removePosition: (id: string) => void
  updatePositionPrices: (priceMap: Record<string, number>) => void
  setPendingOrders: (orders: PendingOrder[]) => void
  setExecuting: (v: boolean) => void
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useOrderStore = create<OrderState>()(
  subscribeWithSelector((set) => ({
    positions: [],
    pendingOrders: [],
    isExecuting: false,

    setPositions: (positions) => set({ positions }),

    addPosition: (position) =>
      set((state) => ({ positions: [...state.positions, position] })),

    removePosition: (id) =>
      set((state) => ({
        positions: state.positions.filter((p) => p.id !== id),
      })),

    // Batch update — recalculate PnL for all positions using latest prices
    updatePositionPrices: (priceMap) =>
      set((state) => ({
        positions: state.positions.map((p) => {
          const currentPrice = priceMap[p.symbol]
          if (!currentPrice) return p
          const priceDiff =
            p.direction === 'long'
              ? currentPrice - p.entryPrice
              : p.entryPrice - currentPrice
          const unrealizedPnl = priceDiff * p.quantity * p.leverage
          return { ...p, currentPrice, unrealizedPnl }
        }),
      })),

    setPendingOrders: (orders) => set({ pendingOrders: orders }),

    setExecuting: (v) => set({ isExecuting: v }),
  }))
)

// ─── Selectors ─────────────────────────────────────────────────────────────

export function usePositionCount(): number {
  return useOrderStore((s) => s.positions.length)
}

export function useTotalUnrealizedPnl(): number {
  return useOrderStore((s) =>
    s.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0)
  )
}

export function useIsExecuting(): boolean {
  return useOrderStore((s) => s.isExecuting)
}
