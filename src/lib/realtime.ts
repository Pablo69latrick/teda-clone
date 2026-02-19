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
 * The hook is a no-op when Supabase is not configured (mock / dev mode).
 */

import { useEffect, useRef } from 'react'
import { useSWRConfig } from 'swr'

// ── Config detection ───────────────────────────────────────────────────────

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return (
    url.length > 0 &&
    !url.includes('VOTRE_REF') &&
    key.length > 0 &&
    !key.includes('VOTRE_ANON')
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────

interface UseRealtimeSyncOptions {
  /** The active account ID — used to scope invalidation keys. */
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
    if (!isSupabaseConfigured()) return

    let channel: ReturnType<import('@supabase/supabase-js').SupabaseClient['channel']> | null = null

    // Dynamically import the browser client to avoid SSR issues
    import('@/lib/supabase/client').then(({ createSupabaseBrowserClient }) => {
      const supabase = createSupabaseBrowserClient()

      channel = supabase
        .channel('realtime-trading')

        // ── price_cache → refresh instruments watchlist + trading data ───────
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
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'positions' },
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
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            const aid = accountIdRef.current
            if (aid) {
              mutate(`/api/proxy/engine/orders?account_id=${aid}`)
              mutate(`/api/proxy/engine/trading-data?account_id=${aid}`)
            }
          }
        )

        // ── accounts → refresh accounts + trading data + challenge status ────
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'accounts' },
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
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'activity' },
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
      if (channel) {
        import('@/lib/supabase/client').then(({ createSupabaseBrowserClient }) => {
          createSupabaseBrowserClient().removeChannel(channel!)
        })
      }
    }
  }, [mutate]) // mutate is stable — no re-subscription needed
}
