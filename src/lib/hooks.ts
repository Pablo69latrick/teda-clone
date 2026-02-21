'use client'

/**
 * SWR hooks for all VerticalProp API endpoints.
 *
 * Performance-optimised:
 * - dedupingInterval prevents duplicate requests from multiple components
 * - revalidateOnFocus: false avoids thundering-herd on tab switch
 * - refreshInterval tuned per-endpoint criticality
 * - keepPreviousData avoids layout flash during revalidation
 */

import useSWR from 'swr'
import type {
  Session,
  Account,
  TradingData,
  Instrument,
  Position,
  Order,
  ChallengeStatus,
  LeaderboardEntry,
  AdminUser,
  AdminAccount,
  ChallengeTemplate,
  Affiliate,
  AffiliateDashboard,
  Competition,
  Payout,
} from '@/types'

// ─── Base fetcher ──────────────────────────────────────────────────────────

const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const err = new Error(`API error ${res.status}`)
    throw err
  }
  return res.json() as Promise<T>
}

// ─── Shared SWR defaults for high-frequency trading hooks ─────────────────

const LIVE_OPTS = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  keepPreviousData: true,     // avoids layout flash during revalidation
  errorRetryCount: 3,
} as const

// ─── Session ───────────────────────────────────────────────────────────────

export function useSession() {
  return useSWR<Session>('/api/proxy/auth/get-session', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
}

// ─── Accounts ──────────────────────────────────────────────────────────────

export function useAccounts() {
  return useSWR<Account[]>('/api/proxy/actions/accounts', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })
}

// ─── Trading data (account + positions + instruments + prices) ─────────────

export function useTradingData(accountId: string | undefined) {
  return useSWR<TradingData>(
    accountId ? `/api/proxy/engine/trading-data?account_id=${accountId}` : null,
    fetcher,
    {
      ...LIVE_OPTS,
      refreshInterval: 3_000,         // 3s — fast sync for positions/orders/account
      dedupingInterval: 1_000,        // 1s dedup — allows rapid revalidation after mutations
    }
  )
}

// ─── Instruments ───────────────────────────────────────────────────────────

export function useInstruments() {
  return useSWR<Instrument[]>('/api/proxy/engine/instruments', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
}

// ─── Positions ─────────────────────────────────────────────────────────────

export function usePositions(accountId: string | undefined) {
  return useSWR<Position[]>(
    accountId ? `/api/proxy/engine/positions?account_id=${accountId}` : null,
    fetcher,
    {
      ...LIVE_OPTS,
      refreshInterval: 15_000,        // 15s — SSE tick engine handles SL/TP closes
      dedupingInterval: 5_000,
    }
  )
}

// ─── Orders ────────────────────────────────────────────────────────────────

export function useOrders(accountId: string | undefined) {
  return useSWR<Order[]>(
    accountId ? `/api/proxy/engine/orders?account_id=${accountId}` : null,
    fetcher,
    {
      ...LIVE_OPTS,
      refreshInterval: 3_000,         // 3s — fast sync for pending orders
      dedupingInterval: 1_000,
    }
  )
}

// ─── Closed positions (history) ────────────────────────────────────────────

export function useClosedPositions(accountId: string | undefined) {
  return useSWR<Position[]>(
    accountId ? `/api/proxy/engine/closed-positions?account_id=${accountId}` : null,
    fetcher,
    { ...LIVE_OPTS, refreshInterval: 5_000, dedupingInterval: 1_000 }
  )
}

// ─── Challenge status ──────────────────────────────────────────────────────

export function useChallengeStatus(accountId: string | undefined) {
  return useSWR<ChallengeStatus>(
    accountId ? `/api/proxy/engine/challenge-status?account_id=${accountId}` : null,
    fetcher,
    {
      ...LIVE_OPTS,
      refreshInterval: 15_000,        // challenge status doesn't need sub-10s
      dedupingInterval: 10_000,
    }
  )
}

// ─── Candles (OHLCV) ───────────────────────────────────────────────────────

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export function useCandles(symbol: string, interval: string) {
  return useSWR<Candle[]>(
    symbol ? `/api/proxy/engine/candles?symbol=${symbol}&interval=${interval}&limit=300` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      keepPreviousData: true,
      refreshInterval: interval === '1m' ? 10_000 : interval === '5m' ? 30_000 : 60_000,
    }
  )
}

// ─── Leaderboard ───────────────────────────────────────────────────────────

export function useLeaderboard() {
  return useSWR<LeaderboardEntry[]>('/api/proxy/leaderboard', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })
}

// ─── Admin hooks ───────────────────────────────────────────────────────────

const ADMIN_OPTS = {
  revalidateOnFocus: false,
  dedupingInterval: 30_000,
  keepPreviousData: true,
} as const

export function useAdminUsers() {
  return useSWR<AdminUser[]>('/api/proxy/admin/users', fetcher, ADMIN_OPTS)
}

export function useAdminAccounts() {
  return useSWR<AdminAccount[]>('/api/proxy/admin/accounts', fetcher, ADMIN_OPTS)
}

export function useAdminTemplates() {
  return useSWR<ChallengeTemplate[]>('/api/proxy/admin/challenge-templates', fetcher, ADMIN_OPTS)
}

export function useAdminAffiliates() {
  return useSWR<Affiliate[]>('/api/proxy/admin/affiliates', fetcher, ADMIN_OPTS)
}

// ─── Admin stats ───────────────────────────────────────────────────────────

export interface AdminStats {
  total_users: number
  active_accounts: number
  funded_accounts: number
  breached_accounts: number
  total_deposited: number
  total_payouts_paid: number
  pending_payouts: number
  pending_payout_amount: number
  revenue_today: number
  revenue_month: number
  revenue_all_time: number
  new_signups_today: number
  new_signups_month: number
  churn_rate: number
  avg_account_lifetime_days: number
}

export function useAdminStats() {
  return useSWR<AdminStats>('/api/proxy/admin/stats', fetcher, {
    ...ADMIN_OPTS,
    refreshInterval: 30_000,
  })
}

// ─── Admin risk metrics ────────────────────────────────────────────────────

export interface SymbolExposure {
  symbol: string
  long_notional: number
  short_notional: number
  net: number
}

export interface DrawdownBucket {
  bucket: string
  count: number
}

export interface AdminRiskMetrics {
  total_open_exposure: number
  total_open_pnl: number
  max_single_account_exposure: number
  accounts_near_breach: number
  accounts_at_daily_limit: number
  breached_today: number
  largest_open_position: { symbol: string; notional: number; account_id: string; direction: string } | null
  top_symbols_exposure: SymbolExposure[]
  drawdown_distribution: DrawdownBucket[]
}

export function useAdminRiskMetrics() {
  return useSWR<AdminRiskMetrics>('/api/proxy/admin/risk-metrics', fetcher, {
    ...ADMIN_OPTS,
    refreshInterval: 30_000,       // was 10s, admin metrics don't need real-time
  })
}

// ─── Equity history ────────────────────────────────────────────────────────────

export interface EquityPoint {
  ts: number
  equity: number
  pnl: number
}

export function useEquityHistory(accountId: string | undefined) {
  return useSWR<EquityPoint[]>(
    accountId ? `/api/proxy/engine/equity-history?account_id=${accountId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000, keepPreviousData: true }
  )
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string
  type: 'position' | 'closed' | 'order' | 'challenge' | 'payout' | 'system'
  title: string
  sub: string
  ts: number
  pnl: number | null
}

export function useActivity(accountId: string | undefined) {
  return useSWR<ActivityItem[]>(
    accountId ? `/api/proxy/engine/activity?account_id=${accountId}` : null,
    fetcher,
    { ...LIVE_OPTS, refreshInterval: 5_000, dedupingInterval: 1_000 }
  )
}

// ─── Payouts ──────────────────────────────────────────────────────────────────

export function usePayouts(accountId: string | undefined) {
  return useSWR<Payout[]>(
    accountId ? `/api/proxy/engine/payouts?account_id=${accountId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )
}

export function useAdminPayouts() {
  return useSWR<Payout[]>('/api/proxy/admin/payouts', fetcher, ADMIN_OPTS)
}

// ─── Affiliate ───────────────────────────────────────────────────────────────

export function useAffiliateDashboard() {
  return useSWR<AffiliateDashboard>('/api/proxy/engine/affiliate', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  })
}

// ─── Competitions ────────────────────────────────────────────────────────────

export function useCompetitions() {
  return useSWR<Competition[]>('/api/proxy/engine/competitions', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })
}
