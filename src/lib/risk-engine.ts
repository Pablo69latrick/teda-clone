/**
 * Risk Engine — Server-Side SL/TP + Margin Call + Stop Out + Auto-Breach
 *
 * Runs every 2 seconds from the SSE price stream. Monitors ALL open positions
 * across ALL accounts and enforces:
 *
 * 1. SL/TP auto-execution (using bid/ask, not mid-price)
 * 2. Margin Call at 100% margin level (notification only)
 * 3. Stop Out at 50% margin level (force-close worst position)
 * 4. Auto-Breach when max drawdown (10%) or daily drawdown (5%) hit
 *    → close ALL positions + mark account BREACHED
 *
 * Security:
 *   - Decimal.js for ALL financial math
 *   - Double-close guard (re-check status === 'open' before close)
 *   - All DB writes via admin client (service_role)
 */

import Decimal from 'decimal.js'

// ─── Constants ─────────────────────────────────────────────────────────────

const FEE_RATE = new Decimal('0.0007')
const MARGIN_CALL_LEVEL = new Decimal(100)   // 100% → notification only
const STOP_OUT_LEVEL = new Decimal(50)       // 50% → force-close worst position
const MAX_DRAWDOWN_PCT = new Decimal('0.10') // 10% max drawdown
const DAILY_DRAWDOWN_PCT = new Decimal('0.05') // 5% daily drawdown

/** Convert any DB value to Decimal safely. */
function D(v: unknown): Decimal {
  if (v === null || v === undefined) return new Decimal(0)
  return new Decimal(String(v))
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface PriceData {
  bid: number
  ask: number
  last: number
}

interface OpenPosition {
  id: string
  account_id: string
  symbol: string
  direction: string
  quantity: unknown
  leverage: unknown
  entry_price: unknown
  isolated_margin: unknown
  trade_fees: unknown
  status: string
}

// ─── Throttle state ────────────────────────────────────────────────────────

let lastRun = 0

// ─── Main entry point ──────────────────────────────────────────────────────

/**
 * Run the full risk engine. Call this every SSE tick (500ms).
 * Internally throttled to run every 2 seconds.
 */
export async function runRiskEngine(
  priceMap: Record<string, PriceData>
): Promise<void> {
  // Throttle: run at most every 2s
  if (Date.now() - lastRun < 2_000) return
  lastRun = Date.now()

  try {
    const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
    const admin = createSupabaseAdminClient()

    // ── Phase 1: Fetch all open positions + linked SL/TP orders ──────────
    const [posRes, ordRes] = await Promise.all([
      admin.from('positions')
        .select('id, account_id, symbol, direction, quantity, leverage, entry_price, isolated_margin, trade_fees, status')
        .eq('status', 'open')
        .limit(500),
      admin.from('orders')
        .select('id, position_id, order_type, stop_price, price, direction, quantity, leverage')
        .eq('status', 'pending')
        .not('position_id', 'is', null)
        .limit(1000),
    ])

    const openPositions = posRes.data ?? []
    if (openPositions.length === 0) return

    const slTpOrders = ordRes.data ?? []

    // ── Phase 2: SL/TP matching ──────────────────────────────────────────
    await checkSLTP(admin, openPositions, slTpOrders, priceMap)

    // ── Phase 3: Per-account margin + drawdown checks ────────────────────
    // Group remaining open positions by account
    // (re-fetch to exclude positions just closed by SL/TP)
    const { data: stillOpen } = await admin.from('positions')
      .select('id, account_id, symbol, direction, quantity, leverage, entry_price, isolated_margin, trade_fees, status')
      .eq('status', 'open')
      .limit(500)

    if (!stillOpen || stillOpen.length === 0) return

    const accountIds = [...new Set(stillOpen.map(p => p.account_id))]

    // Fetch accounts with drawdown data
    const { data: accounts } = await admin.from('accounts')
      .select('id, available_margin, total_margin_required, starting_balance, net_worth, account_status, day_start_balance, day_start_equity, day_start_date')
      .in('id', accountIds)

    if (!accounts) return

    for (const acct of accounts) {
      if (acct.account_status === 'breached') continue

      const acctPositions = stillOpen.filter(p => p.account_id === acct.id)
      if (acctPositions.length === 0) continue

      // Compute total unrealized PnL for this account
      let totalUnrealizedPnl = new Decimal(0)
      for (const pos of acctPositions) {
        const pd = priceMap[pos.symbol]
        if (!pd) continue
        const entry = D(pos.entry_price)
        const exit = pos.direction === 'long' ? new Decimal(pd.bid) : new Decimal(pd.ask)
        const diff = pos.direction === 'long' ? exit.minus(entry) : entry.minus(exit)
        totalUnrealizedPnl = totalUnrealizedPnl.plus(diff.times(D(pos.quantity)).times(D(pos.leverage)))
      }

      const netWorth = D(acct.net_worth)
      const equity = netWorth.plus(totalUnrealizedPnl)
      const marginUsed = D(acct.total_margin_required)

      // ── Margin level checks ────────────────────────────────────────────
      if (marginUsed.gt(0)) {
        const marginLevel = equity.div(marginUsed).times(100)

        // Stop Out at 50% → force-close the worst position
        if (marginLevel.lte(STOP_OUT_LEVEL)) {
          // Sort by unrealized PnL ascending (worst first)
          const sorted = acctPositions
            .map(pos => {
              const pd = priceMap[pos.symbol]
              if (!pd) return { pos, pnl: new Decimal(0) }
              const entry = D(pos.entry_price)
              const exit = pos.direction === 'long' ? new Decimal(pd.bid) : new Decimal(pd.ask)
              const diff = pos.direction === 'long' ? exit.minus(entry) : entry.minus(exit)
              return { pos, pnl: diff.times(D(pos.quantity)).times(D(pos.leverage)) }
            })
            .sort((a, b) => a.pnl.comparedTo(b.pnl))

          const worst = sorted[0]
          if (worst) {
            const pd = priceMap[worst.pos.symbol]
            if (pd) {
              const exitPrice = worst.pos.direction === 'long' ? pd.bid : pd.ask
              await closePositionServer(admin, worst.pos, exitPrice, 'liquidation')
              console.log(`[RiskEngine] STOP OUT: ${worst.pos.symbol} ${worst.pos.direction} → margin level ${marginLevel.toFixed(1)}%`)
            }
          }
          continue // Re-check next tick after closing
        }

        // Margin Call at 100% → log warning (notification could be added later)
        if (marginLevel.lte(MARGIN_CALL_LEVEL)) {
          console.log(`[RiskEngine] MARGIN CALL: account ${acct.id} → margin level ${marginLevel.toFixed(1)}%`)
        }
      }

      // ── Drawdown breach checks ────────────────────────────────────────
      const startingBalance = D(acct.starting_balance)

      // Max drawdown (10%)
      if (startingBalance.gt(0)) {
        const drawdownPct = startingBalance.minus(equity).div(startingBalance)
        if (drawdownPct.gte(MAX_DRAWDOWN_PCT)) {
          await breachAccount(admin, acct.id, acctPositions, priceMap,
            `Max drawdown reached (${drawdownPct.times(100).toFixed(2)}%). Equity: $${equity.toFixed(2)}`)
          continue
        }
      }

      // Daily drawdown (5%)
      if (acct.day_start_balance != null && acct.day_start_equity != null) {
        const todayDateStr = new Date().toISOString().slice(0, 10)
        if (acct.day_start_date === todayDateStr) {
          const dayStartBal = D(acct.day_start_balance)
          const dayStartEq = D(acct.day_start_equity)
          const dailyBase = Decimal.max(dayStartBal, dayStartEq)

          if (dailyBase.gt(0)) {
            const dailyFloor = dailyBase.times(new Decimal(1).minus(DAILY_DRAWDOWN_PCT))
            if (equity.lte(dailyFloor)) {
              const dailyLossPct = dailyBase.minus(equity).div(dailyBase).times(100)
              await breachAccount(admin, acct.id, acctPositions, priceMap,
                `Daily drawdown reached (${dailyLossPct.toFixed(2)}% loss today). Equity: $${equity.toFixed(2)}, Floor: $${dailyFloor.toFixed(2)}`)
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[RiskEngine] Error:', err)
  }
}

// ─── SL/TP Matching ────────────────────────────────────────────────────────

async function checkSLTP(
  admin: ReturnType<typeof import('@/lib/supabase/server').createSupabaseAdminClient> extends infer T ? T : never,
  openPositions: OpenPosition[],
  slTpOrders: Array<{ id: string; position_id: string; order_type: string; stop_price: unknown; price: unknown; direction: string; quantity: unknown; leverage: unknown }>,
  priceMap: Record<string, PriceData>
) {
  for (const order of slTpOrders) {
    const pos = openPositions.find(p => p.id === order.position_id)
    if (!pos) continue

    const pd = priceMap[pos.symbol]
    if (!pd) continue

    // Use bid/ask for proper fill price
    // Long close → sell at bid; Short close → buy at ask
    const exitPrice = pos.direction === 'long' ? pd.bid : pd.ask

    let triggered = false
    let closeReason: 'sl' | 'tp' = 'sl'

    if (order.order_type === 'stop' && order.stop_price) {
      // Stop Loss
      const slPrice = Number(order.stop_price)
      if (pos.direction === 'long' && exitPrice <= slPrice) {
        triggered = true
        closeReason = 'sl'
      } else if (pos.direction === 'short' && exitPrice >= slPrice) {
        triggered = true
        closeReason = 'sl'
      }
    } else if (order.order_type === 'limit' && order.price) {
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

    // Mark the triggered order as filled + close position
    await admin.from('orders').update({
      status: 'filled',
      updated_at: new Date().toISOString(),
    }).eq('id', order.id)

    await closePositionServer(admin, pos, exitPrice, closeReason)

    console.log(`[RiskEngine] ${closeReason.toUpperCase()} triggered: ${pos.symbol} ${pos.direction} @ ${exitPrice}`)
  }
}

// ─── Auto-Breach ───────────────────────────────────────────────────────────

async function breachAccount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  accountId: string,
  positions: OpenPosition[],
  priceMap: Record<string, PriceData>,
  reason: string
) {
  console.log(`[RiskEngine] BREACH: account ${accountId} — ${reason}`)

  // Close ALL open positions
  for (const pos of positions) {
    const pd = priceMap[pos.symbol]
    if (!pd) continue
    const exitPrice = pos.direction === 'long' ? pd.bid : pd.ask
    await closePositionServer(admin, pos, exitPrice, 'liquidation')
  }

  // Mark account as BREACHED
  await admin.from('accounts').update({
    account_status: 'breached',
    is_active: false,
    updated_at: new Date().toISOString(),
  }).eq('id', accountId)

  // Activity record
  await admin.from('activity').insert({
    account_id: accountId,
    type: 'breach',
    title: '⛔ Account Breached',
    sub: reason,
    ts: Date.now(),
    pnl: null,
  })
}

// ─── Close Position (shared by SL/TP, Stop Out, Breach) ────────────────────

async function closePositionServer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  pos: OpenPosition,
  exitPriceNum: number,
  closeReason: string
) {
  // Double-close guard: re-check status before closing
  const { data: check } = await admin.from('positions')
    .select('status')
    .eq('id', pos.id)
    .single()
  if (!check || check.status !== 'open') return

  const exitPriceD = new Decimal(exitPriceNum)
  const entryPriceD = D(pos.entry_price)
  const quantityD = D(pos.quantity)
  const leverageD = D(pos.leverage)
  const isolatedMarginD = D(pos.isolated_margin)

  const priceDiff = pos.direction === 'long'
    ? exitPriceD.minus(entryPriceD)
    : entryPriceD.minus(exitPriceD)
  const realizedPnl = priceDiff.times(quantityD).times(leverageD)
  const closeFee = exitPriceD.times(quantityD).times(FEE_RATE)

  const now = Date.now()

  // Update position → closed
  await admin.from('positions').update({
    status: 'closed',
    close_reason: closeReason,
    exit_price: exitPriceD.toNumber(),
    exit_timestamp: now,
    realized_pnl: realizedPnl.toNumber(),
    total_fees: D(pos.trade_fees).plus(closeFee).toNumber(),
    updated_at: new Date().toISOString(),
  }).eq('id', pos.id)

  // Cancel all linked pending orders
  await admin.from('orders').update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('position_id', pos.id).eq('status', 'pending')

  // Update account balances
  const { data: acct } = await admin.from('accounts')
    .select('available_margin, realized_pnl, total_margin_required, net_worth, total_pnl')
    .eq('id', pos.account_id)
    .single()

  if (acct) {
    const newAvailableMargin = D(acct.available_margin).plus(isolatedMarginD).plus(realizedPnl).minus(closeFee)
    const newTotalMarginReq = Decimal.max(0, D(acct.total_margin_required).minus(isolatedMarginD))
    const newRealizedPnl = D(acct.realized_pnl).plus(realizedPnl)
    const newTotalPnl = D(acct.total_pnl).plus(realizedPnl)
    const newNetWorth = D(acct.net_worth).plus(realizedPnl).minus(closeFee)

    await admin.from('accounts').update({
      available_margin: newAvailableMargin.toNumber(),
      total_margin_required: newTotalMarginReq.toNumber(),
      realized_pnl: newRealizedPnl.toNumber(),
      total_pnl: newTotalPnl.toNumber(),
      net_worth: newNetWorth.toNumber(),
      updated_at: new Date().toISOString(),
    }).eq('id', pos.account_id)
  }

  // Activity record
  const pnlStr = realizedPnl.gte(0) ? `+$${realizedPnl.toFixed(2)}` : `-$${realizedPnl.abs().toFixed(2)}`
  const reasonLabel = closeReason === 'sl' ? '🛑 SL' : closeReason === 'tp' ? '🎯 TP' : closeReason === 'liquidation' ? '⚠️ Liquidation' : '📋 Closed'

  await admin.from('activity').insert({
    account_id: pos.account_id,
    type: 'closed',
    title: `${reasonLabel} ${pos.direction === 'long' ? 'Long' : 'Short'} ${pos.symbol}`,
    sub: `${quantityD.toNumber()} @ $${exitPriceD.toFixed(2)} · ${pnlStr}`,
    ts: now,
    pnl: realizedPnl.toNumber(),
  })

  // Equity history
  if (acct) {
    const newAvailableMargin = D(acct.available_margin).plus(isolatedMarginD).plus(realizedPnl).minus(closeFee)
    await admin.from('equity_history').insert({
      account_id: pos.account_id,
      ts: now,
      equity: newAvailableMargin.toNumber(),
      pnl: realizedPnl.toNumber(),
    })
  }
}
