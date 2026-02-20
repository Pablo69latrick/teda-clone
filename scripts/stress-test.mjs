#!/usr/bin/env node
/**
 * Stress test for the mock trading backend.
 * Runs 1000+ operations and validates every response + state consistency.
 *
 * Usage: node scripts/stress-test.mjs
 */

const BASE = 'http://localhost:3000/api/proxy'
let passed = 0
let failed = 0
let warnings = 0
const errors = []

// ─── Helpers ────────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Cookie: 'vp-session=mock-session' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}/${path}`, opts)
  const json = await res.json().catch(() => null)
  return { status: res.status, data: json }
}

function assert(condition, msg, ctx) {
  if (condition) {
    passed++
  } else {
    failed++
    const err = `FAIL: ${msg}` + (ctx ? ` | ctx: ${JSON.stringify(ctx).slice(0, 200)}` : '')
    errors.push(err)
    console.error(`  ❌ ${err}`)
  }
}

function warn(msg) {
  warnings++
  console.warn(`  ⚠️  ${msg}`)
}

function section(name) {
  console.log(`\n━━━ ${name} ━━━`)
}

const ACCT = 'f2538dee-cfb0-422a-bf7b-c6b247145b3a'
const SYMBOLS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'LINK-USD',
  'ADA-USD', 'AAVE-USD', '1INCH-USD', 'ARB-USD', 'ASTER-USD',
  'AUD-USD', 'EUR-USD', 'GBP-USD']

// ─── TEST SUITES ────────────────────────────────────────────────────────────

async function testGetEndpoints() {
  section('GET Endpoints (all 20+)')

  const endpoints = [
    ['auth/get-session', d => d?.session?.token],
    ['actions/accounts', d => Array.isArray(d) && d.length > 0],
    [`engine/trading-data?account_id=${ACCT}`, d => d?.account && Array.isArray(d.positions) && Array.isArray(d.instruments)],
    ['engine/instruments', d => Array.isArray(d) && d.length === 14],
    [`engine/positions?account_id=${ACCT}`, d => Array.isArray(d)],
    [`engine/closed-positions?account_id=${ACCT}`, d => Array.isArray(d)],
    [`engine/orders?account_id=${ACCT}`, d => Array.isArray(d)],
    [`engine/equity-history?account_id=${ACCT}`, d => Array.isArray(d) && d.length > 0],
    [`engine/activity?account_id=${ACCT}`, d => Array.isArray(d)],
    [`engine/challenge-status?account_id=${ACCT}`, d => d?.profit_target === 0.08],
    ['leaderboard', d => Array.isArray(d) && d.length === 20],
    [`engine/payouts?account_id=${ACCT}`, d => Array.isArray(d)],
    ['admin/payouts', d => Array.isArray(d)],
    ['engine/affiliate', d => d?.stats?.affiliate_code],
    ['engine/competitions', d => Array.isArray(d) && d.length === 3],
    ['misc/calendar', d => Array.isArray(d)],
    ['admin/users', d => Array.isArray(d) && d.length === 40],
    ['admin/accounts', d => Array.isArray(d) && d.length === 55],
    ['admin/stats', d => d?.total_users === 1847],
    ['admin/challenge-templates', d => Array.isArray(d) && d.length === 3],
    ['admin/risk-metrics', d => d?.total_open_exposure > 0],
    ['engine/candles?symbol=BTC-USD&interval=1h&limit=100', d => Array.isArray(d) && d.length > 50],
  ]

  for (const [path, validate] of endpoints) {
    const { status, data } = await api('GET', path)
    assert(status === 200, `GET ${path} → ${status}`, { status })
    assert(validate(data), `GET ${path} valid shape`, { data: typeof data })
  }
}

async function testInstrumentData() {
  section('Instrument Data Integrity')

  const { data: instruments } = await api('GET', 'engine/instruments')

  for (const inst of instruments) {
    assert(typeof inst.symbol === 'string' && inst.symbol.length > 0, `instrument ${inst.symbol} has symbol`)
    assert(inst.current_price > 0, `${inst.symbol} price > 0`, { price: inst.current_price })
    assert(inst.current_bid < inst.current_ask, `${inst.symbol} bid < ask`, { bid: inst.current_bid, ask: inst.current_ask })
    assert(inst.current_bid > 0, `${inst.symbol} bid > 0`)
    assert(inst.current_ask > 0, `${inst.symbol} ask > 0`)
    assert(inst.max_leverage >= 1, `${inst.symbol} max_leverage >= 1`)
    assert(inst.min_order_size > 0, `${inst.symbol} min_order_size > 0`)
    assert(inst.price_decimals >= 0, `${inst.symbol} has price_decimals`)
    assert(inst.qty_decimals >= 0, `${inst.symbol} has qty_decimals`)
    assert(inst.tick_size > 0, `${inst.symbol} has tick_size`)
    assert(typeof inst.is_tradable === 'boolean', `${inst.symbol} is_tradable is boolean`)
  }

  assert(instruments.length === 14, `14 instruments returned`, { count: instruments.length })
}

async function testAuth() {
  section('Authentication')

  // Valid sign-in
  const { status: s1, data: d1 } = await api('POST', 'auth/sign-in/email', {
    email: 'test@example.com', password: 'password123'
  })
  assert(s1 === 200, 'sign-in success', { status: s1 })
  assert(d1?.token, 'sign-in returns token')
  assert(d1?.user?.email === 'test@example.com', 'sign-in returns correct email')

  // Admin detection
  const { data: d2 } = await api('POST', 'auth/sign-in/email', {
    email: 'admin@test.com', password: 'password123'
  })
  assert(d2?.user?.role === 'admin', 'admin email gets admin role')

  // Invalid password
  const { status: s3 } = await api('POST', 'auth/sign-in/email', {
    email: 'test@example.com', password: '12345'
  })
  assert(s3 === 401, 'short password rejected', { status: s3 })

  // Missing email
  const { status: s4 } = await api('POST', 'auth/sign-in/email', {
    password: 'password123'
  })
  assert(s4 === 401, 'missing email rejected', { status: s4 })

  // Sign-up
  const { status: s5, data: d5 } = await api('POST', 'auth/sign-up/email', {
    name: 'Test User', email: 'new@test.com', password: 'longpassword'
  })
  assert(s5 === 201, 'sign-up success', { status: s5 })
  assert(d5?.user?.emailVerified === false, 'sign-up email not verified')

  // Sign-up too short password
  const { status: s6 } = await api('POST', 'auth/sign-up/email', {
    name: 'Test', email: 'x@y.com', password: '1234567'
  })
  assert(s6 === 400, 'sign-up short password rejected', { status: s6 })

  // Sign-out
  const { status: s7 } = await api('POST', 'auth/sign-out', {})
  assert(s7 === 200, 'sign-out success')
}

async function testOrderValidation() {
  section('Order Validation')

  // Unknown symbol
  const { status: s1 } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'FAKE-USD', direction: 'long',
    order_type: 'market', quantity: 1, leverage: 10
  })
  assert(s1 === 400, 'unknown symbol rejected', { status: s1 })

  // Invalid direction
  const { status: s2 } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'BTC-USD', direction: 'sideways',
    order_type: 'market', quantity: 1, leverage: 10
  })
  assert(s2 === 400, 'invalid direction rejected', { status: s2 })

  // Zero quantity
  const { status: s3 } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'BTC-USD', direction: 'long',
    order_type: 'market', quantity: 0, leverage: 10
  })
  assert(s3 === 400, 'zero quantity rejected', { status: s3 })

  // Negative quantity
  const { status: s4 } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'BTC-USD', direction: 'long',
    order_type: 'market', quantity: -5, leverage: 10
  })
  assert(s4 === 400, 'negative quantity rejected', { status: s4 })

  // Pending order without price
  const { status: s5 } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'BTC-USD', direction: 'long',
    order_type: 'limit', quantity: 0.01, leverage: 10
  })
  assert(s5 === 422, 'limit order without price rejected', { status: s5 })

  // Margin exceeded - try to buy way too much BTC
  const { status: s6 } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'BTC-USD', direction: 'long',
    order_type: 'market', quantity: 1000, leverage: 1
  })
  assert(s6 === 422, 'insufficient margin rejected', { status: s6 })
}

async function testMarketOrderCycle() {
  section('Market Order Full Cycle (open → verify → close → verify)')

  for (const sym of ['BTC-USD', 'ETH-USD', 'SOL-USD']) {
    // Open long
    const { status: os, data: od } = await api('POST', 'engine/orders', {
      account_id: ACCT, symbol: sym, direction: 'long',
      order_type: 'market', quantity: 0.01, leverage: 10,
      sl_price: null, tp_price: null
    })
    assert(os === 201, `open long ${sym}`, { status: os })
    assert(od?.status === 'filled', `${sym} order filled`)
    assert(od?.price > 0, `${sym} fill price > 0`, { price: od?.price })

    // Verify position exists
    const { data: positions } = await api('GET', `engine/positions?account_id=${ACCT}`)
    const found = positions.find(p => p.id === od?.id)
    assert(!!found, `${sym} position found in positions list`)
    assert(found?.quantity === 0.01, `${sym} position has correct qty`)
    assert(found?.leverage === 10, `${sym} position has correct leverage`)
    assert(found?.direction === 'long', `${sym} position has correct direction`)
    assert(found?.entry_price > 0, `${sym} position has entry_price`)
    assert(found?.isolated_margin > 0, `${sym} position has margin`)

    // Close position
    const { status: cs, data: cd } = await api('POST', 'engine/close-position', {
      position_id: od?.id
    })
    assert(cs === 200, `close ${sym}`, { status: cs })
    assert(cd?.success === true, `${sym} close success`)
    assert(typeof cd?.realized_pnl === 'number', `${sym} has realized_pnl`)
    assert(typeof cd?.close_fee === 'number', `${sym} has close_fee`)
    assert(cd?.close_fee > 0, `${sym} close fee > 0`)

    // Verify position gone from open
    const { data: posAfter } = await api('GET', `engine/positions?account_id=${ACCT}`)
    const foundAfter = posAfter.find(p => p.id === od?.id)
    assert(!foundAfter, `${sym} position removed from open list`)

    // Verify position in closed
    const { data: closed } = await api('GET', `engine/closed-positions?account_id=${ACCT}`)
    const closedFound = closed.find(p => p.id === od?.id)
    assert(!!closedFound, `${sym} position in closed list`)
    assert(closedFound?.status === 'closed', `${sym} closed position has status=closed`)
    assert(closedFound?.exit_price > 0, `${sym} has exit_price`)
    assert(closedFound?.close_reason === 'manual', `${sym} close_reason = manual`)
  }
}

async function testShortOrders() {
  section('Short Orders')

  for (const sym of ['BTC-USD', 'ETH-USD', 'AUD-USD']) {
    const { status: os, data: od } = await api('POST', 'engine/orders', {
      account_id: ACCT, symbol: sym, direction: 'short',
      order_type: 'market', quantity: 0.01, leverage: 5
    })
    assert(os === 201, `open short ${sym}`, { status: os })
    assert(od?.status === 'filled', `${sym} short filled`)

    // Close
    const { status: cs } = await api('POST', 'engine/close-position', {
      position_id: od?.id
    })
    assert(cs === 200, `close short ${sym}`, { status: cs })
  }
}

async function testPartialClose() {
  section('Partial Close')

  // Open position with 1.0 quantity
  const { data: od } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'ETH-USD', direction: 'long',
    order_type: 'market', quantity: 1.0, leverage: 5
  })
  assert(od?.status === 'filled', 'opened position for partial close')

  // Partial close 0.3
  const { status: s1, data: d1 } = await api('POST', 'engine/partial-close', {
    position_id: od?.id, quantity: 0.3
  })
  assert(s1 === 200, 'partial close 0.3 success', { status: s1 })
  assert(d1?.remaining_qty !== undefined, 'has remaining_qty')
  assert(Math.abs(d1?.remaining_qty - 0.7) < 0.001, 'remaining is ~0.7', { remaining: d1?.remaining_qty })

  // Partial close another 0.3
  const { status: s2, data: d2 } = await api('POST', 'engine/partial-close', {
    position_id: od?.id, quantity: 0.3
  })
  assert(s2 === 200, 'partial close another 0.3', { status: s2 })
  assert(Math.abs(d2?.remaining_qty - 0.4) < 0.001, 'remaining is ~0.4', { remaining: d2?.remaining_qty })

  // Try to partial close more than remaining (should fail)
  const { status: s3 } = await api('POST', 'engine/partial-close', {
    position_id: od?.id, quantity: 0.5
  })
  assert(s3 === 400, 'partial close > remaining rejected', { status: s3 })

  // Try to partial close exact remaining (should fail — use full close instead)
  const { status: s4 } = await api('POST', 'engine/partial-close', {
    position_id: od?.id, quantity: 0.4
  })
  assert(s4 === 400, 'partial close = remaining rejected (use full close)', { status: s4 })

  // Close remaining
  const { status: s5 } = await api('POST', 'engine/close-position', {
    position_id: od?.id
  })
  assert(s5 === 200, 'full close remaining', { status: s5 })
}

async function testPendingOrders() {
  section('Pending Orders (Limit + Stop)')

  // Limit buy
  const { status: s1, data: d1 } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'BTC-USD', direction: 'long',
    order_type: 'limit', quantity: 0.01, leverage: 10,
    price: 90000
  })
  assert(s1 === 201, 'limit order created', { status: s1 })
  assert(d1?.status === 'pending', 'limit order pending')
  assert(d1?.filled_quantity === 0, 'limit order not filled')

  // Stop sell
  const { status: s2, data: d2 } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'ETH-USD', direction: 'short',
    order_type: 'stop', quantity: 0.1, leverage: 5,
    price: 3000
  })
  assert(s2 === 201, 'stop order created', { status: s2 })
  assert(d2?.status === 'pending', 'stop order pending')

  // Verify in orders list
  const { data: orders } = await api('GET', `engine/orders?account_id=${ACCT}`)
  const limit = orders.find(o => o.id === d1?.id)
  assert(!!limit, 'limit order in list')
  const stop = orders.find(o => o.id === d2?.id)
  assert(!!stop, 'stop order in list')

  // Cancel limit
  const { status: cs1 } = await api('POST', 'engine/cancel-order', { order_id: d1?.id })
  assert(cs1 === 200, 'cancel limit order')

  // Cancel stop
  const { status: cs2 } = await api('POST', 'engine/cancel-order', { order_id: d2?.id })
  assert(cs2 === 200, 'cancel stop order')

  // Verify cancelled (not in pending list)
  const { data: ordersAfter } = await api('GET', `engine/orders?account_id=${ACCT}`)
  assert(!ordersAfter.find(o => o.id === d1?.id), 'limit order removed from pending')
  assert(!ordersAfter.find(o => o.id === d2?.id), 'stop order removed from pending')

  // Try to cancel already cancelled
  const { status: cs3 } = await api('POST', 'engine/cancel-order', { order_id: d1?.id })
  assert(cs3 === 404, 'already cancelled order returns 404', { status: cs3 })
}

async function testDoubleClose() {
  section('Double Close Prevention')

  const { data: od } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'BTC-USD', direction: 'long',
    order_type: 'market', quantity: 0.01, leverage: 10
  })

  // First close
  const { status: s1 } = await api('POST', 'engine/close-position', {
    position_id: od?.id
  })
  assert(s1 === 200, 'first close success')

  // Second close should fail
  const { status: s2 } = await api('POST', 'engine/close-position', {
    position_id: od?.id
  })
  assert(s2 === 404, 'double close returns 404', { status: s2 })
}

async function testAccountConsistency() {
  section('Account Consistency')

  // Get initial state
  const { data: acctBefore } = await api('GET', `engine/trading-data?account_id=${ACCT}`)
  const nwBefore = acctBefore?.account?.net_worth
  assert(typeof nwBefore === 'number', 'net_worth is number')

  // Open and close a position
  const { data: od } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'ADA-USD', direction: 'long',
    order_type: 'market', quantity: 100, leverage: 10
  })
  assert(od?.status === 'filled', 'opened ADA for consistency test')

  // While open, margin should be used
  const { data: acctDuring } = await api('GET', `engine/trading-data?account_id=${ACCT}`)
  assert(acctDuring?.account?.total_margin_required > 0, 'margin used > 0 while position open')
  assert(acctDuring?.account?.available_margin < nwBefore, 'available margin reduced')

  // Close
  await api('POST', 'engine/close-position', { position_id: od?.id })

  // After close, margin should be released
  const { data: acctAfter } = await api('GET', `engine/trading-data?account_id=${ACCT}`)
  // Only check that open positions margin is 0 if no other positions
  const openPositions = acctAfter?.positions?.length ?? 0
  if (openPositions === 0) {
    assert(acctAfter?.account?.total_margin_required === 0, 'margin released after close')
  }
}

async function testSlTpStorage() {
  section('SL/TP Storage')

  const { data: od } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'BTC-USD', direction: 'long',
    order_type: 'market', quantity: 0.01, leverage: 10,
    sl_price: 90000, tp_price: 100000
  })
  assert(od?.sl_price === 90000, 'order response has sl_price')
  assert(od?.tp_price === 100000, 'order response has tp_price')

  // Verify position has SL/TP
  const { data: positions } = await api('GET', `engine/positions?account_id=${ACCT}`)
  const pos = positions.find(p => p.id === od?.id)
  assert(pos?.sl_price === 90000, 'position has sl_price', { sl: pos?.sl_price })
  assert(pos?.tp_price === 100000, 'position has tp_price', { tp: pos?.tp_price })

  // Cleanup
  await api('POST', 'engine/close-position', { position_id: od?.id })
}

async function testChallengeStatus() {
  section('Challenge Status')

  const { data } = await api('GET', `engine/challenge-status?account_id=${ACCT}`)
  assert(data?.profit_target === 0.08, 'profit_target = 8%')
  assert(data?.daily_loss_limit === 0.05, 'daily_loss_limit = 5%')
  assert(data?.max_drawdown === 0.10, 'max_drawdown = 10%')
  assert(typeof data?.current_profit === 'number', 'current_profit is number')
  assert(typeof data?.current_drawdown === 'number', 'current_drawdown is number')
  assert(data?.current_drawdown >= 0, 'drawdown >= 0')
  assert(typeof data?.trading_days === 'number', 'trading_days is number')
}

async function testActivityLog() {
  section('Activity Log')

  const { data: before } = await api('GET', `engine/activity?account_id=${ACCT}`)
  const countBefore = before.length

  // Open a position
  const { data: od } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'LINK-USD', direction: 'long',
    order_type: 'market', quantity: 1, leverage: 5
  })

  const { data: afterOpen } = await api('GET', `engine/activity?account_id=${ACCT}`)
  assert(afterOpen.length > countBefore, 'activity grew after open')
  assert(afterOpen[0]?.type === 'position', 'latest activity is position type')
  assert(afterOpen[0]?.title?.includes('LINK-USD'), 'activity mentions LINK-USD')

  // Close
  await api('POST', 'engine/close-position', { position_id: od?.id })

  const { data: afterClose } = await api('GET', `engine/activity?account_id=${ACCT}`)
  assert(afterClose.length > afterOpen.length, 'activity grew after close')
  assert(afterClose[0]?.type === 'closed', 'latest activity is closed type')
  assert(afterClose[0]?.pnl !== null && afterClose[0]?.pnl !== undefined, 'close activity has pnl')
}

async function testEquityHistory() {
  section('Equity History')

  const { data } = await api('GET', `engine/equity-history?account_id=${ACCT}`)
  assert(Array.isArray(data), 'equity history is array')
  assert(data.length >= 30, 'at least 30 points', { length: data.length })

  for (const point of data) {
    assert(typeof point.ts === 'number', 'point has ts')
    assert(typeof point.equity === 'number', 'point has equity')
    assert(typeof point.pnl === 'number', 'point has pnl')
    assert(point.equity > 0, 'equity > 0', { equity: point.equity })
  }

  // Check last point reflects current account
  const { data: acct } = await api('GET', `actions/accounts`)
  const lastPoint = data[data.length - 1]
  assert(Math.abs(lastPoint.equity - acct[0].net_worth) < 1, 'last equity point matches account net_worth')
}

async function testCandles() {
  section('Candles')

  for (const interval of ['1m', '5m', '15m', '1h', '4h', '1d', '1w']) {
    const { data } = await api('GET', `engine/candles?symbol=BTC-USD&interval=${interval}&limit=50`)
    assert(Array.isArray(data), `${interval} candles is array`)
    assert(data.length > 0, `${interval} has candles`)

    for (const c of data) {
      assert(c.low <= c.high, `${interval} candle low <= high`, { low: c.low, high: c.high })
      assert(c.open >= c.low && c.open <= c.high, `${interval} candle open in range`)
      assert(c.close >= c.low && c.close <= c.high, `${interval} candle close in range`)
      assert(c.volume > 0, `${interval} candle volume > 0`)
      assert(c.time > 0, `${interval} candle has time`)
    }
  }
}

async function testAllSymbolsTrading() {
  section('Trade All 14 Symbols')

  for (const sym of SYMBOLS) {
    const { status, data } = await api('POST', 'engine/orders', {
      account_id: ACCT, symbol: sym, direction: 'long',
      order_type: 'market', quantity: 0.01, leverage: 5
    })
    assert(status === 201, `open ${sym}`, { status })
    assert(data?.status === 'filled', `${sym} filled`)

    const { status: cs } = await api('POST', 'engine/close-position', {
      position_id: data?.id
    })
    assert(cs === 200, `close ${sym}`, { status: cs })
  }
}

async function testRapidFireTrading() {
  section('Rapid Fire: 200 trades (open + close)')

  const positionIds = []

  // Open 200 positions rapidly
  for (let i = 0; i < 200; i++) {
    const sym = SYMBOLS[i % SYMBOLS.length]
    const dir = i % 2 === 0 ? 'long' : 'short'
    const { status, data } = await api('POST', 'engine/orders', {
      account_id: ACCT, symbol: sym, direction: dir,
      order_type: 'market', quantity: 0.01, leverage: 5
    })
    if (status === 201 && data?.id) {
      positionIds.push(data.id)
    } else if (status === 422) {
      // Margin exhausted — expected at some point
      warn(`margin exhausted at trade #${i + 1}`)
      break
    } else {
      assert(false, `rapid trade #${i + 1} unexpected status`, { status })
    }
  }

  console.log(`  opened ${positionIds.length} positions`)
  assert(positionIds.length > 0, 'at least some positions opened')

  // Close all
  let closedCount = 0
  for (const id of positionIds) {
    const { status } = await api('POST', 'engine/close-position', { position_id: id })
    if (status === 200) closedCount++
  }
  assert(closedCount === positionIds.length, `closed all ${positionIds.length}`, { closed: closedCount })

  // Verify no open positions
  const { data: remaining } = await api('GET', `engine/positions?account_id=${ACCT}`)
  assert(remaining.length === 0, 'no positions remaining after rapid fire cleanup', { remaining: remaining.length })
}

async function testFeeAccounting() {
  section('Fee Accounting')

  // Get state before
  const { data: before } = await api('GET', `engine/trading-data?account_id=${ACCT}`)
  const nwBefore = before?.account?.net_worth

  // Do 50 quick open+close trades and track fees
  let totalFeesExpected = 0
  for (let i = 0; i < 50; i++) {
    const sym = 'XRP-USD'
    const { data: od } = await api('POST', 'engine/orders', {
      account_id: ACCT, symbol: sym, direction: 'long',
      order_type: 'market', quantity: 10, leverage: 10
    })
    if (!od?.id) break

    const { data: cd } = await api('POST', 'engine/close-position', { position_id: od.id })
    if (cd?.close_fee) totalFeesExpected += cd.close_fee
    // Opening fee is baked into the notional
  }

  assert(totalFeesExpected > 0, 'accumulated fees > 0', { fees: totalFeesExpected })
}

async function testLeverageValues() {
  section('Leverage Edge Cases')

  // Leverage = 1 (minimum)
  const { status: s1, data: d1 } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'DOGE-USD', direction: 'long',
    order_type: 'market', quantity: 100, leverage: 1
  })
  assert(s1 === 201, 'leverage=1 accepted', { status: s1 })
  if (d1?.id) await api('POST', 'engine/close-position', { position_id: d1.id })

  // Leverage > max should be capped
  const { status: s2, data: d2 } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'DOGE-USD', direction: 'long',
    order_type: 'market', quantity: 100, leverage: 200
  })
  // After our fix, this should be capped or rejected
  if (s2 === 201 && d2?.id) {
    const { data: pos } = await api('GET', `engine/positions?account_id=${ACCT}`)
    const p = pos.find(pp => pp.id === d2.id)
    if (p) {
      assert(p.leverage <= 20, 'leverage capped to maxLev', { leverage: p.leverage })
    }
    await api('POST', 'engine/close-position', { position_id: d2.id })
  }
}

async function testMinOrderSize() {
  section('Min Order Size Validation')

  // BTC min is 0.001 — try smaller
  const { status: s1 } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'BTC-USD', direction: 'long',
    order_type: 'market', quantity: 0.0001, leverage: 10
  })
  assert(s1 === 400, 'below min order size rejected', { status: s1 })
}

async function testEdgeCases() {
  section('Edge Cases')

  // Close non-existent position
  const { status: s1 } = await api('POST', 'engine/close-position', {
    position_id: 'fake-id-12345'
  })
  assert(s1 === 404, 'close fake position = 404', { status: s1 })

  // Partial close non-existent
  const { status: s2 } = await api('POST', 'engine/partial-close', {
    position_id: 'fake-id-12345', quantity: 0.1
  })
  assert(s2 === 404, 'partial close fake position = 404', { status: s2 })

  // Cancel non-existent order
  const { status: s3 } = await api('POST', 'engine/cancel-order', {
    order_id: 'fake-id-12345'
  })
  assert(s3 === 404, 'cancel fake order = 404', { status: s3 })

  // Unknown POST endpoint
  const { status: s4 } = await api('POST', 'engine/unknown-endpoint', {})
  // Should return something (null → 404 or fallback)
  assert([200, 404, 500].includes(s4), 'unknown endpoint handled', { status: s4 })
}

async function testConcurrentClose() {
  section('Concurrent Close (Race Condition)')

  // Open position
  const { data: od } = await api('POST', 'engine/orders', {
    account_id: ACCT, symbol: 'BTC-USD', direction: 'long',
    order_type: 'market', quantity: 0.01, leverage: 10
  })

  // Fire 2 close requests simultaneously
  const [r1, r2] = await Promise.all([
    api('POST', 'engine/close-position', { position_id: od?.id }),
    api('POST', 'engine/close-position', { position_id: od?.id }),
  ])

  const successCount = [r1, r2].filter(r => r.status === 200).length
  const failCount = [r1, r2].filter(r => r.status === 404).length
  assert(successCount === 1, 'exactly one close succeeds', { s1: r1.status, s2: r2.status })
  assert(failCount === 1, 'exactly one close fails with 404', { s1: r1.status, s2: r2.status })
}

async function testTradingDataIntegrity() {
  section('Trading Data Integrity')

  const { data } = await api('GET', `engine/trading-data?account_id=${ACCT}`)

  assert(data?.account, 'trading-data has account')
  assert(Array.isArray(data?.positions), 'trading-data has positions array')
  assert(Array.isArray(data?.instruments), 'trading-data has instruments array')
  assert(typeof data?.prices === 'object', 'trading-data has prices object')

  // Verify prices match instruments
  for (const inst of data.instruments) {
    assert(data.prices[inst.symbol] !== undefined, `price for ${inst.symbol} in prices map`)
    assert(Math.abs(data.prices[inst.symbol] - inst.current_price) < 0.01 * inst.current_price,
      `prices map matches instrument price for ${inst.symbol}`)
  }

  // Account fields
  const acct = data.account
  assert(typeof acct.available_margin === 'number', 'has available_margin')
  assert(typeof acct.net_worth === 'number', 'has net_worth')
  assert(typeof acct.total_margin_required === 'number', 'has total_margin_required')
  assert(typeof acct.unrealized_pnl === 'number', 'has unrealized_pnl')
  assert(typeof acct.realized_pnl === 'number', 'has realized_pnl')
  assert(acct.available_margin >= 0, 'available_margin >= 0')
  assert(acct.injected_funds === 200000, 'injected_funds = 200k')
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════╗')
  console.log('║  STRESS TEST — Mock Trading Backend          ║')
  console.log('║  Target: 1000+ assertions                    ║')
  console.log('╚══════════════════════════════════════════════╝')

  const start = Date.now()

  try {
    await testGetEndpoints()
    await testInstrumentData()
    await testAuth()
    await testOrderValidation()
    await testTradingDataIntegrity()
    await testMarketOrderCycle()
    await testShortOrders()
    await testPartialClose()
    await testPendingOrders()
    await testDoubleClose()
    await testAccountConsistency()
    await testSlTpStorage()
    await testChallengeStatus()
    await testActivityLog()
    await testEquityHistory()
    await testCandles()
    await testAllSymbolsTrading()
    await testRapidFireTrading()
    await testFeeAccounting()
    await testLeverageValues()
    await testMinOrderSize()
    await testEdgeCases()
    await testConcurrentClose()
  } catch (err) {
    console.error(`\n💥 FATAL ERROR: ${err.message}`)
    console.error(err.stack)
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)

  console.log('\n╔══════════════════════════════════════════════╗')
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed, ${warnings} warnings`)
  console.log(`║  Time: ${elapsed}s`)
  console.log('╚══════════════════════════════════════════════╝')

  if (errors.length > 0) {
    console.log('\n── FAILURES ──')
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
  }

  process.exit(failed > 0 ? 1 : 0)
}

main()
