import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// GET /api/engine/positions?account_id=xxx&limit=20&offset=0
// Returns closed/historical positions for an account
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  // TODO: Fetch real closed positions from trading engine / DB
  void accountId

  return NextResponse.json({
    results: [
      {
        id: 'pos_001',
        account_id: accountId,
        symbol: 'BTC-USD',
        side: 'buy',
        size: 0.5,
        entry_price: 95000,
        exit_price: 102000,
        pnl: 3500,
        pnl_pct: 7.37,
        opened_at: '2026-01-06T10:00:00Z',
        closed_at: '2026-01-07T14:30:00Z',
        status: 'closed',
      },
    ],
    count: 1,
    limit,
    offset,
  })
}
