import { NextResponse } from 'next/server'

// GET /api/leaderboard
// Returns the global leaderboard of top traders (by % return or $ profit)
export async function GET() {
  // TODO: Fetch real leaderboard from DB (aggregated from all funded accounts)
  return NextResponse.json({
    results: [
      {
        rank: 1,
        user_id: 'user_ayman',
        display_name: 'Ayman Test',
        avatar: null,
        country: 'MA',
        return_pct: 1.68,
        profit_usd: 3366.05,
        badge: 'gold',
      },
      {
        rank: 2,
        user_id: 'user_jean',
        display_name: 'Jean-François Verhaeghe',
        avatar: null,
        country: 'BE',
        return_pct: 0.95,
        profit_usd: 1905.41,
        badge: 'silver',
      },
      {
        rank: 3,
        user_id: 'user_luca',
        display_name: 'Luca Gosmane',
        avatar: null,
        country: 'IT',
        return_pct: 0,
        profit_usd: 0,
        badge: 'bronze',
      },
    ],
    total: 3,
    period: 'monthly',
  })
}
