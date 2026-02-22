'use client'

/**
 * Composite hook that resolves the active trading account.
 *
 * Combines the SWR `useAccounts()` list with the Zustand-persisted
 * `activeAccountId`. Falls back to the first account if the persisted
 * ID is stale (deleted, closed, or first visit).
 *
 * Every dashboard page and the trade terminal import this instead of
 * calling `useAccounts()` directly.
 */

import { useEffect } from 'react'
import { useAccounts } from '@/lib/hooks'
import { useAccountStore } from '@/stores/account-store'
import type { Account } from '@/types'

export function useActiveAccount() {
  const { data: accounts, isLoading, mutate } = useAccounts()
  const activeAccountId = useAccountStore((s) => s.activeAccountId)
  const setActiveAccountId = useAccountStore((s) => s.setActiveAccountId)

  // Resolve: find account matching persisted ID, else fallback to first
  const activeAccount: Account | undefined =
    accounts?.find((a) => a.id === activeAccountId) ?? accounts?.[0]

  // Auto-persist fallback so next load is instant
  useEffect(() => {
    if (!isLoading && accounts && accounts.length > 0) {
      const resolved = accounts.find((a) => a.id === activeAccountId)
      if (!resolved) {
        setActiveAccountId(accounts[0].id)
      }
    }
  }, [accounts, activeAccountId, isLoading, setActiveAccountId])

  return {
    activeAccount,
    activeAccountId: activeAccount?.id,
    accounts: accounts ?? ([] as Account[]),
    isLoading,
    setActiveAccountId,
    refreshAccounts: mutate,
  }
}
