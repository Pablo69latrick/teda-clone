'use client'

/**
 * Supabase Realtime — SWR cache invalidation hook.
 *
 * Subscribes to Postgres CDC events on the tables that change during live
 * trading and calls SWR `mutate()` to trigger refetches.  No component
 * needs to be changed — SWR handles the UI update automatically.
 *
 * Tables subscribed (must be enabled in Supabase Dashboard > Replication):
 *   - price_cache   → invalidates instruments + trading-data
 *   - positions     → invalidates positions + trading-data + activity
 *   - orders        → invalidates orders + trading-data
 *   - accounts      → invalidates accounts + trading-data + challenge-status
 *   - activity      → invalidates activity
 *
 * H-06: Row-level filters are applied on positions, orders, accounts, and
 * activity so each client only receives events for their own account.
 * price_cache has no per-account rows so it remains unfiltered.
 *
 * The hook is a no-op when Supabase is not configured (mock / dev mode).
 */

import { useEffect, useRef } from 'react'
import { useSWRConfig } from 'swr'
import { isBrowserSupabaseConfigured } from '@/lib/supabase/config'

// ── Hook ──────────────────────────────────────────────────────────────────

interface UseRealtimeSyncOptions {
  /** The active account ID — used to scope invalidation keys and row filters. */
  accountId: string | undefined
}

export function useRealtimeSync({ accountId }: UseRealtimeSyncOptions) {
  const { mutate } = useSWRConfig()

  // Keep a stable ref to the latest accountId so the effect can use it
  // without having to re-subscribe whenever it changes.
  const accountIdRef = useRef(accountId)
  useEffect(() => { accountIdRef.current = accountId }, [accountId])

  useEffect(() => {
    // No-op in mock / mis-configured mode
    if (!isBrowserSupabaseConfigured()) return

    // Wait until we have an account ID to add row-level filters
    if (!accountId) return

    // H-06: Use a stable supabase instance (same ref for subscribe + cleanup)
    // to avoid creating a second browser client just for removeChannel.
    let supabaseInstance: import('@supabase/supabase-js').SupabaseClient | null = null
    let channel: ReturnType<import('@supabase/supabase-js').SupabaseClient['channel']> | null = null

    // Dynamically import the browser client to avoid SSR issues
    import('@/lib/supabase/client').then(({ createSupabaseBrowserClient }) => {
      const supabase = createSupabaseBrowserClient()
      supabaseInstance = supabase

      channel = supabase
        .channel(`realtime-trading-${accountId}`)

        // ── price_cache → refresh instruments watchlist + trading data ───────
        // No per-account filter (price_cache has no account_id column)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'price_cache' },
          () => {
            mutate('/api/proxy/engine/instruments')
            const aid = accountIdRef.current
            if (aid) {
              mutate(`/api/proxy/engine/trading-data?account_id=${aid}`)
            }
          }
        )

        // ── positions → refresh positions + trading data + activity ──────────
        // H-06: filter to only this account's rows
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'positions', filter: `account_id=eq.${accountId}` },
          () => {
            const aid = accountIdRef.current
            if (aid) {
              mutate(`/api/proxy/engine/positions?account_id=${aid}`)
              mutate(`/api/proxy/engine/trading-data?account_id=${aid}`)
              mutate(`/api/proxy/engine/activity?account_id=${aid}`)
              mutate(`/api/proxy/engine/challenge-status?account_id=${aid}`)
            }
          }
        )

        // ── orders → refresh orders + trading data ───────────────────────────
        // H-06: filter to only this account's rows
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders', filter: `account_id=eq.${accountId}` },
          () => {
            const aid = accountIdRef.current
            if (aid) {
              mutate(`/api/proxy/engine/orders?account_id=${aid}`)
              mutate(`/api/proxy/engine/trading-data?account_id=${aid}`)
            }
          }
        )

        // ── accounts → refresh accounts + trading data + challenge status ────
        // H-06: filter to only this specific account row
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'accounts', filter: `id=eq.${accountId}` },
          () => {
            mutate('/api/proxy/actions/accounts')
            const aid = accountIdRef.current
            if (aid) {
              mutate(`/api/proxy/engine/trading-data?account_id=${aid}`)
              mutate(`/api/proxy/engine/challenge-status?account_id=${aid}`)
            }
          }
        )

        // ── activity → refresh activity feed ─────────────────────────────────
        // H-06: filter to only this account's activity
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'activity', filter: `account_id=eq.${accountId}` },
          () => {
            const aid = accountIdRef.current
            if (aid) {
              mutate(`/api/proxy/engine/activity?account_id=${aid}`)
            }
          }
        )

        .subscribe()
    })

    return () => {
      // H-06 fix: reuse the same supabaseInstance for cleanup instead of
      // creating a second browser client, which was wasteful and caused
      // the cleanup to operate on a different client than the one subscribed.
      if (channel && supabaseInstance) {
        supabaseInstance.removeChannel(channel)
      }
    }
  }, [mutate, accountId]) // re-subscribe when accountId changes (different account)
}
