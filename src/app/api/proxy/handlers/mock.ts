/**
 * Mock trading engine — fully stateful in-memory backend for dev/demo mode.
 *
 * This replaces the old static mock data. Every order, close, partial close,
 * and cancel modifies the in-memory state so the UI sees real changes.
 *
 * State lives as long as the Next.js process. A page refresh re-fetches from
 * the same in-memory state (positions persist). A server restart resets to seed.
 */

import { type NextRequest, NextResponse } from 'next/server'
import type { HandlerResult } from './shared'

// ─── Unique ID generator ────────────────────────────────────────────────────

let _idSeq = 0
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${(++_idSeq).toString(36)}`
}

// ─── Mock instrument definitions ────────────────────────────────────────────

interface InstrumentDef {
  price: number; bid: number; ask: number
  priceDec: number; qtyDec: number; type: string
  maxLev: number; minSize: number
}

const INSTRUMENT_DEFS: Record<string, InstrumentDef> = {
  '1INCH-USD': { price: 0.09283,  bid: 0.09282,  ask: 0.09284,  priceDec: 5, qtyDec: 2, type: 'crypto', maxLev: 20, minSize: 0.01 },
  'AAVE-USD':  { price: 122.550,  bid: 122.540,  ask: 122.560,  priceDec: 3, qtyDec: 2, type: 'crypto', maxLev: 20, minSize: 0.01 },
  'ADA-USD':   { price: 0.2738,   bid: 0.2737,   ask: 0.2739,   priceDec: 4, qtyDec: 2, type: 'crypto', maxLev: 20, minSize: 0.01 },
  'ARB-USD':   { price: 0.10420,  bid: 0.10419,  ask: 0.10421,  priceDec: 5, qtyDec: 2, type: 'crypto', maxLev: 20, minSize: 0.01 },
  'ASTER-USD': { price: 0.06917,  bid: 0.06916,  ask: 0.06918,  priceDec: 5, qtyDec: 2, type: 'crypto', maxLev: 20, minSize: 0.01 },
  'AUD-USD':   { price: 0.69584,  bid: 0.69583,  ask: 0.69585,  priceDec: 5, qtyDec: 2, type: 'forex',  maxLev: 100, minSize: 0.01 },
  'BTC-USD':   { price: 95420.5,  bid: 95419.0,  ask: 95421.0,  priceDec: 1, qtyDec: 5, type: 'crypto', maxLev: 20, minSize: 0.001 },
  'DOGE-USD':  { price: 0.15320,  bid: 0.15318,  ask: 0.15321,  priceDec: 5, qtyDec: 2, type: 'crypto', maxLev: 20, minSize: 0.01 },
  'ETH-USD':   { price: 3450.25,  bid: 3449.75,  ask: 3450.75,  priceDec: 2, qtyDec: 4, type: 'crypto', maxLev: 20, minSize: 0.001 },
  'EUR-USD':   { price: 1.08432,  bid: 1.08431,  ask: 1.08433,  priceDec: 5, qtyDec: 2, type: 'forex',  maxLev: 100, minSize: 0.01 },
  'GBP-USD':   { price: 1.26750,  bid: 1.26748,  ask: 1.26752,  priceDec: 5, qtyDec: 2, type: 'forex',  maxLev: 100, minSize: 0.01 },
  'LINK-USD':  { price: 14.8320,  bid: 14.8310,  ask: 14.8330,  priceDec: 4, qtyDec: 3, type: 'crypto', maxLev: 20, minSize: 0.01 },
  'SOL-USD':   { price: 185.320,  bid: 185.310,  ask: 185.330,  priceDec: 3, qtyDec: 3, type: 'crypto', maxLev: 20, minSize: 0.001 },
  'XRP-USD':   { price: 2.34560,  bid: 2.34550,  ask: 2.34570,  priceDec: 5, qtyDec: 3, type: 'crypto', maxLev: 20, minSize: 0.01 },
}

// ─── Price engine with random walk ──────────────────────────────────────────
// priceState lives in globalThis via state.priceState (see MockState)

function jitterPrice(symbol: string): number {
  const def = INSTRUMENT_DEFS[symbol]
  if (!def) return 0
  const base = def.price
  const volatility = base * 0.0003
  const cur = state.priceState[symbol] ?? base
  state.priceState[symbol] = Math.max(
    base * 0.97,
    Math.min(base * 1.03, cur + (Math.random() - 0.5) * 2 * volatility)
  )
  return state.priceState[symbol]
}

function getInstruments() {
  return Object.entries(INSTRUMENT_DEFS).map(([symbol, v]) => {
    const price = jitterPrice(symbol)
    const halfSpread = Math.pow(10, -v.priceDec)
    return {
      id: symbol, symbol, instrument_type: v.type,
      base_currency: symbol.split('-')[0], quote_currency: 'USD',
      margin_requirement: v.type === 'forex' ? 0.001 : 0.01,
      min_order_size: v.minSize, max_leverage: v.maxLev,
      tick_size: Math.pow(10, -v.priceDec), lot_size: v.type === 'forex' ? 1000 : 0.001,
      price_decimals: v.priceDec, qty_decimals: v.qtyDec,
      is_tradable: true, is_active: true, orderbook_enabled: false, trades_enabled: false,
      current_price: price, current_bid: price - halfSpread, current_ask: price + halfSpread,
      mark_price: price, funding_rate: -0.0002,
      next_funding_time: Date.now() + 4 * 3600_000, last_updated: Date.now(),
    }
  })
}

function getCurrentPrice(symbol: string): number {
  return state.priceState[symbol] ?? INSTRUMENT_DEFS[symbol]?.price ?? 0
}
function getBidPrice(symbol: string): number {
  const p = getCurrentPrice(symbol)
  const dec = INSTRUMENT_DEFS[symbol]?.priceDec ?? 5
  return p - Math.pow(10, -dec)
}
function getAskPrice(symbol: string): number {
  const p = getCurrentPrice(symbol)
  const dec = INSTRUMENT_DEFS[symbol]?.priceDec ?? 5
  return p + Math.pow(10, -dec)
}

// ─── In-memory trading state ────────────────────────────────────────────────

const ACCOUNT_ID = 'f2538dee-cfb0-422a-bf7b-c6b247145b3a'
const STARTING_BALANCE = 200_000

interface MockPosition {
  id: string; account_id: string
  instrument_config: string; instrument_price: string; symbol: string
  direction: 'long' | 'short'; quantity: number; leverage: number
  entry_price: number; entry_timestamp: number
  exit_price: number | null; exit_timestamp: number | null
  liquidation_price: number; status: 'open' | 'closed'
  close_reason: string | null; margin_mode: string
  isolated_margin: number; isolated_wallet: null
  realized_pnl: number; trade_fees: number; overnight_fees: number
  funding_fees: number; total_fees: number; total_funding: number
  linked_orders: null; original_quantity: number | null
  sl_price: number | null; tp_price: number | null
  trailing_stop_distance: number | null
  created_at: number; updated_at: number
}

interface MockOrder {
  id: string; account_id: string; symbol: string
  direction: 'long' | 'short'; order_type: string
  quantity: number; leverage: number
  price: number | null; stop_price: number | null
  sl_price: number | null; tp_price: number | null
  margin_mode: string; status: string; filled_quantity: number
  position_id: string | null
  created_at: number; updated_at: number
}

interface MockActivity {
  id: string; type: string; title: string; sub: string
  ts: number; pnl: number | null
}

// ── Shared state via globalThis ──────────────────────────────────────────────
// Turbopack may create separate module instances per route bundle.
// Using globalThis guarantees the same state object is shared across
// /api/proxy/[...path] and /api/prices/stream routes.

interface MockState {
  positions: MockPosition[]
  closedPositions: MockPosition[]
  orders: MockOrder[]
  activity: MockActivity[]
  realizedPnl: number
  totalFeesPaid: number
  initialized: boolean
  positionMap: Map<string, MockPosition>
  orderMap: Map<string, MockOrder>
  _accountCache: AccountSnapshot | null
  _accountCacheVersion: number
  _stateVersion: number
  priceState: Record<string, number>
}

interface AccountSnapshot {
  id: string; user_id: string; name: string
  account_type: string; account_type_config: string; base_currency: string
  default_margin_mode: string; starting_balance: number
  available_margin: number; reserved_margin: number; total_margin_required: number
  injected_funds: number; net_worth: number; total_pnl: number
  unrealized_pnl: number; realized_pnl: number
  is_active: boolean; is_closed: boolean; account_status: string
  challenge_template_id: string; created_at: number; updated_at: number
}

const G = globalThis as unknown as { __mockState?: MockState }
if (!G.__mockState) {
  G.__mockState = {
    positions: [],
    closedPositions: [],
    orders: [],
    activity: [],
    realizedPnl: 0,
    totalFeesPaid: 0,
    initialized: false,
    positionMap: new Map(),
    orderMap: new Map(),
    _accountCache: null,
    _accountCacheVersion: 0,
    _stateVersion: 0,
    priceState: Object.fromEntries(
      Object.entries(INSTRUMENT_DEFS).map(([sym, v]) => [sym, v.price])
    ),
  }
}
const state = G.__mockState
const positionMap = state.positionMap
const orderMap = state.orderMap

function rebuildPositionMap() {
  positionMap.clear()
  for (const p of state.positions) positionMap.set(p.id, p)
}
function rebuildOrderMap() {
  orderMap.clear()
  for (const o of state.orders) orderMap.set(o.id, o)
}

function invalidateAccountCache() { state._stateVersion++ }

function initState() {
  if (state.initialized) return
  state.initialized = true

  // Start clean — no seed positions so the user can test the full flow
  state.positions = []
  state.closedPositions = []
  state.orders = []
  state.activity = [
    { id: uid('act'), type: 'system', title: 'Account created', sub: `$${STARTING_BALANCE.toLocaleString()} evaluation account`, ts: Date.now() - 24 * 3600_000, pnl: null },
  ]
  state.realizedPnl = 0
  state.totalFeesPaid = 0

  // Start the matching engine tick loop (runs independently of SSE connections).
  // Checks SL/TP/trailing stop every 500ms. Uses a globalThis guard so only
  // one interval runs even if multiple route bundles import this module.
  const GT = globalThis as unknown as { __tickRunning?: boolean }
  if (!GT.__tickRunning) {
    GT.__tickRunning = true
    setInterval(() => {
      try { tickEngine() } catch { /* swallow */ }
    }, 500)
  }
}

// ─── Account computations ───────────────────────────────────────────────────

function computeAccount(): AccountSnapshot {
  initState()

  // Return cached result if state hasn't changed
  if (state._accountCache && state._accountCacheVersion === state._stateVersion) return state._accountCache

  const totalMarginUsed = state.positions.reduce((s, p) => s + p.isolated_margin, 0)

  let unrealizedPnl = 0
  for (const pos of state.positions) {
    const mp = getCurrentPrice(pos.symbol)
    const diff = pos.direction === 'long'
      ? (mp - pos.entry_price) * pos.quantity * pos.leverage
      : (pos.entry_price - mp) * pos.quantity * pos.leverage
    unrealizedPnl += diff
  }

  const netWorth = STARTING_BALANCE + state.realizedPnl + unrealizedPnl - state.totalFeesPaid
  const availableMargin = netWorth - totalMarginUsed

  const result = {
    id: ACCOUNT_ID, user_id: 'mock-user-id', name: 'Phase 1 — Evaluation',
    account_type: 'prop', account_type_config: 'mock-template-id', base_currency: 'USD',
    default_margin_mode: 'cross', starting_balance: STARTING_BALANCE,
    available_margin: Math.max(0, availableMargin),
    reserved_margin: 0,
    total_margin_required: totalMarginUsed,
    injected_funds: STARTING_BALANCE,
    net_worth: netWorth,
    total_pnl: state.realizedPnl,
    unrealized_pnl: unrealizedPnl,
    realized_pnl: state.realizedPnl,
    is_active: true, is_closed: false, account_status: 'active',
    challenge_template_id: 'mock-template-id',
    created_at: Date.now() - 30 * 86400_000, updated_at: Date.now(),
  }

  state._accountCache = result
  state._accountCacheVersion = state._stateVersion
  return result
}

// ─── Liquidation price calculator ───────────────────────────────────────────

function calcLiqPrice(direction: 'long' | 'short', entryPrice: number, leverage: number): number {
  const pct = 1 / leverage
  return direction === 'long'
    ? entryPrice * (1 - pct * 0.95)
    : entryPrice * (1 + pct * 0.95)
}

// ─── Fee rate (0.07% per trade) ─────────────────────────────────────────────

const FEE_RATE = 0.0007

// ─── Candle generator ───────────────────────────────────────────────────────

function generateCandles(symbol: string, interval: string, limit: number) {
  const basePrice = getCurrentPrice(symbol) || 100
  const ms: Record<string, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000, '1w': 604_800_000 }
  const intervalMs = ms[interval] ?? 3_600_000
  const candles = []; let price = basePrice * (1 - 0.02 * Math.random())
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

// ─── Equity history ─────────────────────────────────────────────────────────

function generateEquityHistory() {
  const days = 30
  let equity = STARTING_BALANCE
  const now = Date.now()
  const DAY = 86_400_000
  const history = Array.from({ length: days }, (_, i) => {
    const change = (Math.random() - 0.42) * equity * 0.008
    equity = Math.max(STARTING_BALANCE * 0.88, equity + change)
    return { ts: now - (days - 1 - i) * DAY, equity: parseFloat(equity.toFixed(2)), pnl: parseFloat((equity - STARTING_BALANCE).toFixed(2)) }
  })
  // Append current state as latest point
  const acct = computeAccount()
  history.push({ ts: now, equity: acct.net_worth, pnl: acct.total_pnl })
  return history
}

// ─── Mock GET data dispatcher ───────────────────────────────────────────────

function getMockData(path: string, req?: NextRequest): unknown {
  initState()

  switch (path) {
    case 'auth/get-session':
      return { session: { expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString(), token: 'mock-token', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ipAddress: '127.0.0.1', userAgent: 'VerticalProp-Clone', userId: 'mock-user-id' }, user: { id: 'mock-user-id', email: 'trader@example.com', name: 'Jules Trader', emailVerified: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }

    case 'actions/accounts':
      return [computeAccount()]

    case 'engine/trading-data': {
      const li = getInstruments()
      return {
        account: computeAccount(),
        positions: state.positions.filter(p => p.status === 'open'),
        instruments: li,
        prices: Object.fromEntries(li.map(i => [i.symbol, i.current_price])),
      }
    }

    case 'engine/instruments':
      return getInstruments()

    case 'engine/positions':
      return state.positions.filter(p => p.status === 'open')

    case 'engine/closed-positions':
      return [...state.closedPositions].reverse()

    case 'engine/orders':
      return state.orders.filter(o => o.status === 'pending' || o.status === 'partial')

    case 'engine/equity-history':
      return generateEquityHistory()

    case 'engine/activity':
      return [...state.activity].reverse().slice(0, 50)

    case 'engine/challenge-status': {
      const acct = computeAccount()
      return {
        account_id: ACCOUNT_ID, phase: 1, status: 'active',
        profit_target: 0.08, daily_loss_limit: 0.05, max_drawdown: 0.10,
        current_profit: STARTING_BALANCE > 0 ? state.realizedPnl / STARTING_BALANCE : 0,
        current_daily_loss: 0,
        current_drawdown: Math.max(0, (STARTING_BALANCE - acct.net_worth) / STARTING_BALANCE),
        trading_days: Math.min(state.closedPositions.length, 30),
        min_trading_days: 5,
        started_at: Date.now() - 24 * 3600_000, ends_at: null,
      }
    }

    case 'leaderboard':
      return Array.from({ length: 20 }, (_, i) => ({ rank: i + 1, user_id: `user-${i + 1}`, username: `Trader${String(i + 1).padStart(3, '0')}`, avatar_url: null, account_id: `acc-${i + 1}`, profit_pct: parseFloat((8.5 - i * 0.3).toFixed(2)), profit_amount: parseFloat((17_000 - i * 600).toFixed(2)), trading_days: Math.max(5, 20 - i), challenge_type: ['instant', '1-step', '2-step'][i % 3], is_funded: i < 3 }))

    case 'engine/payouts':
      return [
        { id: 'p1', account_id: ACCOUNT_ID, user_id: 'mock-user-id', amount: 3200, status: 'paid', method: 'crypto', wallet_address: '0xaB3c...8dF1', tx_hash: '0xabc123def456', admin_note: null, requested_at: Date.now() - 14 * 86400_000, processed_at: Date.now() - 12 * 86400_000, created_at: Date.now() - 14 * 86400_000, updated_at: Date.now() - 12 * 86400_000 },
        { id: 'p2', account_id: ACCOUNT_ID, user_id: 'mock-user-id', amount: 1800, status: 'approved', method: 'crypto', wallet_address: '0xaB3c...8dF1', tx_hash: null, admin_note: null, requested_at: Date.now() - 3 * 86400_000, processed_at: Date.now() - 1 * 86400_000, created_at: Date.now() - 3 * 86400_000, updated_at: Date.now() - 1 * 86400_000 },
      ]

    case 'admin/payouts':
      return [
        { id: 'p3', account_id: ACCOUNT_ID, user_id: 'mock-user-id', user_name: 'Jules Trader', user_email: 'trader@example.com', amount: 5500, status: 'pending', method: 'crypto', wallet_address: '0xaB3c...8dF1', tx_hash: null, admin_note: null, requested_at: Date.now() - 1 * 86400_000, processed_at: null, created_at: Date.now() - 1 * 86400_000, updated_at: Date.now() - 1 * 86400_000 },
      ]

    case 'engine/affiliate':
      return {
        stats: { affiliate_code: 'TEDA-JULES', affiliate_link: 'https://app.teda.com/register?ref=TEDA-JULES', commission_rate: 0.20, total_referrals: 47, active_referrals: 31, total_earned: 8_240, pending_commission: 1_380, this_month: 1_640 },
        referrals: [
          { id: 'r1', name: 'M. K.', joined: Date.now() - 5 * 86400_000, status: 'active', commission: 109.80, challenge: '50K Standard 2-Step' },
          { id: 'r2', name: 'A. T.', joined: Date.now() - 8 * 86400_000, status: 'active', commission: 219.80, challenge: '100K Instant Funding' },
          { id: 'r3', name: 'L. V.', joined: Date.now() - 12 * 86400_000, status: 'funded', commission: 109.80, challenge: '50K Standard 2-Step' },
          { id: 'r4', name: 'R. D.', joined: Date.now() - 15 * 86400_000, status: 'breached', commission: 59.80, challenge: '50K Standard 2-Step' },
          { id: 'r5', name: 'S. H.', joined: Date.now() - 20 * 86400_000, status: 'active', commission: 219.80, challenge: '100K Instant Funding' },
        ],
        monthly: [
          { month: 'Aug', amount: 620 }, { month: 'Sep', amount: 840 },
          { month: 'Oct', amount: 1_120 }, { month: 'Nov', amount: 960 }, { month: 'Dec', amount: 1_640 },
        ],
      }

    case 'engine/competitions':
      return [
        { id: 'c1', name: 'Monthly PnL Masters', description: 'Top 10 traders by profit percentage at month end win a share of the prize pool.', type: 'pnl', status: 'live', prize_pool: 50_000, entry_fee: 0, participants: 1_243, max_participants: null, starts_at: Date.now() - 12 * 86400_000, ends_at: Date.now() + 18 * 86400_000, prize_breakdown: [{ place: '1st', amount: 20_000 }, { place: '2nd', amount: 12_000 }, { place: '3rd', amount: 8_000 }, { place: '4th-10th', amount: 1_429 }], your_rank: 87, your_pct: 2.31, funded_only: false },
        { id: 'c2', name: 'Weekend Warriors', description: 'Highest win rate over the weekend.', type: 'winrate', status: 'upcoming', prize_pool: 10_000, entry_fee: 0, participants: 342, max_participants: 500, starts_at: Date.now() + 2 * 86400_000, ends_at: Date.now() + 4 * 86400_000, prize_breakdown: [{ place: '1st', amount: 5_000 }, { place: '2nd', amount: 3_000 }, { place: '3rd', amount: 2_000 }], your_rank: null, your_pct: null, funded_only: false },
        { id: 'c3', name: 'Elite Volume Challenge', description: 'Invitation-only competition for funded traders.', type: 'volume', status: 'live', prize_pool: 100_000, entry_fee: 0, participants: 48, max_participants: 50, starts_at: Date.now() - 5 * 86400_000, ends_at: Date.now() + 25 * 86400_000, prize_breakdown: [{ place: '1st', amount: 50_000 }, { place: '2nd', amount: 30_000 }, { place: '3rd', amount: 20_000 }], your_rank: null, your_pct: null, funded_only: true },
      ]

    case 'misc/calendar': return []

    case 'admin/users': return Array.from({ length: 40 }, (_, i) => ({ id: `user-${i + 1}`, name: ['Alex Rivera','Jamie Chen','Sam Patel','Morgan Kim','Taylor Liu','Casey Wang','Riley Zhang','Drew Nguyen','Jordan Lee','Quinn Ma'][i % 10], email: `trader${i + 1}@example.com`, emailVerified: i % 5 !== 0, image: null, role: i === 0 ? 'admin' : 'user', banned: i % 12 === 0, banReason: i % 12 === 0 ? 'ToS violation' : null, banExpires: null, twoFactorEnabled: i % 3 === 0, createdAt: Date.now() - (40 - i) * 3 * 86400_000, updatedAt: Date.now() - i * 86400_000, lastSeen: Date.now() - Math.floor(Math.random() * 7 * 86400_000) }))
    case 'admin/accounts': return Array.from({ length: 55 }, (_, i) => ({ id: `acc-${i + 1}`, userId: `user-${(i % 40) + 1}`, userEmail: `trader${(i % 40) + 1}@example.com`, userName: ['Alex Rivera','Jamie Chen','Sam Patel','Morgan Kim','Taylor Liu'][i % 5], accountType: i % 7 === 0 ? 'demo' : 'prop', name: `Phase ${(i % 3) + 1} — Evaluation`, availableMargin: 200_000 - i * 1_000, reservedMargin: Math.random() * 10_000, totalMarginRequired: Math.random() * 8_000, injectedFunds: 0, baseCurrency: 'USD', defaultMarginMode: 'cross', isActive: i % 8 !== 0, isClosed: i % 8 === 0, accountStatus: ['active','active','active','funded','passed','breached'][i % 6], challengeTemplateId: `tmpl-${(i % 3) + 1}`, createdAt: Date.now() - (55 - i) * 2 * 86400_000, updatedAt: Date.now() - i * 3600_000 }))
    case 'admin/stats': return { total_users: 1_847, active_accounts: 1_243, funded_accounts: 38, breached_accounts: 94, total_deposited: 12_450_000, total_payouts_paid: 284_000, pending_payouts: 3, pending_payout_amount: 42_000, revenue_today: 18_600, revenue_month: 412_800, revenue_all_time: 3_140_000, new_signups_today: 23, new_signups_month: 612, churn_rate: 0.082, avg_account_lifetime_days: 47 }
    case 'admin/challenge-templates': return [ { id: 'tmpl-1', name: '100K Instant Funding', description: 'Single-phase instant funding', starting_balance: 100_000, base_currency: 'USD', entry_fee: 549, is_active: true, status: 'active', category: 'paid', account_count: 412, phase_sequence: [{ phase_number: 1, phase_type: 'evaluation', name: 'Phase 1', profit_target: 0.10, daily_loss_limit: 0.05, max_drawdown: 0.10, min_trading_days: 0, max_trading_days: null, profit_split: 0.80, leverage_limit: 100, news_trading_allowed: false, weekend_holding_allowed: true, martingale_detection_enabled: true }], created_at: Date.now() - 90 * 86400_000, updated_at: Date.now() - 5 * 86400_000 }, { id: 'tmpl-2', name: '50K Standard 2-Step', description: 'Classic two-phase evaluation', starting_balance: 50_000, base_currency: 'USD', entry_fee: 299, is_active: true, status: 'active', category: 'paid', account_count: 688, phase_sequence: [{ phase_number: 1, phase_type: 'evaluation', name: 'Phase 1', profit_target: 0.08, daily_loss_limit: 0.05, max_drawdown: 0.10, min_trading_days: 5, max_trading_days: 30, profit_split: 0 }, { phase_number: 2, phase_type: 'evaluation', name: 'Phase 2', profit_target: 0.05, daily_loss_limit: 0.05, max_drawdown: 0.10, min_trading_days: 5, max_trading_days: 60, profit_split: 0.80 }], created_at: Date.now() - 120 * 86400_000, updated_at: Date.now() - 10 * 86400_000 }, { id: 'tmpl-3', name: '200K Elite', description: 'For experienced traders', starting_balance: 200_000, base_currency: 'USD', entry_fee: 1_099, is_active: true, status: 'active', category: 'paid', account_count: 143, phase_sequence: [{ phase_number: 1, phase_type: 'evaluation', name: 'Phase 1', profit_target: 0.08, daily_loss_limit: 0.04, max_drawdown: 0.08, min_trading_days: 10, max_trading_days: 45, profit_split: 0 }, { phase_number: 2, phase_type: 'funded', name: 'Funded', profit_target: 0, daily_loss_limit: 0.04, max_drawdown: 0.08, min_trading_days: 0, max_trading_days: null, profit_split: 0.85 }], created_at: Date.now() - 60 * 86400_000, updated_at: Date.now() - 2 * 86400_000 } ]
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

// ─── Mock POST handlers (stateful) ──────────────────────────────────────────

export async function handleMockPostAsync(req: NextRequest, apiPath: string): Promise<HandlerResult> {
  initState()

  // ── Auth: sign-in ─────────────────────────────────────────────────────────
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

  // ── Place order ───────────────────────────────────────────────────────────
  if (apiPath === 'engine/orders') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const now = Date.now()

    const symbol    = String(body.symbol ?? '')
    const direction = String(body.direction ?? '') as 'long' | 'short'
    const orderType = String(body.order_type ?? 'market')
    const qty       = Number(body.quantity ?? 0)
    const defLookup = INSTRUMENT_DEFS[symbol]
    const leverage  = Math.min(defLookup?.maxLev ?? 100, Math.max(1, Number(body.leverage ?? 1)))
    const def       = defLookup

    if (!def) return NextResponse.json({ message: 'Unknown symbol' }, { status: 400 })
    if (!['long', 'short'].includes(direction)) return NextResponse.json({ message: 'Invalid direction' }, { status: 400 })
    if (qty <= 0) return NextResponse.json({ message: 'Invalid quantity' }, { status: 400 })
    if (qty < def.minSize) return NextResponse.json({ message: `Minimum order size is ${def.minSize}` }, { status: 400 })

    const slPrice = body.sl_price ? Number(body.sl_price) : null
    const tpPrice = body.tp_price ? Number(body.tp_price) : null
    const trailingDist = body.trailing_stop_distance ? Number(body.trailing_stop_distance) : null

    if (orderType === 'market') {
      // Execute immediately at bid/ask
      const execPrice = direction === 'long' ? getAskPrice(symbol) : getBidPrice(symbol)
      const notional  = execPrice * qty
      const margin    = notional / leverage
      const fee       = notional * FEE_RATE

      // Check margin
      const acct = computeAccount()
      if (margin > acct.available_margin) {
        return NextResponse.json({ message: 'Insufficient margin' }, { status: 422 })
      }

      const liqPrice = calcLiqPrice(direction, execPrice, leverage)
      const posId = uid('pos')

      const position: MockPosition = {
        id: posId, account_id: ACCOUNT_ID,
        instrument_config: symbol, instrument_price: symbol, symbol,
        direction, quantity: qty, leverage,
        entry_price: execPrice, entry_timestamp: now,
        exit_price: null, exit_timestamp: null,
        liquidation_price: liqPrice, status: 'open',
        close_reason: null, margin_mode: String(body.margin_mode ?? 'cross'),
        isolated_margin: margin, isolated_wallet: null,
        realized_pnl: 0, trade_fees: fee, overnight_fees: 0,
        funding_fees: 0, total_fees: fee, total_funding: 0,
        linked_orders: null, original_quantity: qty,
        sl_price: slPrice, tp_price: tpPrice,
        trailing_stop_distance: trailingDist,
        created_at: now, updated_at: now,
      }

      state.positions.push(position)
      positionMap.set(posId, position)
      state.totalFeesPaid += fee
      invalidateAccountCache()

      const pDec = def.priceDec
      state.activity.push({
        id: uid('act'), type: 'position',
        title: `${direction === 'long' ? 'Long' : 'Short'} ${symbol} opened`,
        sub: `${qty} @ $${execPrice.toFixed(pDec)} · ${leverage}x`,
        ts: now, pnl: null,
      })

      return NextResponse.json({
        id: posId, account_id: ACCOUNT_ID, symbol, direction,
        order_type: 'market', quantity: qty, leverage,
        margin_mode: body.margin_mode ?? 'cross',
        price: execPrice, sl_price: slPrice, tp_price: tpPrice,
        status: 'filled', filled_quantity: qty,
        created_at: now, updated_at: now,
      }, { status: 201 })
    }

    // ── Pending order (limit / stop) ──────────────────────────────────────
    const limitPrice = Number(body.price ?? 0)
    if (limitPrice <= 0) return NextResponse.json({ message: 'Price required for pending orders' }, { status: 422 })

    const orderId = uid('ord')
    const order: MockOrder = {
      id: orderId, account_id: ACCOUNT_ID, symbol, direction,
      order_type: orderType, quantity: qty, leverage,
      price: orderType === 'limit' ? limitPrice : null,
      stop_price: orderType === 'stop' ? limitPrice : null,
      sl_price: slPrice, tp_price: tpPrice,
      margin_mode: String(body.margin_mode ?? 'cross'),
      status: 'pending', filled_quantity: 0, position_id: null,
      created_at: now, updated_at: now,
    }
    state.orders.push(order)
    orderMap.set(orderId, order)

    state.activity.push({
      id: uid('act'), type: 'order',
      title: `${orderType === 'limit' ? 'Limit' : 'Stop'} ${direction === 'long' ? 'Buy' : 'Sell'} ${symbol}`,
      sub: `${qty} @ $${limitPrice.toFixed(def.priceDec)} · ${leverage}x`,
      ts: now, pnl: null,
    })

    return NextResponse.json({
      id: orderId, account_id: ACCOUNT_ID, symbol, direction,
      order_type: orderType, quantity: qty, leverage,
      margin_mode: body.margin_mode ?? 'cross',
      price: limitPrice, sl_price: slPrice, tp_price: tpPrice,
      status: 'pending', filled_quantity: 0,
      created_at: now, updated_at: now,
    }, { status: 201 })
  }

  // ── Close position ────────────────────────────────────────────────────────
  if (apiPath === 'engine/close-position') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const posId = String(body.position_id ?? '')

    const pos = positionMap.get(posId)
    if (!pos || pos.status !== 'open') return NextResponse.json({ error: 'Position not found or already closed' }, { status: 404 })
    const idx = state.positions.indexOf(pos)
    if (idx === -1) return NextResponse.json({ error: 'Position not found or already closed' }, { status: 404 })
    const now = Date.now()
    const def = INSTRUMENT_DEFS[pos.symbol]
    const exitPrice = pos.direction === 'long' ? getBidPrice(pos.symbol) : getAskPrice(pos.symbol)

    const priceDiff = pos.direction === 'long'
      ? exitPrice - pos.entry_price
      : pos.entry_price - exitPrice
    const realizedPnl = priceDiff * pos.quantity * pos.leverage
    const closeFee = exitPrice * pos.quantity * FEE_RATE

    // Update position
    pos.status = 'closed'
    pos.exit_price = exitPrice
    pos.exit_timestamp = now
    pos.realized_pnl = realizedPnl
    pos.total_fees += closeFee
    pos.close_reason = 'manual'
    pos.updated_at = now

    // Move from open to closed
    state.positions.splice(idx, 1)
    positionMap.delete(posId)
    state.closedPositions.push({ ...pos })   // deep copy to avoid shared refs

    // Update account state
    state.realizedPnl += realizedPnl
    state.totalFeesPaid += closeFee
    invalidateAccountCache()

    const pDec = def?.priceDec ?? 2
    const pnlStr = realizedPnl >= 0 ? `+$${realizedPnl.toFixed(2)}` : `-$${Math.abs(realizedPnl).toFixed(2)}`
    state.activity.push({
      id: uid('act'), type: 'closed',
      title: `${pos.direction === 'long' ? 'Long' : 'Short'} ${pos.symbol} closed`,
      sub: `${pos.quantity} @ $${exitPrice.toFixed(pDec)} · ${pnlStr}`,
      ts: now, pnl: realizedPnl,
    })

    return NextResponse.json({
      success: true, position_id: posId,
      exit_price: exitPrice, realized_pnl: realizedPnl, close_fee: closeFee,
    })
  }

  // ── Partial close ─────────────────────────────────────────────────────────
  if (apiPath === 'engine/partial-close') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const posId   = String(body.position_id ?? '')
    const closeQty = Number(body.quantity ?? 0)

    const pos = positionMap.get(posId)
    if (!pos || pos.status !== 'open') return NextResponse.json({ error: 'Position not found or already closed' }, { status: 404 })
    if (closeQty <= 0 || closeQty >= pos.quantity) {
      return NextResponse.json({ error: 'Invalid partial close quantity' }, { status: 400 })
    }

    const now = Date.now()
    const def = INSTRUMENT_DEFS[pos.symbol]
    const exitPrice = pos.direction === 'long' ? getBidPrice(pos.symbol) : getAskPrice(pos.symbol)

    const priceDiff = pos.direction === 'long'
      ? exitPrice - pos.entry_price
      : pos.entry_price - exitPrice
    const partialPnl = priceDiff * closeQty * pos.leverage
    const closeFee   = exitPrice * closeQty * FEE_RATE

    const marginFraction = closeQty / pos.quantity
    const releasedMargin = pos.isolated_margin * marginFraction

    // Update position (reduce size)
    pos.quantity -= closeQty
    pos.isolated_margin -= releasedMargin
    pos.total_fees += closeFee
    pos.updated_at = now

    // Update account
    state.realizedPnl += partialPnl
    state.totalFeesPaid += closeFee
    invalidateAccountCache()

    const pDec = def?.priceDec ?? 2
    const pnlStr = partialPnl >= 0 ? `+$${partialPnl.toFixed(2)}` : `-$${Math.abs(partialPnl).toFixed(2)}`
    state.activity.push({
      id: uid('act'), type: 'closed',
      title: `${pos.direction === 'long' ? 'Long' : 'Short'} ${pos.symbol} partial close`,
      sub: `${closeQty} lots @ $${exitPrice.toFixed(pDec)} · ${pnlStr}`,
      ts: now, pnl: partialPnl,
    })

    return NextResponse.json({
      success: true, position_id: posId,
      closed_quantity: closeQty, remaining_qty: pos.quantity,
      exit_price: exitPrice, realized_pnl: partialPnl, close_fee: closeFee,
    })
  }

  // ── Cancel order ──────────────────────────────────────────────────────────
  if (apiPath === 'engine/cancel-order') {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>
    const orderId = String(body.order_id ?? '')

    const order = orderMap.get(orderId)
    if (!order || (order.status !== 'pending' && order.status !== 'partial'))
      return NextResponse.json({ error: 'Order not found or already cancelled' }, { status: 404 })

    order.status = 'cancelled'
    order.updated_at = Date.now()

    state.activity.push({
      id: uid('act'), type: 'order',
      title: `${order.order_type} order cancelled`,
      sub: `${order.direction === 'long' ? 'Buy' : 'Sell'} ${order.quantity} ${order.symbol}`,
      ts: Date.now(), pnl: null,
    })

    return NextResponse.json({ success: true, order_id: orderId })
  }

  return null
}

// For backwards compatibility (unused sync version)
export function handleMockPost(_req: NextRequest, _apiPath: string): HandlerResult {
  return null
}

// ─── SSE exports: price stream + tick engine ────────────────────────────────

/**
 * Returns jittered prices for all 14 instruments.
 * Called by the SSE /api/prices/stream endpoint every 500ms.
 */
export function getAllCurrentPrices(): Record<string, number> {
  initState()
  return Object.fromEntries(
    Object.keys(INSTRUMENT_DEFS).map(sym => [sym, jitterPrice(sym)])
  )
}

/**
 * Matching engine tick — runs on every SSE price push (500ms).
 *
 * 1. Trailing stop adjustment: move SL in the direction of profit
 * 2. SL/TP auto-close: if market price hits SL or TP, close the position
 *
 * Positions are closed in reverse order to preserve array indices.
 */
export function tickEngine(): void {
  initState()
  if (state.positions.length === 0) return

  const toClose: { pos: MockPosition; idx: number; reason: string }[] = []

  for (let i = state.positions.length - 1; i >= 0; i--) {
    const pos = state.positions[i]
    if (pos.status !== 'open') continue

    const price = getCurrentPrice(pos.symbol)
    if (!price || price <= 0) continue

    // ── 1. Trailing stop update ──────────────────────────────────────────
    if (pos.trailing_stop_distance != null && pos.trailing_stop_distance > 0) {
      if (pos.direction === 'long') {
        const newSl = price - pos.trailing_stop_distance
        if (pos.sl_price == null || newSl > pos.sl_price) {
          pos.sl_price = newSl
          pos.updated_at = Date.now()
        }
      } else {
        const newSl = price + pos.trailing_stop_distance
        if (pos.sl_price == null || newSl < pos.sl_price) {
          pos.sl_price = newSl
          pos.updated_at = Date.now()
        }
      }
    }

    // ── 2. Check SL hit ─────────────────────────────────────────────────
    if (pos.sl_price != null) {
      const slHit = pos.direction === 'long'
        ? price <= pos.sl_price
        : price >= pos.sl_price
      if (slHit) {
        toClose.push({ pos, idx: i, reason: 'sl' })
        continue
      }
    }

    // ── 3. Check TP hit ─────────────────────────────────────────────────
    if (pos.tp_price != null) {
      const tpHit = pos.direction === 'long'
        ? price >= pos.tp_price
        : price <= pos.tp_price
      if (tpHit) {
        toClose.push({ pos, idx: i, reason: 'tp' })
        continue
      }
    }
  }

  // ── Close positions (already in reverse index order) ───────────────────
  for (const { pos, idx, reason } of toClose) {
    const exitPrice = pos.direction === 'long'
      ? getBidPrice(pos.symbol)
      : getAskPrice(pos.symbol)

    const priceDiff = pos.direction === 'long'
      ? exitPrice - pos.entry_price
      : pos.entry_price - exitPrice
    const realizedPnl = priceDiff * pos.quantity * pos.leverage
    const closeFee = exitPrice * pos.quantity * FEE_RATE

    pos.status = 'closed'
    pos.exit_price = exitPrice
    pos.exit_timestamp = Date.now()
    pos.realized_pnl = realizedPnl
    pos.total_fees += closeFee
    pos.close_reason = reason
    pos.updated_at = Date.now()

    state.positions.splice(idx, 1)
    positionMap.delete(pos.id)
    state.closedPositions.push({ ...pos })

    state.realizedPnl += realizedPnl
    state.totalFeesPaid += closeFee
    invalidateAccountCache()

    const def = INSTRUMENT_DEFS[pos.symbol]
    const pDec = def?.priceDec ?? 2
    const pnlStr = realizedPnl >= 0
      ? `+$${realizedPnl.toFixed(2)}`
      : `-$${Math.abs(realizedPnl).toFixed(2)}`
    const label = reason === 'sl' ? 'stopped out' : 'take profit hit'

    state.activity.push({
      id: uid('act'), type: 'closed',
      title: `${pos.direction === 'long' ? 'Long' : 'Short'} ${pos.symbol} ${label}`,
      sub: `${pos.quantity} @ $${exitPrice.toFixed(pDec)} · ${pnlStr}`,
      ts: Date.now(), pnl: realizedPnl,
    })
  }
}

// ─── Mock GET handler ───────────────────────────────────────────────────────

export function handleMockGet(req: NextRequest, apiPath: string): NextResponse {
  const data = getMockData(apiPath, req)
  return NextResponse.json(data)
}
