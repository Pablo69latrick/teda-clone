import { NextResponse } from 'next/server'

// GET /api/leaderboard/my-rank
// Returns the authenticated user's rank on the leaderboard
export async function GET() {
  // TODO: Fetch the current user's rank from DB
  return NextResponse.json({
    rank: null, // null if not ranked yet
    return_pct: 0.01,
    profit_usd: 19.91,
    total_participants: 3,
  })
}
