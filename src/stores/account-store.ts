'use client'

/**
 * Zustand account store — holds the active trading account metrics.
 *
 * Fed by SWR trading-data hook. Components select only the fields they need
 * to minimize re-renders.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AccountMetrics {
  id: string
  balance: number
  equity: number
  availableMargin: number
  totalMarginRequired: number
  realizedPnl: number
  unrealizedPnl: number
  netWorth: number
  totalPnl: number
  injectedFunds: number
  leverage: number
  isActive: boolean
  accountStatus: string
}

interface AccountState {
  account: AccountMetrics | null
  setAccount: (a: AccountMetrics) => void
  updateMargin: (delta: { availableMargin?: number; totalMarginRequired?: number }) => void
  clear: () => void
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useAccountStore = create<AccountState>()(
  subscribeWithSelector((set) => ({
    account: null,

    setAccount: (a) => set({ account: a }),

    updateMargin: (delta) =>
      set((state) => {
        if (!state.account) return state
        return {
          account: {
            ...state.account,
            availableMargin: delta.availableMargin ?? state.account.availableMargin,
            totalMarginRequired: delta.totalMarginRequired ?? state.account.totalMarginRequired,
          },
        }
      }),

    clear: () => set({ account: null }),
  }))
)

// ─── Selectors ─────────────────────────────────────────────────────────────

export function useBalance(): number {
  return useAccountStore((s) => s.account?.balance ?? 0)
}

export function useEquity(): number {
  return useAccountStore((s) => s.account?.equity ?? 0)
}

export function useAvailableMargin(): number {
  return useAccountStore((s) => s.account?.availableMargin ?? 0)
}
