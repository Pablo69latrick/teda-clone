'use client'

/**
 * DashboardRealtime
 *
 * Invisible component that wires Supabase Realtime to SWR.
 * Renders nothing — only subscribes to live table changes and
 * invalidates the corresponding SWR caches via mutate().
 *
 * Mounted once in the dashboard layout so all pages benefit
 * from live updates without any per-page changes.
 */

import { useRealtimeSync } from '@/lib/realtime'
import { useAccounts } from '@/lib/hooks'

export function DashboardRealtime() {
  // Pick the first active account as the scope for realtime subscriptions.
  // When the user switches accounts the accountId ref inside useRealtimeSync
  // updates automatically via the ref pattern — no re-subscribe needed.
  const { data: accounts } = useAccounts()
  const activeAccountId = accounts?.[0]?.id

  useRealtimeSync({ accountId: activeAccountId })

  // Renders nothing
  return null
}
