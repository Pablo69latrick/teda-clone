'use client'

/**
 * SWR hooks for all VerticalProp API endpoints.
 *
 * All requests go through our Next.js /api/proxy/* routes to avoid CORS issues
 * and to attach the session cookie server-side.
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
    { refreshInterval: 2_000 }  // poll every 2s for live prices
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
    { refreshInterval: 2_000 }
  )
}

// ─── Orders ────────────────────────────────────────────────────────────────

export function useOrders(accountId: string | undefined) {
  return useSWR<Order[]>(
    accountId ? `/api/proxy/engine/orders?account_id=${accountId}` : null,
    fetcher,
    { refreshInterval: 5_000 }
  )
}

// ─── Closed positions (history) ────────────────────────────────────────────

export function useClosedPositions(accountId: string | undefined) {
  return useSWR<Position[]>(
    accountId ? `/api/proxy/engine/closed-positions?account_id=${accountId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )
}

// ─── Challenge status ──────────────────────────────────────────────────────

export function useChallengeStatus(accountId: string | undefined) {
  return useSWR<ChallengeStatus>(
    accountId ? `/api/proxy/engine/challenge-status?account_id=${accountId}` : null,
    fetcher,
    { refreshInterval: 10_000 }
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
      // Poll every minute for live candle updates
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

export function useAdminUsers() {
  return useSWR<AdminUser[]>('/api/proxy/admin/users', fetcher, {
    revalidateOnFocus: false,
  })
}

export function useAdminAccounts() {
  return useSWR<AdminAccount[]>('/api/proxy/admin/accounts', fetcher, {
    revalidateOnFocus: false,
  })
}

export function useAdminTemplates() {
  return useSWR<ChallengeTemplate[]>('/api/proxy/admin/challenge-templates', fetcher, {
    revalidateOnFocus: false,
  })
}

export function useAdminAffiliates() {
  return useSWR<Affiliate[]>('/api/proxy/admin/affiliates', fetcher, {
    revalidateOnFocus: false,
  })
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
    refreshInterval: 30_000,
    revalidateOnFocus: false,
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
    refreshInterval: 10_000,
    revalidateOnFocus: false,
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
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
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
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  )
}
