'use client'

/**
 * Zustand account store — holds the active trading account metrics
 * and the currently selected account ID (persisted to localStorage).
 *
 * Fed by SWR trading-data hook. Components select only the fields they need
 * to minimize re-renders.
 */

import { create } from 'zustand'
import { subscribeWithSelector, persist } from 'zustand/middleware'

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
  // Live metrics for the currently-viewed account (transient, from SWR)
  account: AccountMetrics | null
  setAccount: (a: AccountMetrics) => void
  updateMargin: (delta: { availableMargin?: number; totalMarginRequired?: number }) => void
  clear: () => void

  // Which account is selected (persisted to localStorage)
  activeAccountId: string | null
  setActiveAccountId: (id: string) => void
}

// ─── Store ─────────────────────────────────────────────────────────────────

export const useAccountStore = create<AccountState>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        account: null,
        activeAccountId: null,

        setActiveAccountId: (id) => set({ activeAccountId: id }),

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
      }),
      {
        name: 'vp-active-account',
        // Only persist the active account ID — not the transient metrics
        partialize: (state) => ({ activeAccountId: state.activeAccountId }),
      }
    )
  )
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
