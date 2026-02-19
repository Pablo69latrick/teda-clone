import { NextResponse } from 'next/server'

// GET /api/affiliate/dashboard
// Returns the affiliate program stats for the current user:
// referral link, commissions earned, referred users, conversion rate
export async function GET() {
  // TODO: Fetch real affiliate data from DB
  return NextResponse.json({
    referral_code: 'TEDA_REF_PLACEHOLDER',
    referral_link: 'https://teda.com/register?ref=TEDA_REF_PLACEHOLDER',
    stats: {
      total_referred: 0,
      total_commissions_usd: 0,
      pending_commissions_usd: 0,
      paid_commissions_usd: 0,
      conversion_rate: 0,
    },
    referred_users: [],
    commission_history: [],
    commission_rate: 0.10, // 10% of referred user's purchase
  })
}
