import { NextResponse } from 'next/server'

// GET /api/engine/accounts/:accountId/analytics
// Returns full analytics for an account:
// performance score, radar chart data (Consistency, IQ, Win%, R/R), streaks, balance history
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params

  // TODO: Compute real analytics from trade history in DB
  void accountId

  return NextResponse.json({
    account_id: accountId,
    performance_score: 77, // composite 0-100
    radar: {
      consistency: 62,
      iq_usage: 67,
      win_rate: 100,
      risk_reward: 80,
    },
    tips: [
      'Elite win rate! Consider slightly larger position sizes',
      'Excellent trade management — your winners are outpacing losers',
    ],
    stats: {
      average_win: 20.403,
      average_loss: 0,
      win_rate: 100,
      profit_factor: null, // null = infinite
      total_trades: 1,
      best_trade: 20.403,
      worst_trade: 0,
    },
    streaks: {
      current_win_streak: 1,
      best_win_streak: 1,
      worst_loss_streak: 0,
      activity_trades_per_day: 1.0,
    },
    account_info: {
      size: 200000,
      initial_capital: 200000,
      current_balance: 200019.91,
      start_date: '2026-01-06',
      currency: 'USD',
    },
    balance_history: [], // [{date, balance, equity}]
  })
}
