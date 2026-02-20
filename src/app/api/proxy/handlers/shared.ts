/**
 * Shared helpers and constants used across all proxy handlers.
 */

import { type NextRequest, NextResponse } from 'next/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export type HandlerResult = NextResponse | null

export type HandlerFn = (req: NextRequest, apiPath: string) => Promise<HandlerResult>

// ─── Timestamp helpers ───────────────────────────────────────────────────────

export function toEpoch(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  const n = new Date(v).getTime()
  return isNaN(n) ? null : n
}

export function toEpochMs(v: string | number | null | undefined): number {
  return toEpoch(v) ?? Date.now()
}

// ─── CoinGecko / Twelve Data instrument maps ─────────────────────────────────

export const COINGECKO_IDS: Record<string, string> = {
  'BTC-USD': 'bitcoin', 'ETH-USD': 'ethereum', 'SOL-USD': 'solana',
  'XRP-USD': 'ripple', 'ADA-USD': 'cardano', 'DOGE-USD': 'dogecoin',
  'LINK-USD': 'chainlink', 'ARB-USD': 'arbitrum', '1INCH-USD': '1inch',
  'AAVE-USD': 'aave', 'ASTER-USD': 'astar',
}

export const TWELVE_DATA_MAP: Record<string, string> = {
  'EUR-USD': 'EUR/USD', 'GBP-USD': 'GBP/USD', 'AUD-USD': 'AUD/USD',
}
