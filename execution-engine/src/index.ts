/**
 * TEDA Execution Engine — 24/7 Position Monitor
 *
 * Standalone Node.js service (deployed on Railway) that monitors all open
 * positions and enforces:
 *
 *   1. SL/TP auto-execution (real bid/ask from Binance bookTicker)
 *   2. Margin Call at 100% margin level (log / future notification)
 *   3. Stop Out at 50% margin level (force-close worst position)
 *   4. Auto-Breach when max drawdown (10%) or daily drawdown (5%) hit
 *      → close ALL positions + mark account BREACHED
 *
 * Architecture:
 *   - Binance WebSocket (bookTicker) → in-memory price cache (real bid/ask)
 *   - Supabase price_cache table → fallback for non-Binance symbols (forex)
 *   - Monitor loop every ~1 second
 *   - Atomic close via PostgreSQL RPC (close_position_atomic) with FOR UPDATE
 *
 * All financial math uses Decimal.js to avoid floating-point errors.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import Decimal from 'decimal.js'
import WebSocket from 'ws'

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[ENGINE] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ─── Constants ───────────────────────────────────────────────────────────────

const FEE_RATE = new Decimal('0.0007')            // 0.07% per trade
const MARGIN_CALL_LEVEL = new Decimal(100)         // 100% → notification only
const STOP_OUT_LEVEL = new Decimal(50)             // 50% → force-close worst
const MAX_DRAWDOWN_PCT = new Decimal('0.10')       // 10% max drawdown
const DAILY_DRAWDOWN_PCT = new Decimal('0.05')     // 5% daily drawdown
const PRICE_STALE_MS = 30_000                       // 30s stale threshold
const MONITOR_INTERVAL_MS = 1_000                   // 1s loop
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws'

// ─── Symbol Mapping ─────────────────────────────────────────────────────────

/** Platform symbol → Binance symbol (lowercase) */
const VP_TO_BINANCE: Record<string, string> = {
  'BTC-USD':   'btcusdt',
  'ETH-USD':   'ethusdt',
  'SOL-USD':   'solusdt',
  'XRP-USD':   'xrpusdt',
  'ADA-USD':   'adausdt',
  'DOGE-USD':  'dogeusdt',
  'LINK-USD':  'linkusdt',
  'ARB-USD':   'arbusdt',
  '1INCH-USD': '1inchusdt',
  'AAVE-USD':  'aaveusdt',
}

/** Binance symbol (uppercase, as received) → Platform symbol */
const BINANCE_TO_VP: Record<string, string> = {}
for (const [vp, bn] of Object.entries(VP_TO_BINANCE)) {
  BINANCE_TO_VP[bn.toUpperCase()] = vp
}

/** Symbols NOT on Binance — need price_cache fallback */
const FALLBACK_SYMBOLS = ['EUR-USD', 'GBP-USD', 'AUD-USD', 'ASTER-USD']

// ─── Decimal Helper ─────────────────────────────────────────────────────────

function D(v: unknown): Decimal {
  if (v === null || v === undefined) return new Decimal(0)
  return new Decimal(String(v))
}

// ─── Price Cache ─────────────────────────────────────────────────────────────

interface PriceEntry {
  bid: number
  ask: number
  last: number
  timestamp: number
}

const priceCache = new Map<string, PriceEntry>()

// ─── Types ───────────────────────────────────────────────────────────────────

interface OpenPosition {
  id: string
  account_id: string
  symbol: string
  direction: string      // 'long' | 'short'
  quantity: unknown
  leverage: unknown
  entry_price: unknown
  isolated_margin: unknown
  trade_fees: unknown
  status: string
}

interface SLTPOrder {
  id: string
  position_id: string
  order_type: string     // 'stop' (SL) | 'limit' (TP)
  stop_price: unknown
  price: unknown
  direction: string
  quantity: unknown
  leverage: unknown
}

interface Account {
  id: string
  available_margin: unknown
  total_margin_required: unknown
  starting_balance: unknown
  net_worth: unknown
  account_status: string
  day_start_balance: unknown
  day_start_equity: unknown
  day_start_date: string | null
  realized_pnl: unknown
  total_pnl: unknown
}

// ─── Binance WebSocket ───────────────────────────────────────────────────────

let binanceWs: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

function connectBinance(): void {
  if (binanceWs) return

  const symbols = Object.values(VP_TO_BINANCE)
  const streams = symbols.map(s => `${s}@bookTicker`).join('/')
  const url = `${BINANCE_WS_URL}/${streams}`

  console.log(`[BINANCE] Connecting to ${symbols.length} bookTicker streams...`)

  try {
    binanceWs = new WebSocket(url)
  } catch (err) {
    console.error('[BINANCE] Failed to create WebSocket:', err)
    scheduleReconnect()
    return
  }

  binanceWs.on('open', () => {
    reconnectAttempts = 0 // Reset backoff on successful connection
    console.log(`[BINANCE] ✓ Connected — streaming ${symbols.length} crypto pairs`)
  })

  binanceWs.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString())
      // bookTicker: { s: "BTCUSDT", b: "67000.00", a: "67001.00", B: "...", A: "..." }
      const binanceSym = msg.s as string
      if (!binanceSym) return

      const vpSymbol = BINANCE_TO_VP[binanceSym]
      if (!vpSymbol) return

      const bid = parseFloat(msg.b)
      const ask = parseFloat(msg.a)
      if (isNaN(bid) || isNaN(ask)) return

      priceCache.set(vpSymbol, {
        bid,
        ask,
        last: (bid + ask) / 2,
        timestamp: Date.now(),
      })
    } catch {
      // ignore parse errors
    }
  })

  binanceWs.on('close', () => {
    console.warn('[BINANCE] WebSocket closed')
    binanceWs = null
    scheduleReconnect()
  })

  binanceWs.on('error', (err) => {
    console.error('[BINANCE] WebSocket error:', err.message)
    binanceWs?.close()
  })
}

let reconnectAttempts = 0

function scheduleReconnect(): void {
  if (reconnectTimer) return
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30_000)
  reconnectAttempts++
  console.log(`[BINANCE] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})...`)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectBinance()
  }, delay)
}

// ─── Fallback Prices (Supabase price_cache table) ────────────────────────────

async function loadFallbackPrices(): Promise<void> {
  if (FALLBACK_SYMBOLS.length === 0) return

  try {
    const { data } = await supabase
      .from('price_cache')
      .select('symbol, current_price, current_bid, current_ask, last_updated')
      .in('symbol', FALLBACK_SYMBOLS)

    if (!data) return

    for (const row of data) {
      const bid = Number(row.current_bid ?? row.current_price)
      const ask = Number(row.current_ask ?? row.current_price)
      priceCache.set(row.symbol, {
        bid,
        ask,
        last: Number(row.current_price),
        timestamp: Number(row.last_updated) || Date.now(),
      })
    }
  } catch (err) {
    console.error('[FALLBACK] Error loading price_cache:', err)
  }
}

// ─── Close Position (Atomic RPC) ────────────────────────────────────────────

async function closePosition(
  pos: OpenPosition,
  exitPriceNum: number,
  closeReason: string,                    // 'sl' | 'tp' | 'liquidation' | 'manual'
  triggeredOrderId: string | null = null  // mark this specific order as 'filled'
): Promise<boolean> {
  const exitPriceD = new Decimal(exitPriceNum)
  const entryPriceD = D(pos.entry_price)
  const quantityD = D(pos.quantity)
  const leverageD = D(pos.leverage)
  const isolatedMarginD = D(pos.isolated_margin)
  const existingFeesD = D(pos.trade_fees)

  // PnL = (exit - entry) × quantity × leverage for long
  // PnL = (entry - exit) × quantity × leverage for short
  const priceDiff = pos.direction === 'long'
    ? exitPriceD.minus(entryPriceD)
    : entryPriceD.minus(exitPriceD)
  const realizedPnl = priceDiff.times(quantityD).times(leverageD)

  // Close fee = exit_price × quantity × 0.0007
  const closeFee = exitPriceD.times(quantityD).times(FEE_RATE)

  const exitTimestamp = Date.now()

  const { data, error } = await supabase.rpc('close_position_atomic', {
    p_position_id: pos.id,
    p_account_id: pos.account_id,
    p_exit_price: exitPriceD.toNumber(),
    p_exit_timestamp: exitTimestamp,
    p_realized_pnl: realizedPnl.toNumber(),
    p_close_fee: closeFee.toNumber(),
    p_existing_fees: existingFeesD.toNumber(),
    p_isolated_margin: isolatedMarginD.toNumber(),
    p_close_reason: closeReason,
    p_triggered_order_id: triggeredOrderId,
    p_symbol: pos.symbol,
    p_direction: pos.direction,
    p_quantity: quantityD.toNumber(),
  })

  if (error) {
    // Position already closed (race condition with manual close) — not an error
    if (
      error.message?.includes('not_open') ||
      error.message?.includes('not found') ||
      error.message?.includes('Position not open')
    ) {
      console.log(`[CLOSE] Position ${pos.id} already closed, skipping`)
      return false
    }
    console.error(`[CLOSE] Error closing position ${pos.id}:`, error.message)
    return false
  }

  const pnlStr = realizedPnl.gte(0) ? `+$${realizedPnl.toFixed(2)}` : `-$${realizedPnl.abs().toFixed(2)}`
  console.log(`[CLOSE] ${pos.symbol} ${pos.direction} closed @ ${exitPriceD.toFixed(2)} | PnL: ${pnlStr} | Reason: ${closeReason}`)

  return true
}

// ─── SL/TP Check ─────────────────────────────────────────────────────────────

async function checkSLTP(
  openPositions: OpenPosition[],
  slTpOrders: SLTPOrder[]
): Promise<void> {
  for (const order of slTpOrders) {
    const pos = openPositions.find(p => p.id === order.position_id)
    if (!pos) continue

    const pd = priceCache.get(pos.symbol)
    if (!pd) continue

    // Skip stale prices
    if (Date.now() - pd.timestamp > PRICE_STALE_MS) continue

    // Exit price: long closes at bid, short closes at ask
    const exitPrice = pos.direction === 'long' ? pd.bid : pd.ask

    let triggered = false
    let closeReason: 'sl' | 'tp' = 'sl'

    if (order.order_type === 'stop' && order.stop_price != null) {
      // Stop Loss
      const slPrice = Number(order.stop_price)
      if (pos.direction === 'long' && exitPrice <= slPrice) {
        triggered = true
        closeReason = 'sl'
      } else if (pos.direction === 'short' && exitPrice >= slPrice) {
        triggered = true
        closeReason = 'sl'
      }
    } else if (order.order_type === 'limit' && order.price != null) {
      // Take Profit
      const tpPrice = Number(order.price)
      if (pos.direction === 'long' && exitPrice >= tpPrice) {
        triggered = true
        closeReason = 'tp'
      } else if (pos.direction === 'short' && exitPrice <= tpPrice) {
        triggered = true
        closeReason = 'tp'
      }
    }

    if (!triggered) continue

    console.log(`[${closeReason.toUpperCase()}] Triggered: ${pos.symbol} ${pos.direction} @ ${exitPrice}`)
    await closePosition(pos, exitPrice, closeReason, order.id)
  }
}

// ─── Margin Level Check ──────────────────────────────────────────────────────

async function checkMarginLevel(
  account: Account,
  positions: OpenPosition[]
): Promise<boolean> {
  const marginUsed = D(account.total_margin_required)
  if (marginUsed.isZero()) return false

  // Compute total unrealized PnL
  let totalUnrealizedPnl = new Decimal(0)
  for (const pos of positions) {
    const pd = priceCache.get(pos.symbol)
    if (!pd) continue
    if (Date.now() - pd.timestamp > PRICE_STALE_MS) continue

    const entry = D(pos.entry_price)
    const exit = pos.direction === 'long' ? new Decimal(pd.bid) : new Decimal(pd.ask)
    const diff = pos.direction === 'long' ? exit.minus(entry) : entry.minus(exit)
    totalUnrealizedPnl = totalUnrealizedPnl.plus(diff.times(D(pos.quantity)).times(D(pos.leverage)))
  }

  const netWorth = D(account.net_worth)
  const equity = netWorth.plus(totalUnrealizedPnl)
  const marginLevel = equity.div(marginUsed).times(100)

  // ── Stop Out at 50% → force-close the worst position ──
  if (marginLevel.lte(STOP_OUT_LEVEL)) {
    console.log(`[STOP_OUT] Account ${account.id} margin level: ${marginLevel.toFixed(1)}%`)

    // Find worst position by unrealized PnL
    let worstPos: OpenPosition | null = null
    let worstPnl = new Decimal(Infinity)
    let worstExitPrice = 0

    for (const pos of positions) {
      const pd = priceCache.get(pos.symbol)
      if (!pd) continue

      const exit = pos.direction === 'long' ? pd.bid : pd.ask
      const entry = D(pos.entry_price)
      const exitD = new Decimal(exit)
      const diff = pos.direction === 'long' ? exitD.minus(entry) : entry.minus(exitD)
      const pnl = diff.times(D(pos.quantity)).times(D(pos.leverage))

      if (pnl.lt(worstPnl)) {
        worstPnl = pnl
        worstPos = pos
        worstExitPrice = exit
      }
    }

    if (worstPos) {
      await closePosition(worstPos, worstExitPrice, 'liquidation')
    }

    return true // Signal that we closed a position, re-check next tick
  }

  // ── Margin Call at 100% → log (notification future) ──
  if (marginLevel.lte(MARGIN_CALL_LEVEL)) {
    console.log(`[MARGIN_CALL] Account ${account.id} margin level: ${marginLevel.toFixed(1)}%`)
  }

  return false
}

// ─── Drawdown Check + Auto-Breach ────────────────────────────────────────────

async function checkDrawdown(
  account: Account,
  positions: OpenPosition[]
): Promise<boolean> {
  const startingBalance = D(account.starting_balance)
  if (startingBalance.isZero()) return false

  // Compute equity = net_worth + unrealized PnL
  let totalUnrealizedPnl = new Decimal(0)
  for (const pos of positions) {
    const pd = priceCache.get(pos.symbol)
    if (!pd) continue
    if (Date.now() - pd.timestamp > PRICE_STALE_MS) continue

    const entry = D(pos.entry_price)
    const exit = pos.direction === 'long' ? new Decimal(pd.bid) : new Decimal(pd.ask)
    const diff = pos.direction === 'long' ? exit.minus(entry) : entry.minus(exit)
    totalUnrealizedPnl = totalUnrealizedPnl.plus(diff.times(D(pos.quantity)).times(D(pos.leverage)))
  }

  const netWorth = D(account.net_worth)
  const equity = netWorth.plus(totalUnrealizedPnl)

  // ── Max Drawdown (10%) ──
  // Breach if: equity ≤ starting_balance × (1 − 0.10)
  const drawdownPct = startingBalance.minus(equity).div(startingBalance)
  if (drawdownPct.gte(MAX_DRAWDOWN_PCT)) {
    console.log(`[BREACH] Account ${account.id} MAX DRAWDOWN: ${drawdownPct.times(100).toFixed(2)}%. Equity: $${equity.toFixed(2)}`)
    await breachAccount(
      account.id,
      positions,
      `Max drawdown reached (${drawdownPct.times(100).toFixed(2)}%). Equity: $${equity.toFixed(2)}`
    )
    return true
  }

  // ── Daily Drawdown (5%) ──
  if (account.day_start_balance != null && account.day_start_equity != null) {
    const todayDateStr = new Date().toISOString().slice(0, 10)
    if (account.day_start_date === todayDateStr) {
      const dayStartBal = D(account.day_start_balance)
      const dayStartEq = D(account.day_start_equity)
      const dailyBase = Decimal.max(dayStartBal, dayStartEq)

      if (dailyBase.gt(0)) {
        const dailyFloor = dailyBase.times(new Decimal(1).minus(DAILY_DRAWDOWN_PCT))
        if (equity.lte(dailyFloor)) {
          const dailyLossPct = dailyBase.minus(equity).div(dailyBase).times(100)
          console.log(`[BREACH] Account ${account.id} DAILY DRAWDOWN: ${dailyLossPct.toFixed(2)}%. Equity: $${equity.toFixed(2)}, Floor: $${dailyFloor.toFixed(2)}`)
          await breachAccount(
            account.id,
            positions,
            `Daily drawdown reached (${dailyLossPct.toFixed(2)}% loss today). Equity: $${equity.toFixed(2)}, Floor: $${dailyFloor.toFixed(2)}`
          )
          return true
        }
      }
    }
  }

  return false
}

// ─── Breach Account ──────────────────────────────────────────────────────────

async function breachAccount(
  accountId: string,
  positions: OpenPosition[],
  reason: string
): Promise<void> {
  console.log(`[BREACH] Closing all ${positions.length} positions for account ${accountId}...`)

  // Close ALL open positions
  for (const pos of positions) {
    const pd = priceCache.get(pos.symbol)
    if (!pd) continue

    const exitPrice = pos.direction === 'long' ? pd.bid : pd.ask
    await closePosition(pos, exitPrice, 'liquidation')
  }

  // Mark account as BREACHED atomically (sets breach_reason + activity in one tx)
  const { data: breachResult, error: breachErr } = await supabase.rpc('breach_account_atomic', {
    p_account_id: accountId,
    p_reason: reason,
  })

  if (breachErr) {
    console.error(`[BREACH] Error breaching account ${accountId}:`, breachErr.message)
  }

  console.log(`[BREACH] ✓ Account ${accountId} BREACHED: ${reason}`)
}

// ─── Daily Reset ─────────────────────────────────────────────────────────────

/**
 * Check if day_start_date needs updating for any active accounts.
 * Runs once per cycle but only writes when the date has changed (UTC).
 */
async function checkDailyReset(): Promise<void> {
  const todayUTC = new Date().toISOString().slice(0, 10)

  // Find active accounts whose day_start_date is stale
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, net_worth, day_start_date')
    .in('account_status', ['active', 'funded'])
    .or(`day_start_date.is.null,day_start_date.neq.${todayUTC}`)
    .limit(100)

  if (!accounts || accounts.length === 0) return

  for (const acct of accounts) {
    // Snapshot: day_start_balance = net_worth (doesn't include unrealized PnL)
    // day_start_equity = net_worth (at day boundary, unrealized PnL should be ~0 or carried forward)
    // In a real scenario, we'd compute equity here. For simplicity, use net_worth.
    const netWorth = D(acct.net_worth).toNumber()

    await supabase.from('accounts').update({
      day_start_balance: netWorth,
      day_start_equity: netWorth,
      day_start_date: todayUTC,
    }).eq('id', acct.id)
  }

  console.log(`[DAILY_RESET] Updated ${accounts.length} accounts for ${todayUTC}`)
}

// ─── Main Monitor Loop ──────────────────────────────────────────────────────

let lastDailyResetCheck = 0

async function checkAllPositions(): Promise<void> {
  // ── Phase 0: Daily reset (check every 60s) ──────────────────────────
  if (Date.now() - lastDailyResetCheck > 60_000) {
    lastDailyResetCheck = Date.now()
    await checkDailyReset()
  }

  // ── Phase 0.5: Refresh fallback prices (forex, unlisted) ───────────
  await loadFallbackPrices()

  // ── Phase 1: Fetch all open positions + linked SL/TP orders ────────
  const [posRes, ordRes] = await Promise.all([
    supabase
      .from('positions')
      .select('id, account_id, symbol, direction, quantity, leverage, entry_price, isolated_margin, trade_fees, status')
      .eq('status', 'open')
      .limit(500),
    supabase
      .from('orders')
      .select('id, position_id, order_type, stop_price, price, direction, quantity, leverage')
      .eq('status', 'pending')
      .not('position_id', 'is', null)
      .limit(1000),
  ])

  const openPositions: OpenPosition[] = posRes.data ?? []
  if (openPositions.length === 0) return

  const slTpOrders: SLTPOrder[] = (ordRes.data ?? []) as SLTPOrder[]

  // ── Phase 2: SL/TP matching ────────────────────────────────────────
  await checkSLTP(openPositions, slTpOrders)

  // ── Phase 3: Per-account margin + drawdown ─────────────────────────
  // Re-fetch open positions (some may have been closed by SL/TP)
  const { data: stillOpen } = await supabase
    .from('positions')
    .select('id, account_id, symbol, direction, quantity, leverage, entry_price, isolated_margin, trade_fees, status')
    .eq('status', 'open')
    .limit(500)

  if (!stillOpen || stillOpen.length === 0) return

  const accountIds = [...new Set(stillOpen.map(p => p.account_id))]

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, available_margin, total_margin_required, starting_balance, net_worth, account_status, day_start_balance, day_start_equity, day_start_date, realized_pnl, total_pnl')
    .in('id', accountIds)

  if (!accounts) return

  for (const acct of accounts as Account[]) {
    if (acct.account_status === 'breached') continue

    const acctPositions = stillOpen.filter(p => p.account_id === acct.id) as OpenPosition[]
    if (acctPositions.length === 0) continue

    // Check margin level first (stop out)
    const stopOutTriggered = await checkMarginLevel(acct, acctPositions)
    if (stopOutTriggered) continue // Re-check next tick after closing

    // Check drawdown (max + daily)
    const breached = await checkDrawdown(acct, acctPositions)
    if (breached) continue
  }
}

async function monitorLoop(): Promise<void> {
  console.log('[ENGINE] ✓ Starting position monitor loop (1s interval)...')

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await checkAllPositions()
    } catch (err) {
      console.error('[MONITOR] Loop error:', err)
    }
    await new Promise(resolve => setTimeout(resolve, MONITOR_INTERVAL_MS))
  }
}

// ─── Stats / Health ──────────────────────────────────────────────────────────

function logStats(): void {
  const symbols = Array.from(priceCache.keys())
  const fresh = symbols.filter(s => Date.now() - (priceCache.get(s)?.timestamp ?? 0) < PRICE_STALE_MS)
  console.log(`[STATS] Price cache: ${priceCache.size} symbols (${fresh.length} fresh) | WS: ${binanceWs?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected'}`)
}

// ─── Health Check HTTP Server ────────────────────────────────────────────────

import { createServer } from 'http'

function startHealthServer(): void {
  const PORT = parseInt(process.env.PORT ?? '3001', 10)

  const server = createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const symbols = Array.from(priceCache.keys())
      const fresh = symbols.filter(s => Date.now() - (priceCache.get(s)?.timestamp ?? 0) < PRICE_STALE_MS)
      const wsConnected = binanceWs?.readyState === WebSocket.OPEN

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'ok',
        uptime: process.uptime(),
        binance_ws: wsConnected ? 'connected' : 'disconnected',
        price_cache_size: priceCache.size,
        fresh_prices: fresh.length,
        reconnect_attempts: reconnectAttempts,
        timestamp: Date.now(),
      }))
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  server.listen(PORT, () => {
    console.log(`[HEALTH] HTTP health check listening on port ${PORT}`)
  })
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════')
  console.log('  TEDA Execution Engine v2.0.0')
  console.log('═══════════════════════════════════════════════')
  console.log(`  Supabase: ${SUPABASE_URL}`)
  console.log(`  Binance symbols: ${Object.keys(VP_TO_BINANCE).length}`)
  console.log(`  Fallback symbols: ${FALLBACK_SYMBOLS.length}`)
  console.log(`  Monitor interval: ${MONITOR_INTERVAL_MS}ms`)
  console.log('═══════════════════════════════════════════════')

  // Start health check server (Railway needs a port listener)
  startHealthServer()

  // Connect to Binance WebSocket
  connectBinance()

  // Load initial fallback prices
  await loadFallbackPrices()

  // Wait 2s for first prices to arrive
  console.log('[ENGINE] Waiting 2s for initial prices...')
  await new Promise(resolve => setTimeout(resolve, 2_000))

  logStats()

  // Log stats every 60 seconds
  setInterval(logStats, 60_000)

  // Start the monitor loop
  await monitorLoop()
}

// ─── Start ───────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('[ENGINE] Fatal error:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[ENGINE] Shutting down...')
  binanceWs?.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('[ENGINE] SIGTERM received, shutting down...')
  binanceWs?.close()
  process.exit(0)
})
