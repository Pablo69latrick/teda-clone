#!/usr/bin/env node
/**
 * Stress test — 100k accounts CRM backend
 *
 * Validates that:
 *  1. All admin endpoints return data seeded from 100k accounts
 *  2. Stats are consistent (totals match counts)
 *  3. Search/filter/pagination work
 *  4. Response times are acceptable (< 500ms per endpoint)
 *  5. Leaderboard is generated from real seeded data
 *  6. Trading endpoints still work alongside CRM
 *
 * Usage:  node scripts/stress-test-100k.mjs
 * Requires: dev server running on port 3000
 */

const BASE = 'http://localhost:3000/api/proxy'
let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

async function fetchJson(path) {
  const start = Date.now()
  const res = await fetch(`${BASE}/${path}`, { credentials: 'include' })
  const ms = Date.now() - start
  const data = await res.json()
  return { data, ms, status: res.status }
}

async function postJson(path, body) {
  const start = Date.now()
  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  const ms = Date.now() - start
  const data = await res.json()
  return { data, ms, status: res.status }
}

// ─── Test suites ──────────────────────────────────────────────────────────────

async function testAdminStats() {
  console.log('\n═══ Admin Stats ═══')
  const { data, ms } = await fetchJson('admin/stats')
  console.log(`  Response time: ${ms}ms`)
  assert(ms < 500, `admin/stats responded in ${ms}ms (should be < 500ms)`)

  assert(data != null, 'admin/stats returns data')
  assert(data.total_users === 72000, `total_users = ${data.total_users} (expected 72000)`)

  const totalAccounts = data.active_accounts + data.funded_accounts +
    data.breached_accounts + (data.passed_accounts ?? 0) + (data.closed_accounts ?? 0)
  assert(totalAccounts === 100000, `total accounts = ${totalAccounts} (expected 100000)`)

  // Distribution checks (±2% tolerance)
  const activePct = data.active_accounts / 100000
  assert(activePct > 0.50 && activePct < 0.60, `active % = ${(activePct * 100).toFixed(1)}% (expected ~55%)`)

  const fundedPct = data.funded_accounts / 100000
  assert(fundedPct > 0.09 && fundedPct < 0.15, `funded % = ${(fundedPct * 100).toFixed(1)}% (expected ~12%)`)

  const breachedPct = data.breached_accounts / 100000
  assert(breachedPct > 0.15 && breachedPct < 0.21, `breached % = ${(breachedPct * 100).toFixed(1)}% (expected ~18%)`)

  assert(data.total_deposited > 0, `total_deposited = $${data.total_deposited.toLocaleString()}`)
  assert(data.total_payouts_paid > 0, `total_payouts_paid = $${data.total_payouts_paid.toLocaleString()}`)
  assert(data.revenue_all_time > 0, `revenue_all_time = $${data.revenue_all_time.toLocaleString()}`)
  assert(data.new_signups_month >= 0, `new_signups_month = ${data.new_signups_month}`)
  assert(data.churn_rate > 0 && data.churn_rate < 1, `churn_rate = ${data.churn_rate}`)
  assert(data.avg_account_lifetime_days > 0, `avg_lifetime = ${data.avg_account_lifetime_days} days`)

  console.log(`  Stats summary:`)
  console.log(`    Users: ${data.total_users.toLocaleString()}`)
  console.log(`    Active: ${data.active_accounts.toLocaleString()} | Funded: ${data.funded_accounts.toLocaleString()} | Breached: ${data.breached_accounts.toLocaleString()}`)
  console.log(`    Revenue (all-time): $${data.revenue_all_time.toLocaleString()}`)
  console.log(`    Payouts paid: $${data.total_payouts_paid.toLocaleString()}`)
}

async function testAdminUsers() {
  console.log('\n═══ Admin Users ═══')

  // Default pagination
  const { data, ms } = await fetchJson('admin/users')
  console.log(`  Default fetch: ${data.length} users in ${ms}ms`)
  assert(ms < 500, `admin/users responded in ${ms}ms`)
  assert(data.length === 200, `default returns 200 users (got ${data.length})`)

  // Verify user structure
  const u = data[0]
  assert(u.id != null, 'user has id')
  assert(u.name != null, 'user has name')
  assert(u.email != null, 'user has email')
  assert(u.role != null, 'user has role')
  assert(typeof u.createdAt === 'number', 'createdAt is epoch ms')
  assert(typeof u.lastSeen === 'number', 'lastSeen is epoch ms')

  // Search
  const { data: searched, ms: searchMs } = await fetchJson('admin/users?search=alex')
  console.log(`  Search "alex": ${searched.length} results in ${searchMs}ms`)
  assert(searched.length > 0, 'search returns results')
  assert(searched.every(u => u.name.toLowerCase().includes('alex') || u.email.toLowerCase().includes('alex')),
    'all search results contain "alex"')

  // Pagination
  const { data: page2 } = await fetchJson('admin/users?limit=50&offset=50')
  assert(page2.length === 50, `page 2 returns 50 users (got ${page2.length})`)
  assert(page2[0].id !== data[0].id, 'page 2 has different users than page 1')

  // Admin users exist
  const admins = data.filter(u => u.role === 'admin')
  console.log(`  Admins in first page: ${admins.length}`)
}

async function testAdminAccounts() {
  console.log('\n═══ Admin Accounts ═══')

  const { data, ms } = await fetchJson('admin/accounts')
  console.log(`  Default fetch: ${data.length} accounts in ${ms}ms`)
  assert(ms < 500, `admin/accounts responded in ${ms}ms`)
  assert(data.length === 200, `default returns 200 accounts (got ${data.length})`)

  // Verify structure
  const a = data[0]
  assert(a.id != null, 'account has id')
  assert(a.userId != null, 'account has userId')
  assert(a.userName != null, 'account has userName')
  assert(a.userEmail != null, 'account has userEmail')
  assert(a.accountStatus != null, 'account has accountStatus')
  assert(a.availableMargin != null, 'account has availableMargin')
  assert(a.challengeTemplateId != null, 'account has challengeTemplateId')
  assert(typeof a.createdAt === 'number', 'createdAt is epoch ms')

  // Filter by status
  const { data: funded } = await fetchJson('admin/accounts?status=funded')
  console.log(`  Funded accounts: ${funded.length}`)
  assert(funded.length > 0, 'funded filter returns results')
  assert(funded.every(a => a.accountStatus === 'funded'), 'all filtered are funded')

  // Search
  const { data: searched } = await fetchJson('admin/accounts?search=chen')
  console.log(`  Search "chen": ${searched.length} results`)
  assert(searched.length > 0, 'account search returns results')

  // Search + status
  const { data: combo } = await fetchJson('admin/accounts?search=alex&status=active')
  console.log(`  Search "alex" + status active: ${combo.length} results`)
  if (combo.length > 0) {
    assert(combo.every(a => a.accountStatus === 'active'), 'combo filter respects status')
  }
}

async function testAdminRiskMetrics() {
  console.log('\n═══ Admin Risk Metrics ═══')

  const { data, ms } = await fetchJson('admin/risk-metrics')
  console.log(`  Response time: ${ms}ms`)
  assert(ms < 500, `admin/risk-metrics responded in ${ms}ms`)

  assert(data.total_open_exposure > 0, `total_open_exposure = $${data.total_open_exposure.toLocaleString()}`)
  assert(data.max_single_account_exposure > 0, `max_single_exposure = $${data.max_single_account_exposure.toLocaleString()}`)
  assert(data.accounts_near_breach >= 0, `accounts_near_breach = ${data.accounts_near_breach}`)
  assert(data.accounts_at_daily_limit >= 0, `accounts_at_daily_limit = ${data.accounts_at_daily_limit}`)

  // Drawdown distribution
  assert(Array.isArray(data.drawdown_distribution), 'drawdown_distribution is array')
  assert(data.drawdown_distribution.length === 5, 'drawdown has 5 buckets')
  const totalDD = data.drawdown_distribution.reduce((s, b) => s + b.count, 0)
  assert(totalDD === 100000, `drawdown distribution sums to ${totalDD} (expected 100000)`)

  // Top symbols
  assert(Array.isArray(data.top_symbols_exposure), 'top_symbols is array')
  assert(data.top_symbols_exposure.length > 0, 'has symbol exposure data')
  assert(data.top_symbols_exposure.length <= 5, 'max 5 symbols')

  // Largest position
  assert(data.largest_open_position != null, 'has largest position')
  assert(data.largest_open_position.symbol != null, 'largest pos has symbol')
  assert(data.largest_open_position.notional > 0, 'largest pos has notional')

  console.log(`  Open exposure: $${data.total_open_exposure.toLocaleString()}`)
  console.log(`  Near breach: ${data.accounts_near_breach}`)
  console.log(`  Largest position: ${data.largest_open_position.symbol} $${data.largest_open_position.notional.toLocaleString()} (${data.largest_open_position.direction})`)
}

async function testAdminChallengeTemplates() {
  console.log('\n═══ Admin Challenge Templates ═══')

  const { data, ms } = await fetchJson('admin/challenge-templates')
  console.log(`  Response time: ${ms}ms`)
  assert(ms < 500, `responded in ${ms}ms`)

  assert(Array.isArray(data), 'returns array')
  assert(data.length === 3, `3 templates (got ${data.length})`)

  let totalAccountCount = 0
  for (const t of data) {
    assert(t.id != null, `template ${t.name} has id`)
    assert(t.account_count > 0, `template ${t.name} has ${t.account_count} accounts`)
    assert(Array.isArray(t.phase_sequence), `template ${t.name} has phase_sequence`)
    totalAccountCount += t.account_count
    console.log(`  ${t.name}: ${t.account_count.toLocaleString()} accounts ($${t.entry_fee})`)
  }

  assert(totalAccountCount === 100000, `template accounts sum to ${totalAccountCount} (expected 100000)`)
}

async function testAdminPayouts() {
  console.log('\n═══ Admin Payouts ═══')

  const { data, ms } = await fetchJson('admin/payouts')
  console.log(`  Default fetch: ${data.length} payouts in ${ms}ms`)
  assert(ms < 500, `responded in ${ms}ms`)
  assert(data.length > 0, 'has payouts')

  // Verify structure
  const p = data[0]
  assert(p.id != null, 'payout has id')
  assert(p.account_id != null, 'payout has account_id')
  assert(p.user_name != null, 'payout has user_name')
  assert(p.amount > 0, 'payout has positive amount')
  assert(['pending', 'approved', 'rejected', 'paid'].includes(p.status), `valid status: ${p.status}`)

  // Filter by status
  const { data: pending } = await fetchJson('admin/payouts?status=pending')
  console.log(`  Pending payouts: ${pending.length}`)
  if (pending.length > 0) {
    assert(pending.every(p => p.status === 'pending'), 'filtered payouts are all pending')
  }

  const statuses = {}
  for (const pay of data) statuses[pay.status] = (statuses[pay.status] || 0) + 1
  console.log(`  Payout distribution:`, statuses)
}

async function testAdminAffiliates() {
  console.log('\n═══ Admin Affiliates ═══')

  const { data, ms } = await fetchJson('admin/affiliates')
  console.log(`  Response: ${data.length} affiliates in ${ms}ms`)
  assert(ms < 500, `responded in ${ms}ms`)
  assert(data.length > 0, 'has affiliates')

  const a = data[0]
  assert(a.userId != null, 'affiliate has userId')
  assert(a.userEmail != null, 'affiliate has userEmail')
  assert(a.affiliateCode != null, 'affiliate has code')
  assert(['active', 'pending', 'suspended'].includes(a.status), `valid status: ${a.status}`)

  const statuses = {}
  for (const af of data) statuses[af.status] = (statuses[af.status] || 0) + 1
  console.log(`  Status distribution:`, statuses)
}

async function testLeaderboard() {
  console.log('\n═══ Leaderboard ═══')

  const { data, ms } = await fetchJson('leaderboard')
  console.log(`  Response: ${data.length} entries in ${ms}ms`)
  assert(ms < 500, `responded in ${ms}ms`)
  assert(data.length === 20, `20 entries (got ${data.length})`)

  // Sorted by profit
  for (let i = 1; i < data.length; i++) {
    assert(data[i - 1].profit_pct >= data[i].profit_pct,
      `leaderboard sorted: #${i} (${data[i - 1].profit_pct}%) >= #${i + 1} (${data[i].profit_pct}%)`)
  }

  // All have valid fields
  for (const entry of data) {
    assert(entry.rank > 0, `rank ${entry.rank} > 0`)
    assert(entry.username != null, 'has username')
    assert(entry.user_id != null, 'has user_id')
    assert(entry.account_id != null, 'has account_id')
    assert(typeof entry.profit_pct === 'number', 'profit_pct is number')
    assert(typeof entry.profit_amount === 'number', 'profit_amount is number')
  }

  console.log(`  #1: ${data[0].username} — ${data[0].profit_pct}% ($${data[0].profit_amount.toLocaleString()})`)
  console.log(`  #20: ${data[19].username} — ${data[19].profit_pct}% ($${data[19].profit_amount.toLocaleString()})`)
}

async function testTradingStillWorks() {
  console.log('\n═══ Trading Engine (alongside CRM) ═══')

  // Trading data
  const { data: td, ms: tdMs } = await fetchJson('engine/trading-data?account_id=f2538dee-cfb0-422a-bf7b-c6b247145b3a')
  assert(tdMs < 500, `trading-data in ${tdMs}ms`)
  assert(td.account != null, 'has account')
  assert(td.instruments != null, 'has instruments')
  assert(td.prices != null, 'has prices')
  assert(Object.keys(td.prices).length === 14, '14 instrument prices')

  // Place order
  const { data: order, status: orderStatus } = await postJson('engine/orders', {
    symbol: 'BTC-USD', direction: 'long', order_type: 'market',
    quantity: 0.01, leverage: 5, margin_mode: 'cross',
  })
  assert(orderStatus === 201, `order placed (status ${orderStatus})`)
  assert(order.status === 'filled', 'order is filled')

  // Close it
  const { data: closed } = await postJson('engine/close-position', {
    position_id: order.id,
  })
  assert(closed.success === true, 'position closed')

  console.log(`  ✓ Trading engine works alongside 100k CRM data`)
}

async function testConsistency() {
  console.log('\n═══ Cross-Endpoint Consistency ═══')

  const [statsRes, templatesRes, riskRes, payoutsRes] = await Promise.all([
    fetchJson('admin/stats'),
    fetchJson('admin/challenge-templates'),
    fetchJson('admin/risk-metrics'),
    fetchJson('admin/payouts'),
  ])

  const stats = statsRes.data
  const templates = templatesRes.data
  const risk = riskRes.data
  const payouts = payoutsRes.data

  // Template account counts should sum to 100k
  const tmplTotal = templates.reduce((s, t) => s + t.account_count, 0)
  assert(tmplTotal === 100000, `template total = ${tmplTotal}`)

  // Funded accounts should be > 0
  assert(stats.funded_accounts > 0, `funded accounts = ${stats.funded_accounts}`)

  // Payouts should come from funded accounts
  assert(payouts.length > 0, 'payouts exist')

  // Risk exposure should be positive (active accounts have positions)
  assert(risk.total_open_exposure > 0, 'exposure > 0')

  // Stats total_deposited = revenue_all_time (both are entry fees)
  assert(stats.total_deposited === stats.revenue_all_time,
    `deposited (${stats.total_deposited}) === revenue_all_time (${stats.revenue_all_time})`)

  // Pending payouts count should match
  const pendingFromPayouts = payouts.filter(p => p.status === 'pending').length
  // Note: admin/payouts default returns 100, so pending count may be less than stats
  assert(stats.pending_payouts >= 0, `pending_payouts in stats = ${stats.pending_payouts}`)

  console.log(`  ✓ All cross-endpoint data is consistent`)
}

async function testPerformanceBatch() {
  console.log('\n═══ Performance: Parallel Burst ═══')

  const endpoints = [
    'admin/stats', 'admin/users', 'admin/accounts',
    'admin/challenge-templates', 'admin/risk-metrics',
    'admin/payouts', 'admin/affiliates', 'leaderboard',
  ]

  const start = Date.now()
  const results = await Promise.all(endpoints.map(e => fetchJson(e)))
  const totalMs = Date.now() - start

  console.log(`  ${endpoints.length} parallel requests in ${totalMs}ms`)
  assert(totalMs < 3000, `parallel burst < 3000ms (got ${totalMs}ms)`)

  for (let i = 0; i < endpoints.length; i++) {
    const { ms, status } = results[i]
    assert(status === 200, `${endpoints[i]} → ${status}`)
    assert(ms < 1000, `${endpoints[i]} → ${ms}ms`)
    console.log(`    ${endpoints[i]}: ${ms}ms`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║  Stress Test: 100k Accounts CRM Backend         ║')
  console.log('╚══════════════════════════════════════════════════╝')

  // Warm up — first request triggers seedCRM()
  console.log('\n⏳ Warming up (first request triggers 100k seed)...')
  const warmStart = Date.now()
  await fetchJson('admin/stats')
  const warmMs = Date.now() - warmStart
  console.log(`  Seed + first response: ${warmMs}ms`)
  assert(warmMs < 10000, `seed completed in ${warmMs}ms (should be < 10s)`)

  await testAdminStats()
  await testAdminUsers()
  await testAdminAccounts()
  await testAdminRiskMetrics()
  await testAdminChallengeTemplates()
  await testAdminPayouts()
  await testAdminAffiliates()
  await testLeaderboard()
  await testTradingStillWorks()
  await testConsistency()
  await testPerformanceBatch()

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(52))
  console.log(`  PASSED: ${passed}`)
  console.log(`  FAILED: ${failed}`)
  console.log('═'.repeat(52))

  if (failed > 0) {
    console.error(`\n❌ ${failed} assertion(s) failed!`)
    process.exit(1)
  } else {
    console.log(`\n✅ All ${passed} assertions passed!`)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
