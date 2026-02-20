/**
 * Mock data handlers — development fallback when Supabase is not configured.
 * All mock data generators and POST handlers for dev/demo mode.
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { HandlerResult } from './shared'

// ─── Mock instrument helper ──────────────────────────────────────────────────

function mockInstrument(
  symbol: string, price: number, bid: number, ask: number,
  priceDec: number, qtyDec: number, type: string,
) {
  return {
    id: symbol, symbol, instrument_type: type,
    base_currency: symbol.split('-')[0], quote_currency: 'USD',
    margin_requirement: type === 'forex' ? 0.001 : 0.01,
    min_order_size: type === 'forex' ? 1000 : 0.001,
    max_leverage: type === 'forex' ? 100 : 20,
    tick_size: Math.pow(10, -priceDec), lot_size: type === 'forex' ? 1000 : 0.001,
    price_decimals: priceDec, qty_decimals: qtyDec,
    is_tradable: true, is_active: true, orderbook_enabled: false, trades_enabled: false,
    current_price: price, current_bid: bid, current_ask: ask,
    mark_price: price, funding_rate: -0.0002,
    next_funding_time: Date.now() + 4 * 60 * 60 * 1000, last_updated: Date.now(),
  }
}

// ─── Price state & jitter ────────────────────────────────────────────────────

const BASE_PRICES: Record<string, { price: number; bid: number; ask: number; priceDec: number; qtyDec: number; type: string }> = {
  '1INCH-USD': { price: 0.09283,  bid: 0.09282,  ask: 0.09284,  priceDec: 5, qtyDec: 5, type: 'crypto' },
  'AAVE-USD':  { price: 122.550,  bid: 122.540,  ask: 122.560,  priceDec: 3, qtyDec: 3, type: 'crypto' },
  'ADA-USD':   { price: 0.2738,   bid: 0.2737,   ask: 0.2739,   priceDec: 4, qtyDec: 4, type: 'crypto' },
  'ARB-USD':   { price: 0.10420,  bid: 0.10419,  ask: 0.10421,  priceDec: 5, qtyDec: 5, type: 'crypto' },
  'ASTER-USD': { price: 0.06917,  bid: 0.06916,  ask: 0.06918,  priceDec: 5, qtyDec: 5, type: 'crypto' },
  'AUD-USD':   { price: 0.69584,  bid: 0.69583,  ask: 0.69585,  priceDec: 5, qtyDec: 5, type: 'forex'  },
  'BTC-USD':   { price: 95420.5,  bid: 95419.0,  ask: 95421.0,  priceDec: 1, qtyDec: 3, type: 'crypto' },
  'DOGE-USD':  { price: 0.15320,  bid: 0.15318,  ask: 0.15321,  priceDec: 5, qtyDec: 5, type: 'crypto' },
  'ETH-USD':   { price: 3450.25,  bid: 3449.75,  ask: 3450.75,  priceDec: 2, qtyDec: 2, type: 'crypto' },
  'EUR-USD':   { price: 1.08432,  bid: 1.08431,  ask: 1.08433,  priceDec: 5, qtyDec: 5, type: 'forex'  },
  'GBP-USD':   { price: 1.26750,  bid: 1.26748,  ask: 1.26752,  priceDec: 5, qtyDec: 5, type: 'forex'  },
  'LINK-USD':  { price: 14.8320,  bid: 14.8310,  ask: 14.8330,  priceDec: 4, qtyDec: 4, type: 'crypto' },
  'SOL-USD':   { price: 185.320,  bid: 185.310,  ask: 185.330,  priceDec: 3, qtyDec: 3, type: 'crypto' },
  'XRP-USD':   { price: 2.34560,  bid: 2.34550,  ask: 2.34570,  priceDec: 5, qtyDec: 5, type: 'crypto' },
}

const priceState: Record<string, number> = Object.fromEntries(
  Object.entries(BASE_PRICES).map(([sym, v]) => [sym, v.price])
)

function jitterPrice(symbol: string): number {
  const base = BASE_PRICES[symbol].price
  const volatility = base * 0.0003
  priceState[symbol] = Math.max(
    base * 0.97,
    Math.min(base * 1.03, priceState[symbol] + (Math.random() - 0.5) * 2 * volatility)
  )
  return priceState[symbol]
}

function getInstruments() {
  return Object.entries(BASE_PRICES).map(([symbol, v]) => {
    const price = jitterPrice(symbol)
    const halfSpread = Math.pow(10, -v.priceDec)
    return mockInstrument(symbol, price, price - halfSpread, price + halfSpread, v.priceDec, v.qtyDec, v.type)
  })
}

// ─── Mock constants ──────────────────────────────────────────────────────────

const ACCOUNT_ID = 'f2538dee-cfb0-422a-bf7b-c6b247145b3a'
const MOCK_ACCOUNT = {
  id: ACCOUNT_ID, user_id: 'mock-user-id', name: 'Phase 1 — Evaluation',
  account_type: 'prop', account_type_config: 'mock-template-id', base_currency: 'USD',
  default_margin_mode: 'cross', available_margin: 200_019.91, reserved_margin: 0,
  total_margin_required: 0, injected_funds: 0, net_worth: 200_019.91,
  total_pnl: 19.91, unrealized_pnl: 0, realized_pnl: 19.91,
  is_active: true, is_closed: false, account_status: 'active',
  challenge_template_id: 'mock-template-id',
  created_at: Date.now() - 30 * 24 * 60 * 60 * 1000, updated_at: Date.now(),
}

const MOCK_POSITIONS = [
  { id: 'pos-001', account_id: ACCOUNT_ID, instrument_config: 'BTC-USD', instrument_price: 'BTC-USD', symbol: 'BTC-USD', direction: 'long', quantity: 0.05, leverage: 10, entry_price: 93_200.0, entry_timestamp: Date.now() - 2 * 3600_000, exit_price: null, exit_timestamp: null, liquidation_price: 84_000.0, status: 'open', close_reason: null, margin_mode: 'cross', isolated_margin: 466.0, isolated_wallet: null, realized_pnl: 0, trade_fees: 4.66, overnight_fees: 0, funding_fees: -0.82, total_fees: 5.48, total_funding: -0.82, linked_orders: null, original_quantity: null, created_at: Date.now() - 2 * 3600_000, updated_at: Date.now() },
  { id: 'pos-002', account_id: ACCOUNT_ID, instrument_config: 'ETH-USD', instrument_price: 'ETH-USD', symbol: 'ETH-USD', direction: 'short', quantity: 0.8, leverage: 5, entry_price: 3_520.0, entry_timestamp: Date.now() - 45 * 60_000, exit_price: null, exit_timestamp: null, liquidation_price: 4_025.0, status: 'open', close_reason: null, margin_mode: 'cross', isolated_margin: 563.2, isolated_wallet: null, realized_pnl: 0, trade_fees: 2.82, overnight_fees: 0, funding_fees: 0.35, total_fees: 3.17, total_funding: 0.35, linked_orders: null, original_quantity: null, created_at: Date.now() - 45 * 60_000, updated_at: Date.now() },
  { id: 'pos-003', account_id: ACCOUNT_ID, instrument_config: 'SOL-USD', instrument_price: 'SOL-USD', symbol: 'SOL-USD', direction: 'long', quantity: 5, leverage: 3, entry_price: 181.5, entry_timestamp: Date.now() - 6 * 3600_000, exit_price: null, exit_timestamp: null, liquidation_price: 120.0, status: 'open', close_reason: null, margin_mode: 'cross', isolated_margin: 302.5, isolated_wallet: null, realized_pnl: 0, trade_fees: 1.36, overnight_fees: 0, funding_fees: -0.14, total_fees: 1.50, total_funding: -0.14, linked_orders: null, original_quantity: null, created_at: Date.now() - 6 * 3600_000, updated_at: Date.now() },
]

function generateEquityHistory() {
  const days = 30; const startBalance = 200_000; let equity = startBalance
  const now = Date.now(); const DAY = 86_400_000
  return Array.from({ length: days }, (_, i) => {
    const change = (Math.random() - 0.42) * equity * 0.008
    equity = Math.max(startBalance * 0.88, equity + change)
    return { ts: now - (days - 1 - i) * DAY, equity: parseFloat(equity.toFixed(2)), pnl: parseFloat((equity - startBalance).toFixed(2)) }
  })
}

const MOCK_ACTIVITY = [
  { id: 'act-1', type: 'position',  title: 'Long BTC-USD opened',   sub: '0.05 BTC @ $93,200 · 10x',      ts: Date.now() - 2 * 3600_000,  pnl: null },
  { id: 'act-2', type: 'position',  title: 'Short ETH-USD opened',  sub: '0.8 ETH @ $3,520 · 5x',         ts: Date.now() - 45 * 60_000,   pnl: null },
  { id: 'act-3', type: 'order',     title: 'Limit order placed',    sub: 'Sell 1,000 XRP @ $2.38',         ts: Date.now() - 30 * 60_000,   pnl: null },
  { id: 'act-4', type: 'position',  title: 'Long SOL-USD opened',   sub: '5 SOL @ $181.50 · 3x',           ts: Date.now() - 6 * 3600_000,  pnl: null },
  { id: 'act-5', type: 'closed',    title: 'Long ETH-USD closed',   sub: '1.2 ETH · held 4h',              ts: Date.now() - 8 * 3600_000,  pnl: 142.50 },
  { id: 'act-6', type: 'closed',    title: 'Short BTC-USD closed',  sub: '0.02 BTC · held 2h',             ts: Date.now() - 14 * 3600_000, pnl: -38.20 },
  { id: 'act-7', type: 'closed',    title: 'Long ADA-USD closed',   sub: '2,000 ADA · held 1 day',         ts: Date.now() - 26 * 3600_000, pnl: 87.00 },
  { id: 'act-8', type: 'challenge', title: 'Day 2 of 5 min. reached', sub: 'Keep going — 3 more days needed', ts: Date.now() - 2 * 86400_000, pnl: null },
]

// ─── Candle generator ────────────────────────────────────────────────────────

const CANDLE_BASE: Record<string, number> = {
  'BTC-USD': 95420.5, 'ETH-USD': 3450.25, 'SOL-USD': 185.32, 'DOGE-USD': 0.1532,
  '1INCH-USD': 0.09283, 'AAVE-USD': 122.55, 'ADA-USD': 0.2738, 'ARB-USD': 0.1042,
  'ASTER-USD': 0.06917, 'AUD-USD': 0.69584, 'EUR-USD': 1.08432, 'GBP-USD': 1.2675,
  'LINK-USD': 14.832, 'XRP-USD': 2.3456,
}

function generateCandles(symbol: string, interval: string, limit: number) {
  const basePrice = CANDLE_BASE[symbol] ?? 100
  const ms: Record<string, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000, '1w': 604_800_000 }
  const intervalMs = ms[interval] ?? 3_600_000
  const candles = []; let price = basePrice
  const now = Math.floor(Date.now() / intervalMs) * intervalMs
  for (let i = limit; i >= 0; i--) {
    const time = now - i * intervalMs
    const vol = basePrice * (interval === '1d' ? 0.012 : interval === '1h' ? 0.004 : 0.002)
    const open = price
    const close = Math.max(open * 0.5, open + (Math.random() - 0.48) * vol)
    const high = Math.max(open, close) + Math.random() * vol * 0.5
    const low  = Math.min(open, close) - Math.random() * vol * 0.5
    const volume = basePrice > 1000 ? Math.random() * 500 + 50 : basePrice > 1 ? Math.random() * 50_000 + 5_000 : Math.random() * 5_000_000 + 500_000
    candles.push({ time: Math.floor(time / 1000), open, high, low, close, volume })
    price = close
  }
  return candles
}

// ─── Mock GET data dispatcher ────────────────────────────────────────────────

function getMockData(path: string, req?: NextRequest): unknown {
  switch (path) {
    case 'auth/get-session':
      return { session: { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), token: 'mock-token', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ipAddress: '127.0.0.1', userAgent: 'VerticalProp-Clone', userId: 'mock-user-id' }, user: { id: 'mock-user-id', email: 'trader@example.com', name: 'Jules Trader', emailVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
    case 'actions/accounts': return [MOCK_ACCOUNT]
    case 'engine/trading-data': { const li = getInstruments(); return { account: MOCK_ACCOUNT, positions: MOCK_POSITIONS, instruments: li, prices: Object.fromEntries(li.map(i => [i.symbol, i.current_price])) } }
    case 'engine/instruments': return getInstruments()
    case 'engine/positions': return MOCK_POSITIONS
    case 'engine/orders': return []
    case 'engine/equity-history': return generateEquityHistory()
    case 'engine/activity': return MOCK_ACTIVITY
    case 'engine/challenge-status': return { account_id: ACCOUNT_ID, phase: 1, status: 'active', profit_target: 0.08, daily_loss_limit: 0.05, max_drawdown: 0.10, current_profit: 0.0001, current_daily_loss: 0, current_drawdown: 0, trading_days: 1, min_trading_days: 5, started_at: Date.now() - 24 * 60 * 60 * 1000, ends_at: null }
    case 'leaderboard': return Array.from({ length: 20 }, (_, i) => ({ rank: i + 1, user_id: `user-${i + 1}`, username: `Trader${String(i + 1).padStart(3, '0')}`, avatar_url: null, account_id: `acc-${i + 1}`, profit_pct: parseFloat((8.5 - i * 0.3).toFixed(2)), profit_amount: parseFloat((17_000 - i * 600).toFixed(2)), trading_days: Math.max(5, 20 - i), challenge_type: ['instant', '1-step', '2-step'][i % 3], is_funded: i < 3 }))
    case 'engine/payouts': return [
      { id: 'p1', account_id: ACCOUNT_ID, user_id: 'mock-user-id', amount: 3200, status: 'paid', method: 'crypto', wallet_address: '0xaB3c...8dF1', tx_hash: '0xabc123def456', admin_note: null, requested_at: Date.now() - 14 * 86400_000, processed_at: Date.now() - 12 * 86400_000, created_at: Date.now() - 14 * 86400_000, updated_at: Date.now() - 12 * 86400_000 },
      { id: 'p2', account_id: ACCOUNT_ID, user_id: 'mock-user-id', amount: 1800, status: 'approved', method: 'crypto', wallet_address: '0xaB3c...8dF1', tx_hash: null, admin_note: null, requested_at: Date.now() - 3 * 86400_000, processed_at: Date.now() - 1 * 86400_000, created_at: Date.now() - 3 * 86400_000, updated_at: Date.now() - 1 * 86400_000 },
      { id: 'p3', account_id: ACCOUNT_ID, user_id: 'mock-user-id', amount: 5500, status: 'pending', method: 'crypto', wallet_address: '0xaB3c...8dF1', tx_hash: null, admin_note: null, requested_at: Date.now() - 1 * 86400_000, processed_at: null, created_at: Date.now() - 1 * 86400_000, updated_at: Date.now() - 1 * 86400_000 },
    ]
    case 'admin/payouts': return [
      { id: 'p3', account_id: ACCOUNT_ID, user_id: 'mock-user-id', user_name: 'Jules Trader', user_email: 'trader@example.com', amount: 5500, status: 'pending', method: 'crypto', wallet_address: '0xaB3c...8dF1', tx_hash: null, admin_note: null, requested_at: Date.now() - 1 * 86400_000, processed_at: null, created_at: Date.now() - 1 * 86400_000, updated_at: Date.now() - 1 * 86400_000 },
      { id: 'p2', account_id: ACCOUNT_ID, user_id: 'mock-user-id', user_name: 'Jules Trader', user_email: 'trader@example.com', amount: 1800, status: 'approved', method: 'crypto', wallet_address: '0xaB3c...8dF1', tx_hash: null, admin_note: null, requested_at: Date.now() - 3 * 86400_000, processed_at: Date.now() - 1 * 86400_000, created_at: Date.now() - 3 * 86400_000, updated_at: Date.now() - 1 * 86400_000 },
      { id: 'p1', account_id: ACCOUNT_ID, user_id: 'mock-user-id', user_name: 'Jules Trader', user_email: 'trader@example.com', amount: 3200, status: 'paid', method: 'crypto', wallet_address: '0xaB3c...8dF1', tx_hash: '0xabc123def456', admin_note: null, requested_at: Date.now() - 14 * 86400_000, processed_at: Date.now() - 12 * 86400_000, created_at: Date.now() - 14 * 86400_000, updated_at: Date.now() - 12 * 86400_000 },
    ]
    case 'engine/affiliate': return {
      stats: {
        affiliate_code: 'TEDA-JULES',
        affiliate_link: 'https://app.teda.com/register?ref=TEDA-JULES',
        commission_rate: 0.20,
        total_referrals: 47,
        active_referrals: 31,
        total_earned: 8_240,
        pending_commission: 1_380,
        this_month: 1_640,
      },
      referrals: [
        { id: 'r1', name: 'M. K.', joined: Date.now() - 5 * 86400_000, status: 'active', commission: 109.80, challenge: '50K Standard 2-Step' },
        { id: 'r2', name: 'A. T.', joined: Date.now() - 8 * 86400_000, status: 'active', commission: 219.80, challenge: '100K Instant Funding' },
        { id: 'r3', name: 'L. V.', joined: Date.now() - 12 * 86400_000, status: 'funded', commission: 109.80, challenge: '50K Standard 2-Step' },
        { id: 'r4', name: 'R. D.', joined: Date.now() - 15 * 86400_000, status: 'breached', commission: 59.80, challenge: '50K Standard 2-Step' },
        { id: 'r5', name: 'S. H.', joined: Date.now() - 20 * 86400_000, status: 'active', commission: 219.80, challenge: '100K Instant Funding' },
      ],
      monthly: [
        { month: 'Aug', amount: 620 },
        { month: 'Sep', amount: 840 },
        { month: 'Oct', amount: 1_120 },
        { month: 'Nov', amount: 960 },
        { month: 'Dec', amount: 1_640 },
      ],
    }
    case 'engine/competitions': return [
      { id: 'c1', name: 'Monthly PnL Masters', description: 'Top 10 traders by profit percentage at month end win a share of the prize pool.', type: 'pnl', status: 'live', prize_pool: 50_000, entry_fee: 0, participants: 1_243, max_participants: null, starts_at: Date.now() - 12 * 86400_000, ends_at: Date.now() + 18 * 86400_000, prize_breakdown: [{ place: '1st', amount: 20_000 }, { place: '2nd', amount: 12_000 }, { place: '3rd', amount: 8_000 }, { place: '4th-10th', amount: 1_429 }], your_rank: 87, your_pct: 2.31, funded_only: false },
      { id: 'c2', name: 'Weekend Warriors', description: 'Highest win rate over the weekend (Fri-Sun) among traders with 10+ trades.', type: 'winrate', status: 'upcoming', prize_pool: 10_000, entry_fee: 0, participants: 342, max_participants: 500, starts_at: Date.now() + 2 * 86400_000, ends_at: Date.now() + 4 * 86400_000, prize_breakdown: [{ place: '1st', amount: 5_000 }, { place: '2nd', amount: 3_000 }, { place: '3rd', amount: 2_000 }], your_rank: null, your_pct: null, funded_only: false },
      { id: 'c3', name: 'Elite Volume Challenge', description: 'Invitation-only competition for funded traders. Compete on total notional volume.', type: 'volume', status: 'live', prize_pool: 100_000, entry_fee: 0, participants: 48, max_participants: 50, starts_at: Date.now() - 5 * 86400_000, ends_at: Date.now() + 25 * 86400_000, prize_breakdown: [{ place: '1st', amount: 50_000 }, { place: '2nd', amount: 30_000 }, { place: '3rd', amount: 20_000 }], your_rank: null, your_pct: null, funded_only: true },
      { id: 'c4', name: 'Q4 Grand Prix', description: 'Quarterly tournament - best overall risk-adjusted performance wins.', type: 'pnl', status: 'ended', prize_pool: 75_000, entry_fee: 0, participants: 2_100, max_participants: null, starts_at: Date.now() - 92 * 86400_000, ends_at: Date.now() - 2 * 86400_000, prize_breakdown: [{ place: '1st', amount: 30_000 }, { place: '2nd', amount: 20_000 }, { place: '3rd', amount: 15_000 }, { place: '4th-20th', amount: 625 }], your_rank: 14, your_pct: 6.87, funded_only: false },
    ]
    case 'misc/calendar': return []
    case 'admin/users': return Array.from({ length: 40 }, (_, i) => ({ id: `user-${i + 1}`, name: ['Alex Rivera','Jamie Chen','Sam Patel','Morgan Kim','Taylor Liu','Casey Wang','Riley Zhang','Drew Nguyen','Jordan Lee','Quinn Ma'][i % 10], email: `trader${i + 1}@example.com`, emailVerified: i % 5 !== 0, image: null, role: i === 0 ? 'admin' : 'user', banned: i % 12 === 0, banReason: i % 12 === 0 ? 'ToS violation' : null, banExpires: null, twoFactorEnabled: i % 3 === 0, createdAt: Date.now() - (40 - i) * 3 * 86400_000, updatedAt: Date.now() - i * 86400_000, lastSeen: Date.now() - Math.floor(Math.random() * 7 * 86400_000) }))
    case 'admin/accounts': return Array.from({ length: 55 }, (_, i) => ({ id: `acc-${i + 1}`, userId: `user-${(i % 40) + 1}`, userEmail: `trader${(i % 40) + 1}@example.com`, userName: ['Alex Rivera','Jamie Chen','Sam Patel','Morgan Kim','Taylor Liu'][i % 5], accountType: i % 7 === 0 ? 'demo' : 'prop', name: `Phase ${(i % 3) + 1} — Evaluation`, availableMargin: 200_000 - i * 1_000, reservedMargin: Math.random() * 10_000, totalMarginRequired: Math.random() * 8_000, injectedFunds: 0, baseCurrency: 'USD', defaultMarginMode: 'cross', isActive: i % 8 !== 0, isClosed: i % 8 === 0, accountStatus: ['active','active','active','funded','passed','breached'][i % 6], challengeTemplateId: `tmpl-${(i % 3) + 1}`, createdAt: Date.now() - (55 - i) * 2 * 86400_000, updatedAt: Date.now() - i * 3600_000 }))
    case 'admin/stats': return { total_users: 1_847, active_accounts: 1_243, funded_accounts: 38, breached_accounts: 94, total_deposited: 12_450_000, total_payouts_paid: 284_000, pending_payouts: 3, pending_payout_amount: 42_000, revenue_today: 18_600, revenue_month: 412_800, revenue_all_time: 3_140_000, new_signups_today: 23, new_signups_month: 612, churn_rate: 0.082, avg_account_lifetime_days: 47 }
    case 'admin/challenge-templates': return [ { id: 'tmpl-1', name: '100K Instant Funding', description: 'Single-phase instant funding', starting_balance: 100_000, base_currency: 'USD', entry_fee: 549, is_active: true, status: 'active', category: 'paid', account_count: 412, phase_sequence: [{ phase_number: 1, phase_type: 'evaluation', name: 'Phase 1', profit_target: 0.10, daily_loss_limit: 0.05, max_drawdown: 0.10, min_trading_days: 0, max_trading_days: null, profit_split: 0.80, leverage_limit: 100, news_trading_allowed: false, weekend_holding_allowed: true, martingale_detection_enabled: true }], created_at: Date.now() - 90 * 86400_000, updated_at: Date.now() - 5 * 86400_000 }, { id: 'tmpl-2', name: '50K Standard 2-Step', description: 'Classic two-phase evaluation', starting_balance: 50_000, base_currency: 'USD', entry_fee: 299, is_active: true, status: 'active', category: 'paid', account_count: 688, phase_sequence: [{ phase_number: 1, phase_type: 'evaluation', name: 'Phase 1', profit_target: 0.08, daily_loss_limit: 0.05, max_drawdown: 0.10, min_trading_days: 5, max_trading_days: 30, profit_split: 0, leverage_limit: 50, news_trading_allowed: false, weekend_holding_allowed: false, martingale_detection_enabled: true }, { phase_number: 2, phase_type: 'evaluation', name: 'Phase 2', profit_target: 0.05, daily_loss_limit: 0.05, max_drawdown: 0.10, min_trading_days: 5, max_trading_days: 60, profit_split: 0.80, leverage_limit: 50, news_trading_allowed: false, weekend_holding_allowed: false, martingale_detection_enabled: true }], created_at: Date.now() - 120 * 86400_000, updated_at: Date.now() - 10 * 86400_000 }, { id: 'tmpl-3', name: '200K Elite', description: 'For experienced traders', starting_balance: 200_000, base_currency: 'USD', entry_fee: 1_099, is_active: true, status: 'active', category: 'paid', account_count: 143, phase_sequence: [{ phase_number: 1, phase_type: 'evaluation', name: 'Phase 1', profit_target: 0.08, daily_loss_limit: 0.04, max_drawdown: 0.08, min_trading_days: 10, max_trading_days: 45, profit_split: 0, leverage_limit: 20, news_trading_allowed: false, weekend_holding_allowed: false, martingale_detection_enabled: true }, { phase_number: 2, phase_type: 'funded', name: 'Funded', profit_target: 0, daily_loss_limit: 0.04, max_drawdown: 0.08, min_trading_days: 0, max_trading_days: null, profit_split: 0.85, leverage_limit: 20, news_trading_allowed: false, weekend_holding_allowed: false, martingale_detection_enabled: true }], created_at: Date.now() - 60 * 86400_000, updated_at: Date.now() - 2 * 86400_000 } ]
    case 'admin/risk-metrics': return { total_open_exposure: 4_280_000, total_open_pnl: -38_400, max_single_account_exposure: 420_000, accounts_near_breach: 12, accounts_at_daily_limit: 4, breached_today: 2, largest_open_position: { symbol: 'BTC-USD', notional: 185_000, account_id: 'acc-7', direction: 'long' }, top_symbols_exposure: [{ symbol: 'BTC-USD', long_notional: 1_840_000, short_notional: 620_000, net: 1_220_000 }, { symbol: 'ETH-USD', long_notional: 980_000, short_notional: 440_000, net: 540_000 }, { symbol: 'SOL-USD', long_notional: 320_000, short_notional: 180_000, net: 140_000 }], drawdown_distribution: [{ bucket: '0-2%', count: 820 }, { bucket: '2-4%', count: 284 }, { bucket: '4-6%', count: 97 }, { bucket: '6-8%', count: 32 }, { bucket: '8-10%', count: 10 }] }
    default:
      if (path.startsWith('engine/candles') && req) {
        const symbol = req.nextUrl.searchParams.get('symbol') ?? 'BTC-USD'
        const interval = req.nextUrl.searchParams.get('interval') ?? '1h'
        const limit = Math.min(1000, parseInt(req.nextUrl.searchParams.get('limit') ?? '200'))
        return generateCandles(symbol, interval, limit)
      }
      return []
  }
}

// ─── Mock POST handlers ──────────────────────────────────────────────────────

export function handleMockPost(req: NextRequest, apiPath: string): HandlerResult {
  if (apiPath === 'auth/sign-in/email') {
    // Handled async below
    return null
  }
  if (apiPath === 'engine/orders') {
    // Handled async below
    return null
  }
  if (apiPath === 'engine/close-position') {
    // Handled async below
    return null
  }
  return null
}

export async function handleMockPostAsync(req: NextRequest, apiPath: string): Promise<HandlerResult> {
  // POST auth/sign-in/email
  if (apiPath === 'auth/sign-in/email') {
    const body = await req.json().catch(() => ({})) as { email?: string; password?: string }
    if (!body.email || !body.password || body.password.length < 6) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }
    const mockUser = { id: 'mock-user-id', name: body.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), email: body.email, emailVerified: true, image: null, role: body.email.includes('admin') ? 'admin' : 'user', banned: false, banReason: null, banExpires: null, twoFactorEnabled: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastSeen: Date.now() }
    const res = NextResponse.json({ token: `mock-token-${Date.now()}`, user: mockUser }, { status: 200 })
    res.cookies.set('vp-session', `mock-session-${Date.now()}`, { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })
    return res
  }

  if (apiPath === 'auth/sign-up/email') {
    const body = await req.json().catch(() => ({})) as { name?: string; email?: string; password?: string }
    if (!body.name || !body.email || !body.password || body.password.length < 8) {
      return NextResponse.json({ error: 'Please provide valid name, email, and password (min 8 chars).' }, { status: 400 })
    }
    return NextResponse.json({ user: { id: `user-${Date.now()}`, name: body.name, email: body.email, emailVerified: false, createdAt: new Date().toISOString() } }, { status: 201 })
  }

  if (apiPath === 'auth/sign-out') {
    const res = NextResponse.json({ success: true }, { status: 200 })
    res.cookies.set('vp-session', '', { maxAge: 0, path: '/' })
    return res
  }

  if (apiPath === 'engine/orders') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    return NextResponse.json({ id: orderId, account_id: body.account_id, symbol: body.symbol, direction: body.direction, order_type: body.order_type, quantity: body.quantity, leverage: body.leverage, margin_mode: body.margin_mode ?? 'cross', price: body.price ?? null, sl_price: body.sl_price ?? null, tp_price: body.tp_price ?? null, status: body.order_type === 'market' ? 'filled' : 'open', filled_quantity: body.order_type === 'market' ? body.quantity : 0, created_at: Date.now(), updated_at: Date.now() }, { status: 201 })
  }

  if (apiPath === 'engine/close-position') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const mockPnl = (Math.random() - 0.45) * 200
    return NextResponse.json({
      success:      true,
      position_id:  body.position_id,
      exit_price:   body.exit_price ?? 0,
      realized_pnl: mockPnl,
      close_fee:    0.5,
    })
  }

  return null
}

// ─── Mock GET handler ────────────────────────────────────────────────────────

export function handleMockGet(req: NextRequest, apiPath: string): NextResponse {
  const data = getMockData(apiPath, req)
  return NextResponse.json(data)
}
