import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// GET /api/engine/accounts/:accountId/performance?period=1m
// Returns time-series performance data for charting (balance history, equity curve)
// period: '1w' | '1m' | '3m' | '6m' | '1y' | 'all'
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || '1m'

  // TODO: Fetch real performance time-series from DB
  void accountId
  void period

  return NextResponse.json({
    account_id: accountId,
    period,
    data: [], // [{ date: '2026-01-06', balance: 200000, equity: 200000, pnl: 0 }]
    summary: {
      start_balance: 200000,
      end_balance: 200019.91,
      total_pnl: 19.91,
      total_pnl_pct: 0.01,
      max_drawdown: 0,
      max_drawdown_pct: 0,
    },
  })
}
