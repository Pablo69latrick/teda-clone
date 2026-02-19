import { NextResponse } from 'next/server'

// GET /api/engine/accounts/:accountId/payouts/eligibility
// Returns whether the account is eligible to request a payout
// Checks: min trading days, min profit, no active challenge, no rule breaches
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params

  // TODO: Check real eligibility conditions from DB + account config
  void accountId

  return NextResponse.json({
    account_id: accountId,
    eligible: true,
    reasons: [], // if not eligible, list of reasons
    conditions: {
      min_trading_days_met: true,
      min_profit_met: true,
      no_rule_breach: true,
      no_pending_payout: true,
    },
    max_payout_amount: 18017.91, // 90% of profit
    profit_share_pct: 90,
  })
}
