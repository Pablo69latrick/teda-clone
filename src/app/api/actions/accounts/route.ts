import { NextResponse } from 'next/server'

// GET /api/actions/accounts
// Returns all trading accounts linked to the authenticated user
// Used globally on every dashboard page to populate the account switcher
export async function GET() {
  return NextResponse.json([
    {
      id: 'f2538dee-cfb0-422a-bf7b-c6b247145b3a',
      name: 'Jules Capital',
      type: 'prop', // 'prop' | 'challenge' | 'funded'
      size: 200000,
      balance: 200019.91,
      currency: 'USD',
      status: 'active',
      phase: 'funded', // 'phase1' | 'phase2' | 'funded'
      created_at: '2026-01-06T00:00:00Z',
    },
  ])
}
