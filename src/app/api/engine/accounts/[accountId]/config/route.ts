import { NextResponse } from 'next/server'

// GET /api/engine/accounts/:accountId/config
// Returns the trading rules/limits configured for this account
// Used by the Overview page to render Trading Objectives section
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params

  // TODO: Fetch real account config from DB
  void accountId

  return NextResponse.json({
    account_id: accountId,
    rules: {
      daily_loss_limit: {
        enabled: true,
        type: 'percentage', // 'percentage' | 'absolute'
        value: 5, // 5% of account size
        current_loss: 0,
        resets_at: '00:00 UTC',
        breached: false,
      },
      max_drawdown: {
        enabled: true,
        type: 'static', // 'static' | 'trailing'
        value: 10, // 10% of initial balance
        current_drawdown: 0,
        breached: false,
      },
      profit_target: {
        enabled: false,
        value: null,
      },
      min_trading_days: {
        enabled: false,
        value: null,
        days_traded: 0,
      },
      max_position_size: {
        enabled: false,
        value: null,
      },
    },
    profit_share: 90, // 90% profit split to trader
    phase: 'funded',
  })
}
