import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// GET /api/engine/trading-data?account_id=xxx&instruments_limit=50
// Returns a comprehensive snapshot of account trading state:
// open positions, unrealized P&L, account health, exposure per instrument
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')

  // TODO: Fetch real-time data from trading engine
  void accountId

  return NextResponse.json({
    account_id: accountId,
    balance: 200019.91,
    equity: 200019.91,
    unrealized_pnl: 0,
    margin_used: 0,
    free_margin: 200019.91,
    margin_level: null, // null = infinite (no open positions)
    open_positions: [],
    open_positions_count: 0,
    exposure_by_instrument: [],
    daily_pnl: 0,
    daily_pnl_pct: 0,
    updated_at: new Date().toISOString(),
  })
}
